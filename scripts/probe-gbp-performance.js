/**
 * scripts/probe-gbp-performance.js
 *
 * READ-ONLY probe of the Google Business Profile **Performance API**
 * (businessprofileperformance.googleapis.com) for the Upgrade Roofs location.
 *
 * This script exists to answer three questions with evidence rather than docs:
 *
 *   1. Is the Performance API reachable with the credentials we already have?
 *      Two credential paths are tried independently:
 *        (a) the GBP OAuth refresh token  (GBP_CLIENT_ID/SECRET/REFRESH_TOKEN)
 *        (b) the service-account key      (GOOGLE_APPLICATION_CREDENTIALS)
 *      This settles whether the service account used by app/api/gbp/route.ts can
 *      pull Insights, or whether Insights strictly needs the OAuth user token.
 *
 *   2. Which of calls / direction requests / website clicks / messages actually
 *      return data for this location?
 *
 *   3. How stale is the data in practice? We pull a wide trailing window and
 *      report the most recent date that carries a non-zero value, which is the
 *      empirical lag for THIS location (docs only give a range).
 *
 * It performs GETs only. No writes, no schema changes, no deployment.
 *
 * Run:  node scripts/probe-gbp-performance.js
 */

require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env.local'),
  quiet: true,
});
const { google } = require('googleapis');
const https = require('https');
const fs = require('fs');
const path = require('path');

const INFO_HOST = 'mybusinessbusinessinformation.googleapis.com';
const ACCT_HOST = 'mybusinessaccountmanagement.googleapis.com';
const PERF_HOST = 'businessprofileperformance.googleapis.com';

/** Marcus's listing — the 20-digit id is the live one (the 17-digit variant 404s). */
const TARGET_LOCATION_ID = '17098915606572808840';

/** Conversion-shaped metrics: the ones that represent an actual customer action. */
const CONVERSION_METRICS = [
  'CALL_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'WEBSITE_CLICKS',
  'BUSINESS_CONVERSATIONS',
  'BUSINESS_BOOKINGS',
];

/** Impression metrics: separate call, purely to compare volume against actions. */
const IMPRESSION_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
];

/** How far back to pull. Wide on purpose: the tail reveals the real lag. */
const LOOKBACK_DAYS = 90;

function banner(t) {
  console.log('\n' + '='.repeat(78));
  console.log('  ' + t);
  console.log('='.repeat(78));
}

