/**
 * ---------------------------------------------------------------
 * CENTRALIZED EVENT TRACKING (GTM dataLayer)
 *
 * Single source of truth for all conversion and engagement events.
 * This file's responsibility is to push well-structured events and
 * data into the `window.dataLayer`.
 *
 * It is assumed that Google Tag Manager (GTM) is configured to listen
 * for these custom events and fire the appropriate marketing tags
 * (GA4, Google Ads, Meta Pixel, etc.).
 *
 * Event names (pushed to dataLayer):
 *   - quote_request        → successful quote form submission
 *   - contact_form_submit  → successful contact form submission
 *   - phone_click          → any tel: link click
 *   - whatsapp_click       → any WhatsApp link/button click
 * ---------------------------------------------------------------
 */

// --------------- type declarations ---------------

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Google Ads lead-form conversion target. Must be a COMPLETE target —
// `AW-XXXXXXXXX/YYYYYYYYYY` (account id + conversion-action label). See
// isCompleteConversionTarget() below for why the label half is mandatory.
// The fallback is a bare ACCOUNT id on purpose, not a labelled target: it keeps
// isCompleteConversionTarget() below failing, so a missing env var produces a
// loud warning and no conversion, instead of a hardcoded label silently firing
// at whatever action it once named.
const GADS_CONV_ID = process.env.NEXT_PUBLIC_GADS_CONV_ID || 'AW-17763560213';

// Separate conversion action for low-value engagement clicks (phone/WhatsApp
// taps) so they don't pollute the lead-form conversion data. Create the action
// in Google Ads (Tools → Conversions → "Phone/WhatsApp click") and set its ID
// here / via env.
// IMPORTANT: we deliberately do NOT fall back to GADS_CONV_ID. If a dedicated
// click-conversion ID is not configured, telephone/WhatsApp taps send nothing
// to Google Ads rather than mislabelling a £5 tap as a full lead-form (£50/£25)
// conversion, which previously polluted bid-optimisation signals.
const GADS_CLICK_CONV_ID = process.env.NEXT_PUBLIC_GADS_CLICK_CONV_ID || null;

// GA4 measurement id. Mirrors components/Analytics.tsx, which reads
// NEXT_PUBLIC_GA4_ID. (.env.example still documents this as NEXT_PUBLIC_GA_ID —
// nothing reads that name, so setting it has no effect.)
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-7V452FMYFY';

/**
 * Whether custom events are sent straight to GA4 via gtag, in ADDITION to the
 * dataLayer push. Set NEXT_PUBLIC_GA4_DIRECT_EVENTS=false to disable.
 *
 * WHY THIS EXISTS
 * ---------------
 * This module historically only pushed to `window.dataLayer` and relied on GTM
 * triggers to forward those events to GA4. Those triggers were never built, so
 * every event below (phone_click, whatsapp_click, email_click, quote_request,
 * contact_form_submit) reached the dataLayer and then stopped. GA4 recorded none
 * of them while the Google Ads gtag calls in this file kept working — so the
 * setup looked healthy in Ads and showed nothing in GA4.
 *
 * Analytics.tsx already loads gtag.js and runs `gtag('config', GA4_ID)`, so
 * `window.gtag` routes into GA4 with or without GTM. This makes the events
 * observable now instead of blocked on container configuration.
 *
 * DOUBLE-COUNT WARNING: if GTM triggers for these event names are created later,
 * each event is counted twice — once here, once by GTM. Either leave those
 * triggers unbuilt, or set NEXT_PUBLIC_GA4_DIRECT_EVENTS=false to hand delivery
 * back to GTM. Consent Mode still applies either way: with analytics_storage
 * denied, gtag routes through the consent layer exactly as GTM would.
 */
const GA4_DIRECT_EVENTS = process.env.NEXT_PUBLIC_GA4_DIRECT_EVENTS !== 'false';

/**
 * True only for a complete Google Ads conversion target: `AW-XXXXXXXXX/YYYYY`.
 *
 * A bare account id (`AW-17763560213`, with no `/label`) is NOT a valid
 * `send_to`. Google Ads rejects it, so firing with one yields zero conversions
 * while every log line still claims a conversion was sent. The account id alone
 * identifies the account; the label identifies WHICH conversion action to
 * credit, and is the half that is actually required.
 */
function isCompleteConversionTarget(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^AW-\d+\/[\w-]+$/.test(value.trim());
}

// --------------- click-id capture (Google Ads offline conversions) ---------------

