'use client';

/**
 * Analytics · TAG INITIALIZATION ONLY
 *
 * Loads: Google Consent Mode V2 → GTM → GA4 (direct) → Google Ads global site tag
 *
 * GTM  : GTM-5LMDG3F7
 * GA4  : G-7V452FMYFY
 * Ads  : AW-7693225904 (lead-form conversion container; comment on AW-8479028400 below)
 *
 * Conversion events are pushed to window.dataLayer from lib/tracking.ts.
 * GTM listens for those events and fires GA4 event tags + Ads conversion tags.
 */

import React from 'react';
import Script from 'next/script';
import { captureClickIds } from '@/lib/tracking';

const GTM_ID         = process.env.NEXT_PUBLIC_GTM_ID         || 'GTM-5LMDG3F7';
const GA4_ID         = process.env.NEXT_PUBLIC_GA4_ID         || 'G-7V452FMYFY';
const GADS_ID        = process.env.NEXT_PUBLIC_GADS_ID        || 'AW-7693225904';
const GADS_CONV_ID   = process.env.NEXT_PUBLIC_GADS_CONV_ID   || 'AW-7693225904';
// Dedicated conversion action for low-value phone/WhatsApp taps. Must be a real
// conversion action ID in Google Ads. Deliberately null when unset · do NOT fall
// back to the lead-form ID, else taps get mislabelled as full lead-form conversions.
const GADS_CLICK_CONV_ID = process.env.NEXT_PUBLIC_GADS_CLICK_CONV_ID || null;

/**
 * Distinct Google Ads ACCOUNT ids to initialise, derived from the configured
 * conversion targets. Declared after GADS_CLICK_CONV_ID — it reads all three.
 *
 * `gtag('config', ...)` takes an account id (`AW-7693225904`) or a measurement
 * id (`G-XXXX`) — NOT a labelled conversion target. Passing the full
 * `AW-7693225904/abc123` value to `config` is invalid: the label belongs only in
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
  // Capture gclid/gbraid/wbraid from the landing URL into localStorage so
  // form submissions can attach it for Google Ads offline conversions.
  React.useEffect(() => {
    captureClickIds();
  }, []);

  return (
    <>
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
