/**
 * scripts/report-gbp-performance.js
 *
 * Reports the Google Business Profile channel — calls, direction requests and
 * website clicks made on the listing itself — from the stored series, with a
 * period-over-period comparison.
 *
 * Plain .js on purpose, like every other scripts/audit-*.js. A .ts script
 * importing lib/*.ts would die at the `@/` alias, and tsx is not installed, so
 * it would look like a dead script rather than a broken one. This talks to
 * PostgREST directly, which also means it works before any deployment exists.
 *
 * ── WHY THE WINDOW DOES NOT END TODAY ────────────────────────────────────────
 *
 * The recent days are INCOMPLETE, not zero. Verified against the live API on
 * 2026-09-16: the newest day carrying data was 2026-09-11 — a four-day lag —
 * and the figures keep being revised for days after that. So comparing a window
 * ending today against the window before it shows a decline that did not
 * happen: the current window is missing its last few days while the prior one
 * is settled.
 *
 * The anchor is therefore `covered_to − GBP_LAG_DAYS`, where covered_to is the
 * newest day a successful pull actually COVERED (recorded factually in
 * gbp_sync_state, not inferred). Anchoring to a recorded date minus a fixed lag
 * is explainable and stable. The alternative — "the last date carrying a
 * non-zero value" — would silently drag the window backwards during a genuinely
 * quiet spell, for no reason.
 *
 * The anchor, the lag and the excluded tail are all printed, so the exclusion is
 * visible rather than silent.
 *
 * Usage:  node scripts/report-gbp-performance.js [--days=90] [--json]
 *
 * Env:    GBP_REPORT_DAYS      comparison window length      (default 90)
 *         GBP_LAG_DAYS         settling lag subtracted       (default 5)
 *         GBP_LAG_WARN_DAYS    fail if data is older than this (default 7)
 *         GBP_SYNC_STALE_DAYS  fail if the last pull is older (default 3)
 *
 * Exit:   0 healthy · 1 the store is unreadable, the sync is stale, or no data
 *         is arriving. Deliberately non-zero so it can be piped into monitoring.
 */

require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env.local'),
  quiet: true,
});

const ARG_DAYS = (() => {
  const hit = process.argv.find((a) => a.startsWith('--days='));
  return hit ? Number(hit.split('=')[1]) : null;
})();

const REPORT_DAYS = ARG_DAYS || Number(process.env.GBP_REPORT_DAYS || 90);
const LAG_DAYS = Number(process.env.GBP_LAG_DAYS || 5);
const LAG_WARN_DAYS = Number(process.env.GBP_LAG_WARN_DAYS || 7);
const STALE_DAYS = Number(process.env.GBP_SYNC_STALE_DAYS || 3);
const AS_JSON = process.argv.includes('--json');

const TABLE = 'gbp_daily_metrics';
const STATE_TABLE = 'gbp_sync_state';

/** The three that mean a customer did something. */
const ACTION_METRICS = ['CALL_CLICKS', 'BUSINESS_DIRECTION_REQUESTS', 'WEBSITE_CLICKS'];

const IMPRESSION_PREFIX = 'BUSINESS_IMPRESSIONS_';

const LABELS = {
  CALL_CLICKS: 'CALL_CLICKS',
  BUSINESS_DIRECTION_REQUESTS: 'BUSINESS_DIRECTION_REQUESTS',
  WEBSITE_CLICKS: 'WEBSITE_CLICKS',
};

const problems = [];

function fail(message) {
  problems.push(message);
}

// ── PostgREST ────────────────────────────────────────────────────────────────

function restBase() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

/**
 * Page a PostgREST read.
 *
 * PostgREST caps a response at db-max-rows (1000 by default). A 180-day read of
 * 7 metrics is ~1260 rows and would silently truncate — and fewer rows render as
 * a smaller total, which looks exactly like a real decline. `.limit()` does not
 * lift the cap, so this pages until a short page comes back.
 */