const GCLID_STORAGE_KEY = 'ur_gclid';
const GCLID_TS_KEY = 'ur_gclid_ts';
// First-party cookie name for the same gclid. A cookie survives redirects and
// private/cleared localStorage far better than localStorage alone, so it is
// the authoritative store; localStorage is kept as a secondary read fallback.
const GCLID_COOKIE_KEY = 'ur_gclid';
const GCLID_COOKIE_MAX_AGE = String(90 * 24 * 60 * 60); // 90 days, in seconds
// Google Ads click ids are valid for offline-conversion upload for 90 days.
const GCLID_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Capture the `gclid` from the landing URL into localStorage on first touch.
 * Call once on app mount. Subsequent form submissions read it back via
 * getGclid() so the click that drove the lead can be credited when the deal
 * closes offline.
 *
 * IMPORTANT: only a genuine `gclid` is stored here. `gbraid`/`wbraid` are
 * separate iOS/PMax click ids with a different format and cannot be uploaded
 * to offline-conversion uploads as a gclid — doing so produces the
 * "Unparseable gclid" error Google reported (100% of conversions failing).
 * They are deliberately ignored.
 */
export function captureClickIds() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get('gclid');
    if (gclid) {
      window.localStorage.setItem(GCLID_STORAGE_KEY, gclid);
      window.localStorage.setItem(GCLID_TS_KEY, String(Date.now()));
      // First-party cookie — raw, unaltered gclid, 90-day Max-Age. Path=/ so
      // it is sent on every subpage; no transformation (preserves case + base64
      // characters exactly). document.cookie never throws, but keep it inside
      // the same try/catch scope for symmetry.
      document.cookie =
        GCLID_COOKIE_KEY + '=' + encodeURIComponent(gclid) +
        '; path=/; max-age=' + GCLID_COOKIE_MAX_AGE +
        '; samesite=lax';
    }
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** Read the raw gclid back out of the first-party cookie, if present. */
function getGclidFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(GCLID_COOKIE_KEY + '='));
    if (!match) return null;
    return decodeURIComponent(match.slice(GCLID_COOKIE_KEY.length + 1));
  } catch {
    return null;
  }
}

export function getGclid(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // Cookie is authoritative (survives redirects); fall back to localStorage.
    const cookieValue = getGclidFromCookie();
    const value = cookieValue || window.localStorage.getItem(GCLID_STORAGE_KEY);
    const ts = Number(window.localStorage.getItem(GCLID_TS_KEY) || 0);
    if (!value) return null;
    if (ts && Date.now() - ts > GCLID_TTL_MS) {
      window.localStorage.removeItem(GCLID_STORAGE_KEY);
      window.localStorage.removeItem(GCLID_TS_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

// --------------- low-level dispatcher ---------------

/**
 * Pushes an event to the `window.dataLayer`.
 * This is the primary function for all tracking events.
 * @param eventName The name of the custom event.
 * @param params Additional data associated with the event.
 */
function sendDataLayerEvent(eventName: string, params: Record<string, any>) {
  if (typeof window === 'undefined' || !window.dataLayer) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[tracking] dataLayer not found for event: ${eventName}`);
    }
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `%c[tracking] Pushing to dataLayer: ${eventName}`,
      'color: #f97316; font-weight: bold;',
      params,
    );
  }

  // Push the event to the dataLayer
  window.dataLayer.push({
    event: eventName,
    ...params,
  });

  // …and forward it to GA4 directly, so the event is recorded even though no
  // GTM trigger consumes the dataLayer event above. See GA4_DIRECT_EVENTS.
  if (GA4_DIRECT_EVENTS) {
    sendGa4Event(eventName, params);
  }
}

/**
 * Forward one custom event to GA4 through gtag.
 *
 * Separate from sendDataLayerEvent so the dataLayer contract (the documented
 * event names GTM would listen for) stays exactly as it was — this only adds a
 * second consumer. Fails silently when gtag.js has not loaded yet (script
 * blocked, offline, or a click landing before hydration); that is a dropped
 * analytics event, never a broken link.
 */
function sendGa4Event(eventName: string, params: Record<string, any>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[tracking] gtag unavailable — GA4 event dropped: ${eventName}`);
    }
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `%c[tracking] → GA4 (${GA4_ID}): ${eventName}`,
      'color: #4285f4; font-weight: bold;',
      params,
    );
  }

  window.gtag('event', eventName, params);
}

/**
 * Fires a Google Ads conversion event directly via gtag.
 * Called after every confirmed form submission so Google Ads
 * registers the lead regardless of GTM tag firing order or
 * consent-mode delays.
 */
function fireGadsConversion(value: number, conversionId: string = GADS_CONV_ID) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  // Refuse to send a malformed target. A bare `AW-17763560213` is the documented
  // fallback in this file and in Analytics.tsx, and Google Ads rejects it — so
  // without this guard every lead-form submission emits a conversion call that
  // can never be credited. Skipping is the honest failure: nothing is recorded,
  // and the warning below says exactly which env var to set. Mirrors the
  // deliberate no-fallback policy already used for GADS_CLICK_CONV_ID above.
  if (!isCompleteConversionTarget(conversionId)) {
    console.warn(
      `[tracking] Google Ads conversion NOT sent — target "${conversionId}" is not a ` +
        `complete AW-XXXXXXXXX/YYYYYYYYYY id. Set NEXT_PUBLIC_GADS_CONV_ID to the full ` +
        `value from Google Ads → Tools → Conversions (account id + "/" + action label). ` +
        `Value ${value} GBP was dropped.`,
    );
    return;
  }

  window.gtag('event', 'conversion', {
    send_to: conversionId,
    value,
    currency: 'GBP',
  });
}

