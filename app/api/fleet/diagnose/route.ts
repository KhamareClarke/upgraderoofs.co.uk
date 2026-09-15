import { NextRequest, NextResponse } from 'next/server';
import { secretMatches, readProvidedSecret } from '@/lib/shared-secret';

/**
 * GET /api/fleet/diagnose
 *
 * Operator diagnostic: posts a test event to the fleet hub and reports the HTTP
 * result, so a broken fleet wiring is one request away from being obvious.
 *
 * ── Security history — read before changing the guard ────────────────────────
 *
 * This route shipped with NO authentication at all while doing two dangerous
 * things:
 *
 *   1. It returned `mask()` output for FLEET_INGEST_SECRET and
 *      EMPIRE_INGEST_SECRET. `mask()` was a *display* helper, written for
 *      console output, and it answered with the first 3 characters, the last 3
 *      characters and the exact length of a real 64-char secret:
 *          "FLEET_INGEST_SECRET": "574…467 (len=64)"
 *      Verified live 2026-09-15 from an anonymous curl against production.
 *   2. It performs an outbound POST to the fleet hub carrying
 *      `Authorization: Bearer <that secret>`, on the caller's behalf, to a hub
 *      URL partly derived from env. So one anonymous GET both disclosed most of
 *      a credential and exercised it.
 *
 * The fix is threefold and all three parts are load-bearing:
 *
 *   - A shared secret (FLEET_DIAGNOSE_SECRET) compared in constant time.
 *   - It FAILS CLOSED. Unlike /api/webhooks/call-tracking, no provider depends
 *     on this route — it is an operator tool with no machine caller, so an
 *     unset env var refuses every request rather than opening the route. That
 *     is the whole lesson of the two prior incidents on this codebase: an
 *     `if (expectedSecret)` guard that is inert when the var is missing is not
 *     a guard, it is a comment.
 *   - `mask()` is gone. Secret state is reported as 'set' / 'unset' and nothing
 *     else — not to anonymous callers, not to authenticated ones either. A
 *     diagnostic that has to be locked down is worse than one that discloses
 *     nothing worth locking down.
 *
 * Sibling routes fixed the same way: /api/webhooks/call-tracking (guard was
 * inert on an unset var), /api/health/lead-pipeline (non-constant-time compare).
 *
 * Auth: send the shared secret as the `x-fleet-secret` header, or `?secret=`.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PROJECT = 'upgraderoofing';

/**
 * Report whether a secret is configured — never its value, length, or any of
 * its characters. See the security note above: the previous helper returned
 * `"574…467 (len=64)"`, and 6 characters plus the exact length of a 64-char
 * secret is a meaningful head start on guessing one.
 */
function presence(value: string | undefined | null): 'set' | 'unset' {
  return value ? 'set' : 'unset';
}

function unauthorized() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Unauthorized',
      hint: 'Send the shared secret as the x-fleet-secret header or the ?secret= query parameter.',
    },
    { status: 401 },
  );
}

export async function GET(request: NextRequest) {
  // ── Auth first. Nothing below this line runs for an unauthenticated caller:
  // no env is read, no secret is touched, no outbound request is made.
  const expected = (process.env.FLEET_DIAGNOSE_SECRET || '').trim();
  if (!expected) {
    // Fail closed, and say so loudly. This is the exact condition that made the
    // call-tracking guard inert for its entire life: correct in source, never
    // once exercised, and silent about it.
    console.error(
      '[fleet/diagnose] REFUSED — FLEET_DIAGNOSE_SECRET is unset, so no caller can ' +
        'authenticate. This endpoint previously had no guard and leaked partial ingest ' +
        'secrets. Set FLEET_DIAGNOSE_SECRET in Vercel and redeploy to re-enable it.',
    );
    return unauthorized();
  }

  const provided = readProvidedSecret(request, {
    headers: ['x-fleet-secret'],
    queryParam: 'secret',
  });
  if (!secretMatches(provided, expected)) {
    // Logged at error level on every failure — a burst of these is what an
    // attempt to guess the secret looks like from the inside.
    console.error(
      `[fleet/diagnose] REFUSED — ${provided ? 'wrong' : 'missing'} FLEET_DIAGNOSE_SECRET ` +
        `from ${request.headers.get('x-forwarded-for') || 'unknown ip'}`,
    );
    return unauthorized();
  }

  const fleetUrl = (process.env.FLEET_INGEST_URL || '').trim();
  const empireHub = (process.env.EMPIRE_HUB_URL || '').trim().replace(/\/$/, '');
  const hubUrl = (
    fleetUrl || (empireHub ? `${empireHub}/api/fleet/ingest` : 'https://www.khamareclarke.com/api/fleet/ingest')
  ).replace(/\/$/, '');
  const fleetSecret = (process.env.FLEET_INGEST_SECRET || '').trim();
  const empireSecret = (process.env.EMPIRE_INGEST_SECRET || '').trim();
  const secret = fleetSecret || empireSecret;

  const env = {
    FLEET_INGEST_URL: fleetUrl || '(default)',
    FLEET_INGEST_SECRET: presence(fleetSecret),
    EMPIRE_HUB_URL: empireHub || '(missing)',
    EMPIRE_INGEST_SECRET: presence(empireSecret),
    secret_used: fleetSecret ? 'FLEET_INGEST_SECRET' : empireSecret ? 'EMPIRE_INGEST_SECRET (fallback)' : '(none)',
  };

  if (!secret) {
    return NextResponse.json({
      ok: false,
      reason: 'No fleet/empire ingest secret configured',
      env,
      hint: 'In Vercel → Upgrade Roofs → Settings → Environment Variables, set FLEET_INGEST_SECRET (same value as on khamareclarke.com) OR EMPIRE_INGEST_SECRET.',
    });
  }

  let status = 0;
  let responseText = '';
  let error: string | null = null;
  try {
    const res = await fetch(hubUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        project: PROJECT,
        event_type: 'test',
        summary: `Fleet diagnose — ${PROJECT}`,
        payload: { source: 'GET /api/fleet/diagnose' },
      }),
      cache: 'no-store',
    });
    status = res.status;
    responseText = (await res.text()).slice(0, 2000);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const ok = !error && status >= 200 && status < 300;
  return NextResponse.json({
    ok,
    env,
    request: { target: hubUrl },
    response: { status, body: responseText, error },
    hint: ok
      ? 'Fleet wiring OK — submit a quote and check Jarvis → All projects.'
      : status === 401
        ? 'Hub rejected secret — align FLEET_INGEST_SECRET with khamareclarke.com hub.'
        : 'See response.body / reason for details.',
  });
}
