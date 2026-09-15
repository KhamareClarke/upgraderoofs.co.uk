/**
 * lib/contact.ts
 *
 * Single source of truth for the business's clickable contact channels.
 *
 * Centralized so that:
 *  - Google's call-tracking number swap (forwarding number) has a consistent
 *    tel: target to find and replace on ad traffic.
 *  - GHL number routing only needs one place updated if the tracking number
 *    changes.
 *  - Every tracked phone/WhatsApp link uses the same href format.
 *
 * Displayed number vs. dial link differ in format:
 *  - PHONE_DISPLAY  human-readable, shown on screen
 *  - PHONE_TEL      E.164-ish digits-only for the tel: href
 *  - WHATSAPP_WA    digits-only international for the wa.me href
 */

export const PHONE_DISPLAY = '01270 897 606';
export const PHONE_TEL = 'tel:01270897606';

export const WHATSAPP_DISPLAY = 'WhatsApp';
export const WHATSAPP_NUMBER = '447379440583';
export const WHATSAPP_WA = `https://wa.me/${WHATSAPP_NUMBER}`;

/** Google Business Profile review-write URL (opens the "leave a review" prompt). */
export const GOOGLE_REVIEW_URL =
  'https://www.google.com/maps/place/Upgrade+Roofs?hl=en-GB';

/**
 * Canonical Google Business Profile location id — the single owner of this
 * value. Import it anywhere the location is referenced (API routes, structured
 * data, scripts) instead of retyping the literal.
 *
 * Used to address the profile as `locations/<GBP_LOCATION_ID>` against the
 * Business Information, Account Management and Performance APIs.
 *
 * VERIFIED 2026-09-15 against the live APIs. This id returns HTTP 200 with
 * title "Upgrade Roofs", primaryPhone "01270 897606" (matching PHONE_DISPLAY
 * above), placeId ChIJMUVUfoBZekgRrNga9buOK88 and hasVoiceOfMerchant: true.
 * It belongs to accounts/108488463348570125274 ("Khamare Clarke").
 *
 * WARNING — an earlier audit pass concluded the opposite and "corrected" this
 * repo the wrong way. The bad id it promoted is still live in several scripts
 * and was written into app/structured-data.tsx:
 *   - 17098906572808840     (17 digits — this id DELETED from the real one; 404s)
 *   - 170989065056880840    (stray "0" inserted; 404s)
 * Both are one edit away from the real value, so they look plausible. Do not
 * "fix" this constant toward them. Verify with scripts/probe-gbp-auth.js
 * before changing it: a wrong id returns 404, which is indistinguishable from
 * the service account lacking a Manager grant.
 *
 * NOTE: deliberately a plain constant with no env read. This module is imported
 * by client components, where `process.env.GBP_LOCATION_ID` would be undefined
 * (only NEXT_PUBLIC_* vars reach the browser). Callers that want an override —
 * standalone scripts — read `process.env.GBP_LOCATION_ID` themselves and fall
 * back to this constant.
 */
export const GBP_LOCATION_ID = '17098915606572808840';
