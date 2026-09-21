/**
 * GET|POST /api/cron/google-sync
 *
 * The one scheduled job that talks to Google. It does two things and reports on
 * both:
 *
 *   1. `syncGbpPerformance()` — the listing-side daily metrics
 *      (`gbp_daily_metrics`), unchanged from when this was `/api/gbp/sync`.
 *   2. `syncGooglePanels({ force: true })` — the Ads and GA4 dashboard panels,
 *      stored resolved into `google_panel_snapshots`.
 *
 * The dashboard itself makes NO Google call. It reads the rows this route writes
 * and nothing else; see lib/google-panel-sync.ts for why that is a guarantee
 * rather than a caching strategy. This route is therefore the only thing that can
 * spend the Ads developer token's quota on the dashboard's behalf, and it is
 * bounded: one forced run a day here, plus at most one refresh per three hours
 * from a page load that wins the claim. Ten runs a day at eleven Ads operations
 * each is 110 of the 2,880 Explorer-access allowance.
 *
 * ── Why the two parts get separate try blocks ────────────────────────────────
 *
 * They share nothing but a schedule. A revoked GBP grant must not stop the Ads
 * snapshot from being refreshed, and a rejected Ads developer token must not
 * stop the listing metrics — otherwise one broken credential silently blanks
 * half the dashboard and the failure looks like a Google outage. Each part
 * reports its own outcome and the route only fails as a whole if one of them did.
 *
 * ⚠ Both parts WRITE to Supabase with the SERVICE-ROLE key, which bypasses RLS,
 *   so `requireCronSecret` is the only thing between an anonymous caller and full
 *   database write access. It fails closed: an unset CRON_SECRET refuses every
 *   request rather than opening the route. Never weaken this into a `?secret=`.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET`, which is exactly what Vercel's cron
 * runner sends. See lib/gbp-auth.ts for why the `Bearer ` prefix is stripped
 * before the constant-time compare.
 *
 * Query flags:
 *   ?dry=1   Read and report from both parts, writing NOTHING (the panel sync
 *            does not even claim). The only way to prove the credentials and the
 *            queries work in production before a cron depends on them.
 *
 * Everything with a knob on it — `?days=`, `?backfill=`, `?from=&to=`, `?diff=`
 * — stays on `/api/gbp/sync`, which this route supersedes as the *scheduled*
 * entry point but not as the manual one. Duplicating those flags here would mean
 * two places to keep in step for no gain: the cron never passes them.
 *
 * Status codes:
 *   200 — every part succeeded (or was skipped because it was not due)
 *   401 — no credential, wrong credential, or CRON_SECRET is unset
 *   500 — a part failed; `gbp.error` / `panels[].error` says which, and the part
 *         that did not fail still ran and still wrote
 *   503 — the GBP part failed for a configuration reason (missing credentials,
 *         or Google rejecting them), so nothing was attempted there. Deliberately
 *         not 500: a redeploy fixes this class, and a monitor should be able to
 *         tell it from a transient error.
 */

import { NextRequest, NextResponse } from 'next/server';

import { syncGooglePanels, type GoogleSyncOutcome } from '@/lib/dashboard-data';
import { requireCronSecret } from '@/lib/gbp-auth';
import { syncGbpPerformance, type GbpSyncResult } from '@/lib/gbp-performance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function flag(raw: string | null): boolean {
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/** One part of the job. A throw is a failure of that part, not of the route. */
type Part<T> = { ok: true; result: T } | { ok: false; error: string; configError: boolean };

async function attempt<T>(run: () => Promise<T>): Promise<Part<T>> {
  try {
    return { ok: true, result: await run() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Logged because a cron run has no other observer — Vercel keeps the
    // invocation log, and this is where a silent half-failure would hide.
    console.error(`[cron] google-sync part failed: ${message}`);
    return { ok: false, error: message, configError: false };
  }
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const dryRun = flag(new URL(request.url).searchParams.get('dry'));

  // Sequential, not concurrent, and the panel sync is the reason: it claims the
  // snapshot row, calls Google, and writes the result back, and the claim's
  // whole value is that two callers cannot both win it. Running the parts
  // alongside each other would only make the logs harder to read.
  const gbp = await attempt<GbpSyncResult>(() => syncGbpPerformance({ dryRun }));
  const panels = await attempt<GoogleSyncOutcome[]>(() => syncGooglePanels({ force: true, dryRun }));

  // A part "failed" if it threw, or if it came back reporting its own failure —
  // the GBP sync resolves `{ok: false}` rather than throwing for the credential
  // and fetch cases, and reading only the throw would report those as success.
  const gbpFailed = !gbp.ok || !gbp.result.ok;
  const gbpConfigError = gbp.ok && gbp.result.configError === true;
  const panelFailures = panels.ok ? panels.result.filter((p) => p.action === 'failed') : [];
  const ok = !gbpFailed && panels.ok && panelFailures.length === 0;

  const body = {
    success: ok,
    dryRun,
    gbp: gbp.ok
      ? {
          ok: gbp.result.ok,
          written: gbp.result.written,
          datapoints: gbp.result.datapoints,
          store: gbp.result.store,
          windows: gbp.result.windows,
          error: gbp.result.error ?? null,
        }
      : { ok: false, error: gbp.error },
    panels: panels.ok
      ? panels.result
      : [{ source: null, action: 'failed', window: null, capturedAt: null, error: panels.error }],
  };

  if (ok) return NextResponse.json(body, { status: 200 });

  // 503 only for the GBP part's credential state, which it reports through a
  // typed `configError` flag rather than a message we would have to pattern-match
  // ("missing env vars" and "Google refused the refresh token" are the same
  // action: fix the credential and redeploy). Nothing else here is classified:
  // a panel failure, including the missing-service-role-key case, is a 500 with
  // the reason in `panels[].error`, which is what the message is for.
  return NextResponse.json(body, { status: gbpConfigError ? 503 : 500 });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

// The `CRON_SECRET` header for a manual run, without printing the secret:
//
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//     'https://www.upgraderoofs.co.uk/api/cron/google-sync?dry=1'
//
// `?dry=1` first: it proves both parts authenticate and both queries work while
// writing nothing. Then drop the flag, and the panels are refreshed on the spot.
//
// Before any of that, apply `supabase/migrations/20260921120000_create_google_panel_snapshots.sql`.
// Without it the panel half fails (PostgREST answers `PGRST205`) and the
// dashboard shows its "snapshot store missing" note — by design, since the read
// path must never fall back to a live Google call.
