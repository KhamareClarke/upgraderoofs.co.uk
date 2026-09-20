'use client';

/**
 * Analytics · TAG INITIALIZATION ONLY
 *
 * Loads: Google Consent Mode V2 → GTM → GA4 (direct) → Google Ads global site tag
 *
 * GTM  : GTM-5LMDG3F7
 * GA4  : G-7V452FMYFY
 * Ads  : AW-17763560213 (conversion id / gtag container for this account)
 *
 * Conversion events are pushed to window.dataLayer from lib/tracking.ts.
 * GTM listens for those events and fires GA4 event tags + Ads conversion tags.
 */

import React from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { captureClickIds } from '@/lib/tracking';
import { PHONE_DISPLAY } from '@/lib/contact';
import { resetTrackedPhone, setTrackedPhone, toTelHref } from '@/lib/phone-number';

const GTM_ID         = process.env.NEXT_PUBLIC_GTM_ID         || 'GTM-5LMDG3F7';
const GA4_ID         = process.env.NEXT_PUBLIC_GA4_ID         || 'G-7V452FMYFY';
const GADS_ID        = process.env.NEXT_PUBLIC_GADS_ID        || 'AW-17763560213';
const GADS_CONV_ID   = process.env.NEXT_PUBLIC_GADS_CONV_ID   || 'AW-17763560213';
// Dedicated conversion action for low-value phone/WhatsApp taps. Must be a real
// conversion action ID in Google Ads. Deliberately null when unset · do NOT fall
// back to the lead-form ID, else taps get mislabelled as full lead-form conversions.
const GADS_CLICK_CONV_ID = process.env.NEXT_PUBLIC_GADS_CLICK_CONV_ID || null;

/**
 * Website call conversions — the action a completed phone CALL reports to, as
 * opposed to GADS_CLICK_CONV_ID above, which reports that someone pressed
 * dial. Unset by default: the whole feature is inert until this holds a real
 * label, so the code can ship before the Ads account is configured.
 *
 * ── TRAP: this one MUST keep its label ──────────────────────────────────────
 *
 * GADS_ACCOUNT_IDS below exists to strip the `/label` half, because a labelled
 * target is invalid for an ordinary `gtag('config')`. That rule is correct for
 * the account-level configs — but it is exactly WRONG here. For a website call
 * conversion the label is the thing that says which conversion action the call
 * belongs to, and the labelled `AW-XXXXXXXXX/YYYYYYY` form is what Google
 * documents for this call. Strip the label and calls report to nothing, while
 * every other signal on the page still looks perfectly healthy.
 *
 * So this value is deliberately kept OUT of the GADS_ACCOUNT_IDS array.
 */
const GADS_CALL_CONV_ID = process.env.NEXT_PUBLIC_GADS_CALL_CONV_ID || null;

/**
 * Whether GADS_CALL_CONV_ID is both well-formed AND belongs to the account
 * whose tag this page loads.
 *
 * The account half is the part that matters. `GADS_ID` is the `AW-` id the
 * Google tag is loaded for; a conversion label minted under a DIFFERENT Ads
 * account would configure cleanly, send nothing, and look healthy — the call
 * reports into an account this page never talks to. That is a silent no-op, and
 * `scripts/setup-website-call-conversions.js` prints a label from whichever
 * account it runs against, so a paste from the wrong one is a realistic
 * mistake rather than a hypothetical.
 *
 * Follows the same fail-closed policy as isCompleteConversionTarget() in
 * lib/tracking.ts: refuse and say why, rather than fire something that cannot
 * be credited.
 */
function isUsableCallConversionTarget(value: string | null): value is string {
  if (!value) return false;
  const match = /^(AW-\d+)\/[\w-]+$/.exec(value.trim());
  return match !== null && match[1] === GADS_ID;
}

/**
 * Distinct Google Ads ACCOUNT ids to initialise, derived from the configured
 * conversion targets. Declared after GADS_CLICK_CONV_ID — it reads all three.
 *
 * `gtag('config', ...)` takes an account id (`AW-17763560213`) or a measurement
 * id (`G-XXXX`) — NOT a labelled conversion target. Passing the full
 * `AW-17763560213/eU-fCJyQkPkcEJXWqZZC` value to `config` is invalid: the label belongs only in
 * the `send_to` of a conversion *event*, which lib/tracking.ts already sends.
 *
 * The old code ran `gtag('config', GADS_CONV_ID)` with the whole target. That
 * looked harmless only because the fallback was a bare account id, so it merely
 * configured the same account twice. As soon as NEXT_PUBLIC_GADS_CONV_ID holds a
 * real `AW-.../label` value — which is exactly what it must hold for conversions
 * to register at all — that line would have fed gtag a malformed id.
 */