async function selectAll(base, table, query) {
  const PAGE = 1000;
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${base.url}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: base.key,
        Authorization: `Bearer ${base.key}`,
        Accept: 'application/json',
        Range: `${offset}-${offset + PAGE - 1}`,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`${table} read returned HTTP ${res.status}: ${body.slice(0, 300)}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    const page = await res.json();
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

// ── Dates ────────────────────────────────────────────────────────────────────

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toIso(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function utcToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toIso(dt);
}

function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

// ── Aggregation ──────────────────────────────────────────────────────────────

function totalsByMetric(rows) {
  const out = {};
  for (const row of rows) {
    out[row.metric] = (out[row.metric] || 0) + row.value;
  }
  return out;
}

function sumOf(totals, metrics) {
  return metrics.reduce((sum, m) => sum + (totals[m] || 0), 0);
}

function impressionTotal(totals) {
  return Object.keys(totals)
    .filter((m) => m.startsWith(IMPRESSION_PREFIX))
    .reduce((sum, m) => sum + totals[m], 0);
}

function pct(current, prior) {
  if (!prior) return current ? 'n/a' : '0%';
  const change = ((current - prior) / prior) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(0)}%`;
}

function pad(s, n) {
  return String(s).padEnd(n);
}

function lpad(s, n) {
  return String(s).padStart(n);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const base = restBase();
  if (!base) {
    console.error(
      'No Supabase credentials. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and\n' +
        'SUPABASE_SERVICE_ROLE_KEY in .env.local. The anon key cannot be used: the GBP\n' +
        'tables grant anon nothing, deliberately.',
    );
    process.exit(1);
  }

  // ── Coverage ───────────────────────────────────────────────────────────────
  let state = null;
  try {
    const rows = await selectAll(
      base,
      STATE_TABLE,
      'select=location_id,covered_from,covered_to,last_ok_at,last_error&limit=1',
    );
    state = rows[0] || null;
  } catch (err) {
    if (/does not exist|schema cache|relation/i.test(err.body || '')) {
      console.error(
        'The GBP performance tables do not exist yet. Apply\n' +
          '  supabase/migrations/20260917000000_create_gbp_performance_tables.sql\n' +
          'and run a sync before reporting.',
      );
      process.exit(1);
    }
    console.error(`Could not read ${STATE_TABLE}: ${err.message}`);
    process.exit(1);
  }

  if (!state || !state.covered_to) {
    console.error(
      'No successful sync has been recorded, so there is nothing to report and no\n' +
        'honest way to choose a window. Run:\n' +
        '  curl -H "Authorization: Bearer $CRON_SECRET" "<site>/api/gbp/sync?backfill=365"',
    );
    process.exit(1);
  }

  // ── The anchor ─────────────────────────────────────────────────────────────
  const today = toIso(utcToday());
  const anchor = addDays(state.covered_to, -LAG_DAYS);
  const currentFrom = addDays(anchor, -(REPORT_DAYS - 1));
  const priorTo = addDays(currentFrom, -1);
  const priorFrom = addDays(priorTo, -(REPORT_DAYS - 1));

  let currentRows;
  let priorRows;
  try {
    const q = (from, to) =>
      `select=metric,metric_date,value` +
      `&metric_date=gte.${from}&metric_date=lte.${to}` +
      `&order=metric_date.asc&limit=100000`;
    currentRows = await selectAll(base, TABLE, q(currentFrom, anchor));
    priorRows = await selectAll(base, TABLE, q(priorFrom, priorTo));
  } catch (err) {
    console.error(`Could not read ${TABLE}: ${err.message}`);
    process.exit(1);
  }

  const current = totalsByMetric(currentRows);
  const prior = totalsByMetric(priorRows);

  // ── Health checks ──────────────────────────────────────────────────────────
  const syncAgeDays = state.last_ok_at ? daysBetween(toIso(new Date(state.last_ok_at)), today) : null;
  if (syncAgeDays == null) {
    fail('The sync has never recorded a success.');
  } else if (syncAgeDays > STALE_DAYS) {
    fail(
      `The last successful sync was ${syncAgeDays} day(s) ago ` +
        `(threshold ${STALE_DAYS}). The cron may have stopped, or the refresh token may ` +
        `have died — check for rows in lead_pipeline_events with channel='gbp' and ok=false.`,
    );
  }

  // Data lag: pulls succeed but Google has stopped publishing. Distinct from a
  // broken pull, and the only signal that catches it.
  const newestDate = currentRows.concat(priorRows).reduce(
    (max, r) => (r.metric_date > max ? r.metric_date : max),
    '0000-00-00',
  );
  const dataLagDays = newestDate === '0000-00-00' ? null : daysBetween(newestDate, state.covered_to);
  if (dataLagDays != null && dataLagDays > LAG_WARN_DAYS) {
    fail(
      `The newest data point is ${dataLagDays} day(s) behind covered_to ` +
        `(threshold ${LAG_WARN_DAYS}). The pulls are succeeding but Google is not ` +
        `publishing — the figures below are missing real activity.`,
    );
  }
  if (state.last_error) {
    fail(`The most recent sync recorded an error: ${state.last_error}`);
  }

  const payload = {
    anchor,
    coveredTo: state.covered_to,
    lagDays: LAG_DAYS,
    reportDays: REPORT_DAYS,
    excludedTail: anchor < state.covered_to ? { from: addDays(anchor, 1), to: state.covered_to } : null,
    currentWindow: { from: currentFrom, to: anchor },
    priorWindow: { from: priorFrom, to: priorTo },
    current,
    prior,
    actions: { current: sumOf(current, ACTION_METRICS), prior: sumOf(prior, ACTION_METRICS) },
    impressions: { current: impressionTotal(current), prior: impressionTotal(prior) },
    syncAgeDays,
    dataLagDays,
    problems,
  };

  if (AS_JSON) {
    console.log(JSON.stringify(payload, null, 2));
    process.exit(problems.length ? 1 : 0);
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  const excluded =
    anchor < state.covered_to
      ? `; ${addDays(anchor, 1)}..${state.covered_to} excluded (still settling)`
      : '';
  console.log(
    `\nGBP PERFORMANCE — ${REPORT_DAYS}d ending ${anchor} ` +
      `(covered_to ${state.covered_to}, lag ${LAG_DAYS}d${excluded})`,
  );
  console.log(`  vs prior ${REPORT_DAYS}d: ${priorFrom}..${priorTo}`);
  if (syncAgeDays != null) {
    console.log(`  last successful sync: ${state.last_ok_at} (${syncAgeDays}d ago)`);
  }
  if (dataLagDays != null) {
    console.log(`  newest data point:    ${newestDate} (${dataLagDays}d behind covered_to)`);
  }
  console.log('');

  console.log(`  ${pad('metric', 34)}${lpad('current', 9)}${lpad('prior', 8)}${lpad('change', 9)}`);
  console.log('  ' + '-'.repeat(60));

  const row = (label, cur, pri) => {
    console.log(`  ${pad(label, 34)}${lpad(cur, 9)}${lpad(pri, 8)}${lpad(pct(cur, pri), 9)}`);
  };

  for (const metric of ACTION_METRICS) {
    row(LABELS[metric] || metric, current[metric] || 0, prior[metric] || 0);
  }
  row('actions (all 3)', sumOf(current, ACTION_METRICS), sumOf(prior, ACTION_METRICS));
  row('impressions (maps/search)', impressionTotal(current), impressionTotal(prior));

  // Any metric the allowlist does not know about still gets shown, rather than
  // being silently dropped from the report.
  const known = new Set(ACTION_METRICS);
  for (const metric of Object.keys(current).sort()) {
    if (known.has(metric) || metric.startsWith(IMPRESSION_PREFIX)) continue;
    row(metric, current[metric] || 0, prior[metric] || 0);
  }

  if (state.last_error) {
    console.log(`\n  ! most recent sync error: ${state.last_error}`);
  }
  if (problems.length) {
    console.log('');
    for (const p of problems) console.log(`  ✖ ${p}`);
  }
  console.log('');

  process.exit(problems.length ? 1 : 0);
}

main().catch((err) => {
  console.error('\nFATAL:', (err && err.message) || err);
  process.exit(1);
});
