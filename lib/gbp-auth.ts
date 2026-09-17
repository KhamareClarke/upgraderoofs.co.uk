import { NextRequest, NextResponse } from 'next/server';
import { secretMatches, readProvidedSecret } from '@/lib/shared-secret';

/**
 * lib/gbp-auth.ts
 *
 * Guards for the two Google Business Profile Performance routes.
 *
 * ── What these routes expose and can do ──────────────────────────────────────
 *
 *   GET/POST /api/gbp/sync         pull the Performance API and WRITE to Supabase
 *                                  using the SERVICE-ROLE key, which bypasses RLS
 *   GET      /api/gbp/performance  read stored call clicks, direction requests
 *                                  and website clicks for the listing
 *
 * The read route is commercially sensitive: call volumes and direction requests
 * are business performance data with no legitimate anonymous reader. The sync
 * route is worse than sensitive — it holds a key that can write anywhere in the
 * database, so this guard is the only thing between an anonymous caller and
 * full DB write access.
 *
 * ── Two secrets, not one ─────────────────────────────────────────────────────
 *
 * Unlike the /api/ghl/* routes (where one secret covers three routes because
 * they share one token and one consumer), these have genuinely different
 * callers and different blast radii:
 *
 *   CRON_SECRET            exactly one machine caller — Vercel's cron runner.
 *   GBP_PERFORMANCE_SECRET a human or tool reading the numbers.
 *
 * Handing a reporting tool the sync secret would let it trigger backfills; that
 * is a real capability, so it gets its own key. Vercel also sets CRON_SECRET
 * itself for the platform's own use, so overloading it would be wrong anyway.
 *
 * ── Fail closed, both of them ────────────────────────────────────────────────
 *
 * An unset env var REFUSES every request rather than opening the route. This
 * matches lib/ghl-proxy-auth.ts and app/api/fleet/diagnose/route.ts, and is the
 * opposite of /api/webhooks/call-tracking (which fails open because a provider
 * must be able to deliver events).
 *
 * The reasoning is the same in both cases here: neither route has a caller that
 * cannot be reconfigured. The cron is configured by us in vercel.json, and the
 * read route has no consumer in this repo yet. So refusing on an unset var
 * costs nothing today and means a missing secret is a visible 401 rather than a
 * silently open endpoint. The failure mode this codebase has actually suffered
 * twice is a guard that was correct in source, never exercised, and inert.
 *
 * Knowingly: until GBP_PERFORMANCE_SECRET exists in Vercel, the read route is
 * 401 for everyone, including us.
 */

/** Env var holding the secret Vercel presents to the cron route. */
export const CRON_SECRET_ENV = 'CRON_SECRET';

/** Env var holding the secret for the human/tool-facing read route. */
export const GBP_PERFORMANCE_SECRET_ENV = 'GBP_PERFORMANCE_SECRET';

/** Header the read route accepts the secret in (repo convention). */
const PERFORMANCE_HEADER = 'x-gbp-secret';

/**
 * One refusal, built in one place.
 *
 * The hint is deliberately generic across both guards: it names no env var and
 * describes no header, so a probe cannot use the error to learn which secret it
 * failed against or how many exist. The detail goes to the server log instead.
 */