function get(host, pathAndQuery, accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host,
        path: pathAndQuery,
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          let b;
          try {
            b = JSON.parse(d);
          } catch {
            b = { raw: d.slice(0, 500) };
          }
          resolve({ status: res.statusCode, body: b });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

/** Compact error string for grep-able logs. */
function errOf(res) {
  const e = res.body && res.body.error;
  if (!e) return JSON.stringify(res.body).slice(0, 300);
  return `HTTP ${res.status} ${e.status || ''} ${e.message || ''}` +
    (e.details ? ` :: ${JSON.stringify(e.details).slice(0, 300)}` : '');
}

/** Build the dailyRange query fragment for [start, end] inclusive. */
function rangeQuery(startDate, endDate) {
  const p = (d, label) =>
    `dailyRange.${label}.year=${d.getUTCFullYear()}` +
    `&dailyRange.${label}.month=${d.getUTCMonth() + 1}` +
    `&dailyRange.${label}.day=${d.getUTCDate()}`;
  return p(startDate, 'start_date') + '&' + p(endDate, 'end_date');
}

/**
 * Flatten a fetchMultiDailyMetricsTimeSeries response into
 * { METRIC: { date: value } }.
 */
function flatten(resBody) {
  const out = {};
  const series = (resBody && resBody.multiDailyMetricTimeSeries) || [];
  for (const block of series) {
    for (const pair of block.dailyMetricTimeSeries || []) {
      const metric = pair.dailyMetric;
      const byDate = {};
      const dated = (pair.timeSeries && pair.timeSeries.datedValues) || [];
      for (const dv of dated) {
        const d = dv.date || {};
        const key =
          `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
        const v =
          dv.value != null
            ? Number(dv.value)
            : dv.dailyMetricValue != null
              ? Number(dv.dailyMetricValue)
              : 0;
        byDate[key] = (byDate[key] || 0) + v;
      }
      out[metric] = byDate;
    }
  }
  return out;
}

/** Summarise one metric: total, non-zero days, first/last date carrying data. */
function summarise(byDate) {
  const dates = Object.keys(byDate).sort();
  if (!dates.length) return null;
  const total = dates.reduce((s, d) => s + byDate[d], 0);
  const nonZero = dates.filter((d) => byDate[d] > 0);
  return {
    total,
    nonZeroDays: nonZero.length,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
    lastNonZero: nonZero.length ? nonZero[nonZero.length - 1] : null,
  };
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}

/** Resolve accounts/{acct}/locations/{loc} for the target location id. */
async function resolveLocationName(accessToken) {
  const accts = await get(ACCT_HOST, '/v1/accounts', accessToken);
  if (accts.status !== 200) {
    return { error: `accounts.list failed — ${errOf(accts)}`, accounts: [] };
  }
  const accounts = accts.body.accounts || [];
  const seen = [];
  for (const a of accounts) {
    const locs = await get(
      INFO_HOST,
      `/v1/${a.name}/locations?readMask=name,title&pageSize=100`,
      accessToken
    );
    if (locs.status !== 200) {
      seen.push(`${a.name} (locations.list ${locs.status})`);
      continue;
    }
    for (const l of locs.body.locations || []) {
      seen.push(`${l.title} [${l.name}]`);
      if (l.name && l.name.includes(`locations/${TARGET_LOCATION_ID}`)) {
        return { locationName: l.name, title: l.title, accounts, seen };
      }
    }
  }
  return { error: `location ${TARGET_LOCATION_ID} not visible`, accounts, seen };
}

/** Run the two Performance API calls for one credential set. */
async function probePerformance(label, accessToken) {
  banner(`PERFORMANCE API — credential path: ${label}`);

  const loc = await resolveLocationName(accessToken);
  if (loc.error) {
    console.log(`  ✖ Could not resolve location: ${loc.error}`);
    if (loc.seen && loc.seen.length) {
      console.log('    Visible locations:');
      for (const s of loc.seen) console.log(`      - ${s}`);
    }
    return { ok: false, reason: loc.error };
  }
  console.log(`  ✓ Location resolved: ${loc.title}`);
  console.log(`    ${loc.locationName}`);

  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1); // today is never complete
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS);
  const range = rangeQuery(start, end);

  const iso = (d) => d.toISOString().slice(0, 10);
  const results = {};

  for (const [groupName, metrics] of [
    ['CONVERSION METRICS', CONVERSION_METRICS],
    ['IMPRESSION METRICS', IMPRESSION_METRICS],
  ]) {
    const qs =
      metrics.map((m) => `dailyMetrics=${m}`).join('&') + '&' + range;
    const res = await get(
      PERF_HOST,
      `/v1/${loc.locationName}:fetchMultiDailyMetricsTimeSeries?${qs}`,
      accessToken
    );

    console.log(`\n  — ${groupName} —`);
    if (res.status !== 200) {
      console.log(`  ✖ ${errOf(res)}`);
      results[groupName] = { ok: false, error: errOf(res) };
      continue;
    }

    const flat = flatten(res.body);
    results[groupName] = { ok: true, flat };
    console.log(
      `  Window: ${iso(start)} → ${iso(end)} (${LOOKBACK_DAYS}d)   metrics returned: ${Object.keys(flat).length}`
    );
    console.log('');
    console.log('    METRIC                            TOTAL   DAYS  LAST DATA   LAG');
    console.log('    ' + '-'.repeat(72));
    for (const m of metrics) {
      const s = summarise(flat[m] || {});
      if (!s) {
        console.log(`    ${m.padEnd(34)}${'—'.repeat(6)}  (no data returned)`);
        continue;
      }
      const lag = s.lastNonZero ? `${daysBetween(s.lastNonZero, iso(end))}d` : 'n/a';
      console.log(
        `    ${m.padEnd(34)}${String(s.total).padStart(5)}  ${String(s.nonZeroDays).padStart(4)}  ` +
          `${(s.lastNonZero || '—').padEnd(11)} ${lag}`
      );
    }
  }

  // Search keywords: the separate monthly endpoint. Confirms whether the listing
  // has enough query volume to be worth storing at all.
  console.log('\n  — SEARCH KEYWORDS (monthly, separate endpoint) —');
  const endM = new Date(end);
  const startM = new Date(end);
  startM.setUTCMonth(startM.getUTCMonth() - 3);
  const kwQs =
    `monthlyRange.start_month.year=${startM.getUTCFullYear()}` +
    `&monthlyRange.start_month.month=${startM.getUTCMonth() + 1}` +
    `&monthlyRange.end_month.year=${endM.getUTCFullYear()}` +
    `&monthlyRange.end_month.month=${endM.getUTCMonth() + 1}` +
    '&pageSize=20';
  const kw = await get(
    PERF_HOST,
    `/v1/${loc.locationName}/searchkeywords/impressions/monthly?${kwQs}`,
    accessToken
  );
  if (kw.status === 200) {
    const list = kw.body.searchKeywordsCounts || [];
    console.log(`  ✓ ${list.length} keyword-month rows returned`);
    for (const k of list.slice(0, 10)) {
      const m = k.month || {};
      const val = k.insightsValue && k.insightsValue.value != null ? k.insightsValue.value : '—';
      console.log(`      ${(k.searchKeyword || '?').padEnd(34)} ${m.year}-${String(m.month).padStart(2, '0')}  ${val}`);
    }
  } else {
    console.log(`  ✖ ${errOf(kw)}`);
  }

  return { ok: true, results, locationName: loc.locationName };
}

async function main() {
  banner('GBP PERFORMANCE API PROBE (read-only)');
  console.log(`Date: ${new Date().toISOString()}`);

  // --- Path A: OAuth refresh token -----------------------------------------
  const { GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN } = process.env;
  let oauthToken = null;
  if (GBP_CLIENT_ID && GBP_CLIENT_SECRET && GBP_REFRESH_TOKEN) {
    const oauth2 = new google.auth.OAuth2(GBP_CLIENT_ID, GBP_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: GBP_REFRESH_TOKEN });
    try {
      const r = await oauth2.getAccessToken();
      oauthToken = r.token;
      console.log('\n  ✓ OAuth refresh token exchanged for an access token.');
    } catch (e) {
      console.log(`\n  ✖ OAuth token exchange failed: ${e.message}`);
    }
  } else {
    console.log('\n  ○ GBP OAuth vars not set — skipping path A.');
  }

  let oauthResult = null;
  if (oauthToken) {
    oauthResult = await probePerformance('A. OAuth user token (GBP_REFRESH_TOKEN)', oauthToken);
  }

  // --- Path B: service account ---------------------------------------------
  const keyFile =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), 'google-service-account.json');
  let saToken = null;
  let saEmail = null;
  if (fs.existsSync(keyFile)) {
    try {
      saEmail = JSON.parse(fs.readFileSync(keyFile, 'utf8')).client_email;
      const auth = new google.auth.GoogleAuth({
        keyFile,
        scopes: ['https://www.googleapis.com/auth/business.manage'],
      });
      const client = await auth.getClient();
      const t = await client.getAccessToken();
      saToken = t.token;
      console.log(`\n  ✓ Service-account token issued for ${saEmail}`);
    } catch (e) {
      console.log(`\n  ✖ Service-account token failed: ${e.message}`);
    }
  } else {
    console.log(`\n  ○ No service-account key at ${keyFile} — skipping path B.`);
  }

  let saResult = null;
  if (saToken) {
    saResult = await probePerformance('B. Service account (google-service-account.json)', saToken);
  }

  // --- Verdict --------------------------------------------------------------
  banner('VERDICT');
  console.log(`  OAuth user token ............ ${oauthResult && oauthResult.ok ? 'WORKS' : 'FAILED'}`);
  console.log(`  Service account ............. ${saResult && saResult.ok ? 'WORKS' : 'FAILED'}`);
  console.log('');
  console.log('  A FAILED service account above means the Performance API cannot be');
  console.log('  pulled by app/api/gbp/route.ts credentials — Insights needs the OAuth');
  console.log('  refresh-token path, which in turn needs those 3 env vars in Vercel.');
  console.log('');
}

main().catch((err) => {
  console.error('\nFATAL:', err.message || err);
  process.exit(1);
});
