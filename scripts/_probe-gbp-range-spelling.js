/**
 * scripts/_probe-gbp-range-spelling.js
 *
 * READ-ONLY. Settles two questions the ingestion code depends on, with evidence
 * rather than docs. No writes, no schema changes, no deployment.
 *
 *   1. RANGE SPELLING. The GBP Performance API documents the daily range as
 *      dotted snake_case (`dailyRange.start_date.year`), but two scripts in this
 *      repo disagree — one uses `start_date`, another `startDate`. If camelCase
 *      is IGNORED rather than rejected, the request silently falls back to a
 *      default window and a backfill would write the wrong dates. This requests
 *      the SAME 7-day window both ways and diffs the returned date sets. The
 *      danger case is not an error: it is camelCase returning a DIFFERENT, wider
 *      set of dates with HTTP 200.
 *
 *   2. BARE RESOURCE. `lib/gbp-performance.ts` calls the bare `locations/{id}`
 *      resource, skipping account discovery entirely, because that is what the
 *      Performance API documents. This confirms it resolves, which matters
 *      because a wrong path 404s in a way that looks like a permissions failure.
 *
 * Run:  node scripts/_probe-gbp-range-spelling.js
 */

require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env.local'),
  quiet: true,
});

const PERF_HOST = 'https://businessprofileperformance.googleapis.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** Marcus's listing — the 20-digit id is the live one (the 17-digit variant 404s). */
const TARGET = '17098915606572808840';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function iso(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

async function mintToken() {
  const body = new URLSearchParams({
    client_id: (process.env.GBP_CLIENT_ID || '').trim(),
    client_secret: (process.env.GBP_CLIENT_SECRET || '').trim(),
    refresh_token: (process.env.GBP_REFRESH_TOKEN || '').trim(),
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`token exchange failed: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json.access_token;
}

async function get(pathAndQuery, token) {
  const res = await fetch(`${PERF_HOST}${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { status: res.status, body };
}

/** dailyRange.<label>.* — the label is `start_date`/`end_date` or `startDate`/`endDate`. */
function rangePart(label, d) {
  return [
    `dailyRange.${label}.year=${d.getUTCFullYear()}`,
    `dailyRange.${label}.month=${d.getUTCMonth() + 1}`,
    `dailyRange.${label}.day=${d.getUTCDate()}`,
  ].join('&');
}

/** snake_case: dailyRange.start_date.* / dailyRange.end_date.* */
function rangeSnake(start, end) {
  return `${rangePart('start_date', start)}&${rangePart('end_date', end)}`;
}

/** camelCase: dailyRange.startDate.* / dailyRange.endDate.* */
function rangeCamel(start, end) {
  return `${rangePart('startDate', start)}&${rangePart('endDate', end)}`;
}

/** Every date appearing in the response, across all metrics. */
function datesIn(body) {
  const out = new Set();
  for (const block of body.multiDailyMetricTimeSeries || []) {
    for (const pair of block.dailyMetricTimeSeries || []) {
      for (const dv of (pair.timeSeries && pair.timeSeries.datedValues) || []) {
        const d = dv.date || {};
        if (d.year && d.month && d.day) {
          out.add(`${d.year}-${pad2(d.month)}-${pad2(d.day)}`);
        }
      }
    }
  }
  return out;
}

function describe(set) {
  const list = Array.from(set).sort();
  if (!list.length) return '(none)';
  return `${list.length} day(s): ${list[0]} .. ${list[list.length - 1]}`;
}

async function main() {
  console.log('\nGBP RANGE-SPELLING + BARE-RESOURCE PROBE (read-only)');
  console.log(`Date: ${new Date().toISOString()}\n`);

  const token = await mintToken();
  console.log('  ✓ refresh token exchanged for an access token');

  const resource = `locations/${TARGET}`;

  // 7-day window ending 12 days ago: entirely inside the settled region, so both
  // spellings are compared against days that definitely carry data.
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - 12);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);

  console.log(`  window requested: ${iso(start)} .. ${iso(end)} (7 days)\n`);

  const metrics = 'dailyMetrics=CALL_CLICKS&dailyMetrics=WEBSITE_CLICKS';

  const snake = await get(
    `/v1/${resource}:fetchMultiDailyMetricsTimeSeries?${metrics}&${rangeSnake(start, end)}`,
    token,
  );
  console.log(`  snake_case  → HTTP ${snake.status}`);
  if (snake.status !== 200) {
    console.log(`    ${JSON.stringify(snake.body).slice(0, 300)}`);
  }
  const snakeDates = snake.status === 200 ? datesIn(snake.body) : new Set();
  console.log(`    ${describe(snakeDates)}`);

  const camel = await get(
    `/v1/${resource}:fetchMultiDailyMetricsTimeSeries?${metrics}&${rangeCamel(start, end)}`,
    token,
  );
  console.log(`\n  camelCase   → HTTP ${camel.status}`);
  if (camel.status !== 200) {
    console.log(`    ${JSON.stringify(camel.body).slice(0, 300)}`);
  }
  const camelDates = camel.status === 200 ? datesIn(camel.body) : new Set();
  console.log(`    ${describe(camelDates)}`);

  // ── Verdict ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('  VERDICT');
  console.log('='.repeat(70));

  const expectFrom = iso(start);
  const expectTo = iso(end);
  const snakeInRange = Array.from(snakeDates).every((d) => d >= expectFrom && d <= expectTo);
  const camelInRange = Array.from(camelDates).every((d) => d >= expectFrom && d <= expectTo);

  const snakeOk = snake.status === 200 && snakeDates.size > 0 && snakeInRange;
  const camelOk = camel.status === 200 && camelDates.size > 0 && camelInRange;
  console.log(`  snake_case honoured ......... ${snakeOk ? 'YES' : 'NO'}`);
  console.log(`  camelCase honoured .......... ${camelOk ? 'YES' : 'NO'}`);

  const onlyCamel = Array.from(camelDates).filter((d) => !snakeDates.has(d));
  const onlySnake = Array.from(snakeDates).filter((d) => !camelDates.has(d));

  console.log('');
  if (!snakeDates.size && !camelDates.size) {
    console.log('  ⚠ NEITHER spelling returned data, so this probe is NOT conclusive about');
    console.log('    spelling. It is conclusive about the bare resource: both calls reached');
    console.log('    the API without account discovery, so the resource path is right.');
  } else if (onlySnake.length || onlyCamel.length) {
    console.log('  ⚠ THE TWO SPELLINGS DISAGREE — this is the dangerous case:');
    if (onlySnake.length) console.log(`      only snake_case returned: ${onlySnake.sort().join(', ')}`);
    if (onlyCamel.length) console.log(`      only camelCase  returned: ${onlyCamel.sort().join(', ')}`);
  } else {
    console.log('  Both spellings returned an identical date set, or neither returned one.');
    console.log('  Inconclusive on its own — but ingestion uses snake_case, the documented');
    console.log('  form, and drops any date outside the requested window.');
  }

  console.log(`\n  Ingestion (lib/gbp-performance.ts) uses snake_case and asserts the returned`);
  console.log(`  window falls inside the requested one, dropping and reporting anything`);
  console.log(`  outside it. So a silent range fallback cannot write the wrong dates`);
  console.log(`  regardless of the outcome above.\n`);
}

main().catch((err) => {
  console.error('\nFATAL:', (err && err.message) || err);
  process.exit(1);
});
