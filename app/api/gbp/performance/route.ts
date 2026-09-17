/**
 * GET /api/gbp/performance
 *
 * Reads the stored Google Business Profile Performance series — call clicks,
 * direction requests, website clicks and impressions made on the Google listing
 * itself, which is a channel the website cannot observe.
 *
 * Auth: `x-gbp-secret` header or `?secret=`. FAILS CLOSED — an unset
 * GBP_PERFORMANCE_SECRET means 401 for everyone, including us, because this is
 * commercially sensitive data with no anonymous reader.
 *
 * Query flags (all optional):
 *   ?days=N     Trailing window, 1..365. Default 30.
 *   ?from=&to=  Explicit YYYY-MM-DD window, overriding ?days.
 *
 * The response always carries `syncState`, because the DATA ALONE IS MISLEADING.
 * Google publishes late and then revises: verified 2026-09-16, the newest day
 * carrying data was 2026-09-11. So the last few days of any window are
 * incomplete, not zero, and a caller comparing this window against the previous
 * one without accounting for that will see a decline that never happened.
 * `syncState.coveredTo` is the newest day a successful pull actually covered;
 * `syncState.settledTo` is that minus the observed lag, and is the date a
 * comparison should end on. The tail that is not yet settled is named in
 * `settlingWindow` so the exclusion is visible rather than silent.
 *
 * ⚠ Reads PAGE. PostgREST caps a response at `db-max-rows` (1000 by default), so
 *   a 365-day read of 7 metrics (~2555 rows) would be silently truncated — and
 *   fewer rows render as a smaller total, i.e. exactly like a real decline.
 *   Paging is done in lib/gbp-performance.ts#selectMetrics.
 */

import { NextRequest, NextResponse } from 'next/server';

import { requirePerformanceSecret } from '@/lib/gbp-auth';
import { GBP_ACTION_METRICS, getGbpStore, readSyncState, selectMetrics } from '@/lib/gbp-performance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

/** Observed settling lag. See the migration header for where this comes from. */
const GBP_LAG_DAYS = Number(process.env.GBP_LAG_DAYS || 5);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export async function GET(request: NextRequest) {
  const denied = requirePerformanceSecret(request);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const from = params.get('from');
  const to = params.get('to');

  let startIso: string;
  let endIso: string;

  if (from || to) {
    if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
      return NextResponse.json(
        {
          success: false,
          error: 'from and to must both be supplied as YYYY-MM-DD',
          hint: 'Use ?days=N for a trailing window instead.',
        },
        { status: 400 },
      );
    }
    if (from > to) {
      return NextResponse.json(
        { success: false, error: `from (${from}) is after to (${to})` },
        { status: 400 },
      );
    }
    startIso = from;
    endIso = to;
  } else {
    const raw = Number(params.get('days'));
    const days =
      Number.isFinite(raw) && raw > 0 ? Math.min(MAX_DAYS, Math.floor(raw)) : DEFAULT_DAYS;
    endIso = isoDaysAgo(1); // today is never complete
    startIso = addDays(endIso, -(days - 1));
  }

  const store = getGbpStore();
  if (!store) {
    return NextResponse.json(
      {
        success: false,
        error: 'No service-role Supabase store configured.',
        hint:
          'Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY. ' +
          'These tables grant anon nothing, so the anon key cannot read them by design.',
      },
      { status: 503 },
    );
  }

  let rows;
  let syncState;
  try {
    rows = await selectMetrics(store, startIso, endIso);
    syncState = await readSyncState(store);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // A missing relation here almost always means the migration has not been
    // applied, which reads as a generic SQL error unless it is called out.
    const hint = /does not exist|schema cache|relation/i.test(message)
      ? 'The GBP performance tables look absent — apply ' +
        'supabase/migrations/20260917000000_create_gbp_performance_tables.sql.'
      : undefined;
    console.error(`[gbp] performance read failed: ${message}`);
    return NextResponse.json({ success: false, error: message, hint }, { status: 500 });
  }

  // Aggregate per metric, and roll the four impression metrics into one figure
  // because nobody reads them separately when asking "did the listing get seen".
  const byMetric: Record<string, { total: number; days: number; firstDate: string; lastDate: string }> = {};
  const byDate: Record<string, Record<string, number>> = {};

  for (const row of rows) {
    let m = byMetric[row.metric];
    if (!m) {
      m = { total: 0, days: 0, firstDate: row.metric_date, lastDate: row.metric_date };
      byMetric[row.metric] = m;
    }
    m.total += row.value;
    m.days += 1;
    if (row.metric_date < m.firstDate) m.firstDate = row.metric_date;
    if (row.metric_date > m.lastDate) m.lastDate = row.metric_date;

    (byDate[row.metric_date] || (byDate[row.metric_date] = {}))[row.metric] = row.value;
  }

  const actions = GBP_ACTION_METRICS.reduce((sum, metric) => sum + (byMetric[metric]?.total || 0), 0);
  const impressions = Object.keys(byMetric)
    .filter((metric) => metric.startsWith('BUSINESS_IMPRESSIONS_'))
    .reduce((sum, metric) => sum + byMetric[metric].total, 0);

  const coveredTo = syncState?.covered_to || null;
  const settledTo = coveredTo ? addDays(coveredTo, -GBP_LAG_DAYS) : null;

  return NextResponse.json({
    success: true,
    window: { from: startIso, to: endIso },
    totals: { actions, impressions },
    byMetric,
    series: byDate,
    rowCount: rows.length,
    syncState: {
      ...(syncState || {}),
      /** Newest day a comparison should end on: coveredTo minus the settling lag. */
      settledTo,
      lagDays: GBP_LAG_DAYS,
      /** The range, if any, that is inside the window but not yet settled. */
      settlingWindow:
        settledTo && settledTo < endIso ? { from: addDays(settledTo, 1), to: endIso } : null,
    },
    note:
      'Sparse by design: a date with no entry means zero activity OR not yet published — ' +
      'read syncState.coveredTo to tell which. Never treat the tail as final.',
  });
}
