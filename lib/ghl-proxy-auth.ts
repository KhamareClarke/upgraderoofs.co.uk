import { NextRequest, NextResponse } from 'next/server';
import { secretMatches, readProvidedSecret } from '@/lib/shared-secret';

/**
 * lib/ghl-proxy-auth.ts
 *
 * Shared-secret guard for the `/api/ghl/*` proxy routes, which act on the GHL
 * account on the caller's behalf. Extracted into one module because all three
 * routes need byte-identical behaviour, and this codebase has already been
 * bitten twice by guards that drifted or were never exercised.
 *
 * ── What these routes can do with no credential at all ───────────────────────
 *
 *   POST /api/ghl/chat              upsert a CRM contact, open a conversation,
 *                                   and SEND A MESSAGE (SMS when type:'SMS')
 *   POST /api/ghl/book-appointment  upsert a contact and create a REAL calendar
 *                                   appointment on the business's calendar
 *   GET  /api/ghl/calendar-slots    read the location's calendars and free slots
 *
 * An anonymous caller supplies every field of those payloads — name, phone,
 * message body, appointment time. So an open route is not just a data leak: it
 * is an outbound-SMS and calendar-write primitive pointed at the business.
 *
 * ── Why one secret, not three ────────────────────────────────────────────────
 *
 * All three are the same API surface, act on the same GHL location with the
 * same token, and would be consumed by the same caller (a booking/chat widget
 * or an internal tool). Three secrets would triple the rotation and copy-paste
 * surface for no real gain: compromising any one of them already implies access
 * to everything the shared GHL token can reach. This codebase has a documented
 * history of exactly that class of error — a location-scoped GHL token pasted
 * into the wrong slot, which authenticated fine and 403'd everywhere.
 *
 * ── Fail closed ──────────────────────────────────────────────────────────────
 *
 * When GHL_PROXY_SECRET is unset every request is REFUSED. This is the opposite
 * of /api/webhooks/call-tracking (which fails open, because a provider must be
 * able to deliver call events) and matches /api/fleet/diagnose.
 *
 * The reasoning: these routes have NO machine caller. Verified 2026-09-15 —
 * nothing in this repo calls them. The site's forms use /api/send-quote,
 * /api/send-contact and /api/send-special-offer; there is no chat widget in
 * `public/`, no embed, and no reference in docs or scripts. The only way a
 * caller appears is if someone deliberately wires one up, and that person can
 * set the env var. So refusing on an unset var costs nothing today and closes
 * the hole permanently.
 *
 * ⚠ If an EXTERNAL system you own turns out to be calling these routes, it will
 *   now receive 401. Set GHL_PROXY_SECRET in Vercel, redeploy, and give that
 *   system the value. Note the secret must NOT be embedded in browser-side
 *   JavaScript — for a public chat widget, route the call through your own
 *   server instead of shipping the secret to the client.
 *
 * Auth: `x-ghl-secret` header, or `?secret=` query parameter.
 */

/** The env var holding the shared secret for every /api/ghl/* route. */
export const GHL_PROXY_SECRET_ENV = 'GHL_PROXY_SECRET';

/** Header the caller may present the secret in. */
const HEADER_NAME = 'x-ghl-secret';

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized',
      hint: `Send the shared secret as the ${HEADER_NAME} header or the ?secret= query parameter.`,
    },
    { status: 401 },
  );
}

/**
 * Guard a `/api/ghl/*` route. Returns `null` when the caller is authorised, or
 * a ready-to-return 401 response when they are not.
 *
 * Usage — always the first statement in the handler, before reading the body or
 * touching GHL:
 *
 *   const denied = requireGhlProxySecret(request);
 *   if (denied) return denied;
 *
 * Deliberately reads the secret from headers/query only, never the body: the
 * request body is attacker-controlled and must not be parsed before the caller
 * is authenticated.
 */
export function requireGhlProxySecret(request: NextRequest): NextResponse | null {
  const expected = (process.env[GHL_PROXY_SECRET_ENV] || '').trim();

  if (!expected) {
    // Fail closed, and say why. The silent version of this condition is what
    // made the call-tracking guard inert for its entire life: correct in
    // source, never once exercised, and nothing in the logs to say so.
    console.error(
      `[ghl-proxy] REFUSED — ${GHL_PROXY_SECRET_ENV} is unset, so no caller can ` +
        'authenticate. These routes can upsert CRM contacts, SEND SMS and write ' +
        'calendar appointments, so an unset secret refuses every request rather ' +
        'than opening them. Set it in Vercel and redeploy to re-enable.',
    );
    return unauthorized();
  }

  const provided = readProvidedSecret(request, {
    headers: [HEADER_NAME],
    queryParam: 'secret',
  });

  if (!secretMatches(provided, expected)) {
    // Error level on every failure: a burst of these is what guessing the
    // secret looks like from the inside.
    console.error(
      `[ghl-proxy] REFUSED — ${provided ? 'wrong' : 'missing'} ${GHL_PROXY_SECRET_ENV} ` +
        `on ${request.method} ${new URL(request.url).pathname} from ` +
        `${request.headers.get('x-forwarded-for') || 'unknown ip'}`,
    );
    return unauthorized();
  }

  return null;
}