function refuse(): NextResponse {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

/** Request metadata for the failure log. Never includes the secret itself. */
function callerOf(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || 'unknown ip';
  let path = 'unknown path';
  try {
    path = new URL(request.url).pathname;
  } catch {
    // A malformed URL still has to produce a log line.
  }
  return `${request.method} ${path} from ${ip}`;
}

/**
 * Guard the cron-triggered sync route. Returns `null` when authorised, or a
 * ready-to-return 401.
 *
 *   const denied = requireCronSecret(request);
 *   if (denied) return denied;
 *
 * `Authorization: Bearer <secret>` ONLY — no query parameter. This secret has
 * exactly one machine caller, and query strings leak into access logs, proxy
 * logs and Referer headers, so there is no reason to accept one.
 *
 * ⚠ THE TRAP THIS EXISTS TO AVOID. `readProvidedSecret` returns the RAW header
 *   value, so the caller's `Authorization: Bearer abc123` arrives here as the
 *   literal string `"Bearer abc123"`. Passing that to `secretMatches` compares
 *   it against `"abc123"` and returns false — rejecting the LEGITIMATE caller
 *   and producing a 401 that is indistinguishable from a wrong secret. The
 *   prefix must be stripped first. (Vercel's own documentation sample compares
 *   the whole header to `"Bearer " + expected` with `===`, which would work but
 *   is not constant-time and is not what `secretMatches` does.)
 *
 *   The `?secret=` fallback is deliberately absent, so a caller who sends the
 *   correct secret WITHOUT the `Bearer ` prefix is refused. That is intentional:
 *   it proves the strip is load-bearing, and it is asserted in the verification
 *   steps.
 */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  const expected = (process.env[CRON_SECRET_ENV] || '').trim();

  if (!expected) {
    // Fail closed, loudly. Without this line, a missing CRON_SECRET looks
    // exactly like a working deployment whose cron never fires.
    console.error(
      `[gbp] REFUSED — ${CRON_SECRET_ENV} is unset, so no caller can authenticate. ` +
        'This route writes to Supabase with the service-role key, so an unset ' +
        'secret refuses every request rather than opening it. Set it in Vercel ' +
        'and redeploy to re-enable the sync.',
    );
    return refuse();
  }

  // `headers` MUST be passed explicitly. `readProvidedSecret` defaults to
  // `x-shared-secret`, which would leave this guard looking for a header no
  // caller sends — a fail-closed 401 for the legitimate cron caller, which is
  // indistinguishable from a misconfigured secret. Verified locally: without
  // this, `Authorization: Bearer $CRON_SECRET` returned 401.
  //
  // `queryParam: null` disables the query fallback — see the note above.
  const raw = readProvidedSecret(request, { headers: ['authorization'], queryParam: null });

  // The `Bearer` scheme is REQUIRED, not merely tolerated. Stripping it
  // unconditionally would also accept a bare secret (`Authorization: <secret>`)
  // and any other scheme, which quietly makes the strip a no-op: the compare
  // would match the un-stripped value too, so the code path that matters would
  // never be exercised by the test that is supposed to prove it works.
  // DEMONSTRATED, not assumed — before this check the bare-secret call
  // authenticated successfully and ran a real sync.
  const match = raw ? /^Bearer\s+(.+)$/i.exec(raw.trim()) : null;
  const provided = match ? match[1].trim() : null;

  if (!provided) {
    console.error(
      `[gbp] REFUSED — no "Authorization: Bearer <secret>" on ${callerOf(request)}` +
        `${raw ? ` (a header was present but not in that form)` : ''}`,
    );
    return refuse();
  }

  if (!secretMatches(provided, expected)) {
    console.error(
      `[gbp] REFUSED — ${provided ? 'wrong' : 'missing'} ${CRON_SECRET_ENV} on ${callerOf(request)}`,
    );
    return refuse();
  }

  return null;
}

/**
 * Guard the read route. Returns `null` when authorised, or a ready-to-return 401.
 *
 * Accepts `x-gbp-secret` or `?secret=`, matching the convention used by the
 * other tool-facing routes in this repo. Fails closed when
 * GBP_PERFORMANCE_SECRET is unset, so the route is 401 for everyone — including
 * us — until the var exists in Vercel.
 */
export function requirePerformanceSecret(request: NextRequest): NextResponse | null {
  const expected = (process.env[GBP_PERFORMANCE_SECRET_ENV] || '').trim();

  if (!expected) {
    console.error(
      `[gbp] REFUSED — ${GBP_PERFORMANCE_SECRET_ENV} is unset, so the stored GBP ` +
        'performance figures cannot be read by anyone. This is intentional: the ' +
        'data is commercially sensitive, so an unset secret refuses rather than ' +
        'exposes it. Set it in Vercel and redeploy.',
    );
    return refuse();
  }

  const provided = readProvidedSecret(request, {
    headers: [PERFORMANCE_HEADER],
    queryParam: 'secret',
  });

  if (!secretMatches(provided, expected)) {
    console.error(
      `[gbp] REFUSED — ${provided ? 'wrong' : 'missing'} ${GBP_PERFORMANCE_SECRET_ENV} ` +
        `on ${callerOf(request)}`,
    );
    return refuse();
  }

  return null;
}