// --------------- public tracking API ---------------

/**
 * Track a successful quote form submission.
 * Call ONLY after the API confirms success.
 */
export function trackQuoteRequest(extra: {
  service_type?: string;
  postcode?: string;
}) {
  sendDataLayerEvent('quote_request', {
    form_name: 'quote_request',
    service_type: extra.service_type,
    postcode: extra.postcode,
    value: 50.0,
    currency: 'GBP',
  });
  fireGadsConversion(50.0);
}

/**
 * Track a successful contact form submission.
 * Call ONLY after the API confirms success.
 */
export function trackContactForm(extra?: {
  subject?: string;
}) {
  sendDataLayerEvent('contact_form_submit', {
    form_name: 'contact_form',
    subject: extra?.subject,
    value: 25.0,
    currency: 'GBP',
  });
  fireGadsConversion(25.0);
}

/**
 * Track a phone link click.
 * Safe to call from onClick — does NOT prevent navigation.
 */
export function trackPhoneClick(placement: string) {
  sendDataLayerEvent('phone_click', {
    contact_method: 'phone',
    placement,
    value: 5.0,
    currency: 'GBP',
  });
  // Only send the engagement tap to Google Ads if a dedicated click-conversion
  // action is configured; otherwise skip the gtag event so we don't miscount a
  // tap as a lead-form conversion.
  if (GADS_CLICK_CONV_ID) fireGadsConversion(5.0, GADS_CLICK_CONV_ID);
}

/**
 * Track a WhatsApp link/button click.
 * Safe to call from onClick — does NOT prevent navigation.
 */
export function trackWhatsAppClick(placement: string) {
  sendDataLayerEvent('whatsapp_click', {
    contact_method: 'whatsapp',
    placement,
    value: 5.0,
    currency: 'GBP',
  });
  // Only send the engagement tap to Google Ads if a dedicated click-conversion
  // action is configured; otherwise skip the gtag event so we don't miscount a
  // tap as a lead-form conversion.
  if (GADS_CLICK_CONV_ID) fireGadsConversion(5.0, GADS_CLICK_CONV_ID);
}

/**
 * Track an email link click.
 * Safe to call from onClick — does NOT prevent navigation.
 */
export function trackEmailClick(placement: string) {
  sendDataLayerEvent('email_click', {
    contact_method: 'email',
    placement,
    value: 3.0,
    currency: 'GBP',
  });
}

/**
 * Track when the quote request modal is opened.
 * Fires on dialog open — useful as a funnel entry signal in GTM.
 */
export function trackQuoteFormOpen() {
  sendDataLayerEvent('quote_form_open', {
    form_name: 'quote_request',
  });
}

// --------------- unified conversion facade ---------------

/**
 * The semantic touchpoint types this facade accepts. These map to the
 * underlying, already-configured dataLayer events — the string here is a
 * human-meaningful alias, NOT the raw dataLayer event name. See
 * `dedicatedEventNames` below for the actual `event` values pushed.
 */
export type ConversionType =
  | 'click_to_call'
  | 'click_to_email'
  | 'click_to_whatsapp'
  | 'quote_request'
  | 'contact_form_submit';

export interface ConversionPayload {
  /** Optional placement/context label (e.g. "footer_landline"). */
  placement?: string;
  /** Optional service type (used by quote_request). */
  service_type?: string;
  /** Optional postcode (used by quote_request). */
  postcode?: string;
  /** Optional contact-form subject. */
  subject?: string;
}

/**
 * Unified entry-point for conversion tracking. Maps a human-readable touchpoint
 * type to the appropriate underlying tracker, firing BOTH the GA4/GTM dataLayer
 * event AND (where the type represents a billable signal) the Google Ads
 * conversion via gtag.
 *
 *   trackConversion('click_to_call', { placement: 'footer_landline' });
 *   trackConversion('quote_request', { service_type: 'New Roof' });
 *
 * The dataLayer event names emitted by each type are unchanged from the legacy
 * per-function trackers (phone_click / whatsapp_click / email_click /
 * quote_request / contact_form_submit), so GTM/GA4 tags already configured to
 * listen for those names continue to work with zero reconfiguration.
 */
export function trackConversion(
  type: ConversionType,
  payload: ConversionPayload = {},
) {
  switch (type) {
    case 'click_to_call':
      trackPhoneClick(payload.placement || 'unified');
      break;
    case 'click_to_email':
      trackEmailClick(payload.placement || 'unified');
      break;
    case 'click_to_whatsapp':
      trackWhatsAppClick(payload.placement || 'unified');
      break;
    case 'quote_request':
      trackQuoteRequest({
        service_type: payload.service_type,
        postcode: payload.postcode,
      });
      break;
    case 'contact_form_submit':
      trackContactForm({ subject: payload.subject });
      break;
  }
}
