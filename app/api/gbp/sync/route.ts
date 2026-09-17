/**
 * GET|POST /api/gbp/sync
 *
 * Pulls the Google Business Profile Performance API and stores it, so calls,
 * direction requests and website clicks made on the Google listing itself —
 * a channel the website cannot see at all — become comparable over time.
 *
 * GET is the real entry point: Vercel's cron runner only issues GET. POST is
 * accepted so the same call can be made by hand with a body-free curl.
 *
 * ⚠ This route WRITES to Supabase with the SERVICE-ROLE key, which bypasses RLS,
 *   so `requireCronSecret` is the only thing between an anonymous caller and full
 *   database write access. It fails closed: an unset CRON_SECRET refuses every
 *   request rather than opening the route.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET`. Deliberately no `?secret=` — see
 * lib/gbp-auth.ts for why the `Bearer ` prefix must be stripped before the
 * constant-time compare.
 *
 * Query flags (all optional):
 *   ?dry=1          Mint the token, fetch, flatten and report — but WRITE
 *                   NOTHING and record no pipeline event. This is the only way
 *                   to prove Vercel's credential triple works before the cron
 *                   depends on it. Never echoes a token.
 *   ?days=N         Override the trailing window (floor 7 — see resolveWindow).
 *   ?backfill=N     Pull N days back from yesterday in 90-day chunks, instead of
 *                   the trailing window. The long first run.
 *   ?from=&to=      Explicit YYYY-MM-DD window, overriding both of the above.
 *   ?diff=1         Report which stored rows would change value, writing
 *                   nothing. How Google's revisions become observable without
 *                   keeping a history of every revision.
 *
 * Status codes:
 *   200 — the pull succeeded (and, unless dry/diff, the rows were stored)
 *   401 — no credential, wrong credential, or CRON_SECRET is unset
 *   400 — the flags do not describe a usable window
 *   500 — the pull or the store failed; `reason` distinguishes `fetch:` from
 *         `store:` because "Google would not talk to us" and "we got the data
 *         and could not keep it" are different incidents
 *   503 — credentials are missing or Google rejected them, so nothing was even
 *         attempted. Deliberately not 500: this is a configuration state that a
 *         redeploy fixes, not a transient runtime error.
 */

import { NextRequest, NextResponse } from 'next/server';

import { requireCronSecret } from '@/lib/gbp-auth';
import { syncGbpPerformance, type SyncOptions } from '@/lib/gbp-performance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a positive integer query flag, or null if absent/unusable. */
function positiveInt(raw: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function flag(raw: string | null): boolean {
  return raw === '1' || raw === 'true' || raw === 'yes';
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;

  const from = params.get('from');
  const to = params.get('to');
  if ((from || to) && !(from && to && ISO_DATE.test(from) && ISO_DATE.test(to))) {
    return NextResponse.json(
      {
        success: false,
        error: 'from and to must both be supplied as YYYY-MM-DD',
        hint: 'Use ?days=N for a trailing window instead.',
      },
      { status: 400 },
    );
  }
  if (from && to && from > to) {
    return NextResponse.json(
      { success: false, error: `from (${from}) is after to (${to})` },
      { status: 400 },
    );
  }

  const options: SyncOptions = {
    dryRun: flag(params.get('dry')),
    diffOnly: flag(params.get('diff')),
  };
  if (from && to) {
    options.from = from;
    options.to = to;
  } else {
    const days = positiveInt(params.get('days'));
    if (days != null) options.days = days;
    const backfill = positiveInt(params.get('backfill'));
    if (backfill != null) options.backfillDays = backfill;
  }

  const result = await syncGbpPerformance(options);

  if (result.ok) return NextResponse.json({ success: true, ...result }, { status: 200 });

  // Configuration failure: nothing was attempted, and a redeploy fixes it.
  // Distinguished from a runtime failure so a monitor can tell "the credential
  // is missing or rejected" from "Google is down". The module sets this from an
  // `instanceof GbpConfigError` check rather than by matching message text.
  if (result.configError) {
    return NextResponse.json({ success: false, ...result }, { status: 503 });
  }

  return NextResponse.json({ success: false, ...result }, { status: 500 });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

// Nothing else is exported, deliberately. A Next.js App Router route module
// accepts only known fields (the HTTP methods, `dynamic`, `runtime`, …) and the
// generated route type check fails the BUILD on anything else — so a helper
// constant exported from here for convenience would break `npm run build`.
//
// First-time use, in order: apply the migration, then
//   curl -H "Authorization: Bearer $CRON_SECRET" '…/api/gbp/sync?dry=1'
// to prove the credentials work, then
//   curl -H "Authorization: Bearer $CRON_SECRET" '…/api/gbp/sync?backfill=365'
// to fill the history. Backfilling first would also work — the trailing cron
// window would simply re-pull and upsert the same recent days.