const GADS_ACCOUNT_IDS = Array.from(
  new Set(
    [GADS_ID, GADS_CONV_ID, GADS_CLICK_CONV_ID]
      .filter((value): value is string => Boolean(value))
      // Keep only the account half; drop everything from the "/" onward.
      .map((value) => value.split('/')[0].trim())
      .filter((value) => /^AW-\d+$/.test(value)),
  ),
);

export function Analytics() {
  const pathname = usePathname();

  // The private dashboard is not site traffic. Left alone, every refresh Marcus
  // makes would land in GA4 and in the Ads account as a page view — inflating
  // the numbers he is looking at, from the one browser guaranteed to open it
  // daily. Skipping the tags entirely (rather than filtering later) also means
  // no gtag request leaves his phone from this page at all.
  //
  // Hoisted to a variable because the effects below run BEFORE the early return
  // — a hook cannot be skipped conditionally. Anything that fires a beacon has
  // to check this itself; the return only stops the Script tags rendering.
  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  // Capture gclid/gbraid/wbraid from the landing URL into localStorage so
  // form submissions can attach it for Google Ads offline conversions.
  React.useEffect(() => {
    captureClickIds();
  }, []);

  // ── Google Ads website call conversions ─────────────────────────────────
  //
  // Turns "someone tapped the call button" into "someone actually phoned and we
  // know whether it was answered and how long it lasted". On a visit from an ad
  // click Google hands us a forwarding number; the call goes to Google first,
  // which records ring/answer/duration and then connects the caller to the real
  // line.
  //
  // `phone_conversion_callback` is the whole reason this is implementable on a
  // React site: Google gives US the number and we render it through
  // lib/phone-number. The alternative parameter, `phone_conversion_css_class`,
  // rewrites matched elements' text directly — which React reverts on its next
  // render, so the number would flicker back to the real one.
  //
  // Three properties are deliberate:
  //
  //  · The LABELLED target is required (see GADS_CALL_CONV_ID above).
  //  · `cache: false` so a forwarding number Google has cached in a cookie is
  //    never shown to a later organic visitor. Keeping the real number for
  //    non-ad traffic is an explicit requirement, not a nicety.
  //  · `timeout: 1000` bounds how long the real number can be on screen before
  //    the swap. Google's DEFAULT is 5000ms, and the consent block above sets
  //    `wait_for_update: 500`, so an unset timeout means the real number can
  //    paint for five and a half seconds on ad traffic — long enough for a
  //    caller to dial it and lose the attribution this whole feature exists to
  //    capture. One second is comfortably longer than a normal response and
  //    short enough that the real number is still the one they see.
  //  · `phone_conversion_number` must match the number on the page EXACTLY,
  //    punctuation included — a mismatch is the usual cause of this feature
  //    silently doing nothing.
  //
  // ── Do NOT also configure this in GTM ───────────────────────────────────
  //
  // Only ONE tracked number per page is supported. GTM-5LMDG3F7 is loaded above
  // and can also host a "Google Ads call conversion" config, which would give
  // the page two competing configurations of the same feature — and, because
  // that one is invisible from this file, the symptom would be a number that
  // swaps inconsistently rather than an error anyone can read. Leave the call
  // conversion configured here and only here.
  //
  // This runs in an effect, never during render, and that is load-bearing:
  // lib/phone-number may only be written after hydration or React reports a
  // hydration mismatch on every page. See the header there.
  React.useEffect(() => {
    if (isDashboard) {
      // Put the real number back. This component does NOT unmount on a
      // client-side navigation, so a visitor who landed on an ad, got swapped,
      // and then soft-navigated to the dashboard would otherwise see a
      // forwarding number on the one page that must not carry one. The store is
      // module-level, so nothing else would ever clear it.
      resetTrackedPhone();
      return;
    }
    // Ships dark. Unset means the whole feature is inert and the site behaves
    // exactly as it does today, so this can deploy before the Ads account work
    // is done. A value that is set but WRONG is the dangerous case — see below.
    if (!GADS_CALL_CONV_ID) return;
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    if (!isUsableCallConversionTarget(GADS_CALL_CONV_ID)) {
      // Loud on purpose: the failure mode is silence. A target belonging to
      // another account, or a bare account id with no label, configures without
      // error and records nothing — so without this line the only symptom is
      // call conversions that never appear, which is indistinguishable from
      // "no one has phoned yet".
      console.warn(
        `[analytics] NEXT_PUBLIC_GADS_CALL_CONV_ID is not a usable call-conversion target: ` +
          `expected "AW-<id>/<label>" under ${GADS_ID}. Call conversions are DISABLED ` +
          `until it is fixed. See scripts/setup-website-call-conversions.js.`,
      );
      return;
    }

    window.gtag('config', GADS_CALL_CONV_ID, {
      phone_conversion_number: PHONE_DISPLAY,
      phone_conversion_callback: (formattedNumber: string, mobileNumber: string) => {
        // toTelHref rather than `tel:${mobileNumber}` — Google documents this
        // argument as the plain form but its own sample passes E.164, so
        // interpolating blindly can yield a non-dialable href on exactly the
        // paid traffic this feature exists to measure.
        setTrackedPhone(formattedNumber, toTelHref(mobileNumber));
      },
      phone_conversion_options: { cache: false, timeout: 1000 },
    });
  }, [isDashboard]);

  // Returning null is safe here: nothing below depends on these Script tags
  // having rendered, and every other route is unaffected.
  if (isDashboard) return null;

  return (
    <>
      {/* ── 0. Google Tag Manager (noscript) ──────────────────────────────
          Lives here rather than in app/layout.tsx so it inherits the dashboard
          opt-out above. It is not inert: the iframe is its own document with
          scripting enabled, so even when the parent page has JS disabled it
          loads GTM and fires a page view. Left in the layout, a JS-disabled
          visit to the dashboard would still report itself as site traffic —
          the exact thing every other tag here is skipped to avoid. */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>

      {/* ── 1. Google Consent Mode V2 ─────────────────────────────────────
          Must fire synchronously BEFORE any tags to comply with EU/UK consent
          requirements. All ad/analytics storage defaults to denied until a
          consent signal is received (e.g. via a cookie banner updating consent). */}
      <Script id="google-consent-mode" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}

          gtag('consent', 'default', {
            'ad_storage':             'denied',
            'ad_user_data':           'denied',
            'ad_personalization':     'denied',
            'analytics_storage':      'denied',
            'functionality_storage':  'granted',
            'personalization_storage':'denied',
            'security_storage':       'granted',
            'wait_for_update':        500
          });

          gtag('set', 'url_passthrough',   true);
          gtag('set', 'ads_data_redaction', true);
        `}
      </Script>

      {/* ── 2. Google Tag Manager ─────────────────────────────────────────
          Primary container. All GA4 event tags and Ads conversion tags should
          be configured inside GTM and fired from dataLayer events. */}
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>

      {/* ── 3. GA4 direct config tag ─────────────────────────────────────
          Belt-and-braces: fires GA4 page_view even if GTM is blocked or
          misconfigured. GTM's GA4 tags will deduplicate automatically. */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA4_ID}', {
            page_path: window.location.pathname,
            send_page_view: true,
            transport_url: 'https://www.google-analytics.com',
            first_party_collection: true
          });
        `}
      </Script>

      {/* ── 4. Google Ads global site tag ────────────────────────────────
          Initialises each distinct Ads ACCOUNT once. The conversion labels live
          in the `send_to` of the conversion events fired from lib/tracking.ts —
          they must not appear here. See GADS_ACCOUNT_IDS above. */}
      <Script id="google-ads-config" strategy="afterInteractive">
        {`${GADS_ACCOUNT_IDS.map((id) => `gtag('config', '${id}');`).join('\n          ')}
          ${
            GADS_CLICK_CONV_ID
              ? '// phone/WhatsApp tap conversions enabled (lib/tracking.ts)'
              : '// no dedicated click-conversion ID configured · tap conversions disabled'
          }`}
      </Script>
    </>
  );
}
