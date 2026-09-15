/**
 * scripts/probe-gbp-auth.js — compare BOTH GBP credential paths (READ-ONLY).
 *
 * Path A: service account (GOOGLE_APPLICATION_CREDENTIALS) — what /api/gbp uses.
 * Path B: OAuth refresh token (GBP_CLIENT_ID/SECRET/REFRESH_TOKEN) — commented
 *         out in .env.local, but may belong to an account that IS a Manager.
 *
 * For each: list accounts (type + verification), then attempt the target
 * location directly, then the Performance API.
 */
const path = require('path'); const fs = require('fs');
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath, quiet: true });
const { google } = require('googleapis');

// The live location. Also probed: DEAD_LOCATION — a truncated variant an earlier
// audit pass mistook for canonical. It 404s, which is why the "wrong id" failure
// and the "service account has no Manager grant" failure look identical.
const TARGET_LOCATION = '17098915606572808840';
const DEAD_LOCATION = '17098906572808840';
const SCOPE = 'https://www.googleapis.com/auth/business.manage';

const rule = (t) => { console.log('\n' + '═'.repeat(78)); console.log('  ' + t); console.log('═'.repeat(78)); };
const sub = (t) => { console.log('\n  ── ' + t); };

async function getToken(label, makeClient) {
  try {
    const client = await makeClient();
    const { token } = await client.getAccessToken();
    if (!token) { console.log(`  [${label}] FAIL: no token`); return null; }
    console.log(`  [${label}] OK: token acquired`);
    return token;
  } catch (e) {
    console.log(`  [${label}] FAIL: ${e.message}`);
    return null;
  }
}

async function api(token, host, p) {
  const res = await fetch(`https://${host}${p}`, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: res.status, body };
}

async function runPath(label, token) {
  if (!token) return;

  sub(`${label}: GET /v1/accounts`);
  const accts = await api(token, 'mybusinessaccountmanagement.googleapis.com', '/v1/accounts');
  console.log(`    HTTP ${accts.status}`);
  if (accts.status === 200) {
    const list = accts.body.accounts || [];
    if (!list.length) console.log('    (accounts array EMPTY — no accounts visible to this identity)');
    list.forEach((a) => {
      console.log(`    • ${a.name}`);
      console.log(`        accountName=${a.accountName}`);
      console.log(`        type=${a.type}  role=${a.role || '-'}  verification=${a.verificationState}  vetted=${a.vettedState}`);
    });
  } else {
    console.log('    ' + JSON.stringify(accts.body).slice(0, 400));
  }

  // Locations per account
  if (accts.status === 200) {
    for (const a of accts.body.accounts || []) {
      const loc = await api(token, 'mybusinessbusinessinformation.googleapis.com', `/v1/${a.name}/locations?readMask=name,title,storefrontAddress&pageSize=100`);
      console.log(`    locations for ${a.name} -> HTTP ${loc.status}  count=${(loc.body.locations || []).length}`);
      if (loc.status !== 200) console.log('      ' + JSON.stringify(loc.body).slice(0, 250));
      (loc.body.locations || []).forEach((l) => console.log(`      - ${l.name}  ${l.title || ''}`));
    }
  }

  sub(`${label}: direct location GET /v1/locations/${TARGET_LOCATION}`);
  const direct = await api(token, 'mybusinessbusinessinformation.googleapis.com', `/v1/locations/${TARGET_LOCATION}?readMask=name,title,phoneNumbers,metadata`);
  console.log(`    HTTP ${direct.status}`);
  console.log('    ' + JSON.stringify(direct.body).slice(0, 400));

  sub(`${label}: control — /v1/locations/${DEAD_LOCATION} (known 404)`);
  const dead = await api(token, 'mybusinessbusinessinformation.googleapis.com', `/v1/locations/${DEAD_LOCATION}?readMask=name,title`);
  console.log(`    HTTP ${dead.status}`);
  console.log('    ' + JSON.stringify(dead.body).slice(0, 200));

  sub(`${label}: Performance API CALL_CLICKS on locations/${TARGET_LOCATION}`);
  const s = new Date(Date.now() - 30 * 864e5), e = new Date();
  const perf = await api(token, 'businessprofileperformance.googleapis.com',
    `/v1/locations/${TARGET_LOCATION}:fetchMultiDailyMetricsTimeSeries` +
    `?dailyMetrics=CALL_CLICKS&dailyMetrics=WEBSITE_CLICKS` +
    `&dailyRange.start_date.year=${s.getUTCFullYear()}&dailyRange.start_date.month=${s.getUTCMonth() + 1}&dailyRange.start_date.day=${s.getUTCDate()}` +
    `&dailyRange.end_date.year=${e.getUTCFullYear()}&dailyRange.end_date.month=${e.getUTCMonth() + 1}&dailyRange.end_date.day=${e.getUTCDate()}`);
  console.log(`    HTTP ${perf.status}`);
  console.log('    ' + JSON.stringify(perf.body).slice(0, 500));
}

(async () => {
  rule('GBP AUTH PATH COMPARISON — ' + new Date().toISOString());
  console.log(`  target location: locations/${TARGET_LOCATION}`);
  console.log(`  scope: ${SCOPE}`);

  rule('PATH A — SERVICE ACCOUNT (GOOGLE_APPLICATION_CREDENTIALS)');
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-service-account.json';
  let saEmail = '?';
  try { saEmail = JSON.parse(fs.readFileSync(keyFile, 'utf8')).client_email; } catch {}
  console.log(`  identity: ${saEmail}`);
  const tokenA = await getToken('service-account', async () =>
    (await new google.auth.GoogleAuth({ keyFile, scopes: [SCOPE] }).getClient()));
  await runPath('service-account', tokenA);

  rule('PATH B — OAUTH REFRESH TOKEN (GBP_CLIENT_ID / GBP_CLIENT_SECRET / GBP_REFRESH_TOKEN)');
  const { GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN } = process.env;
  if (!GBP_CLIENT_ID || !GBP_CLIENT_SECRET || !GBP_REFRESH_TOKEN) {
    console.log('  env NOT SET — these three vars are commented out in .env.local.');
    console.log('  Nothing to test on this path.');
  } else {
    const tokenB = await getToken('oauth', async () => {
      const o = new google.auth.OAuth2(GBP_CLIENT_ID, GBP_CLIENT_SECRET);
      o.setCredentials({ refresh_token: GBP_REFRESH_TOKEN });
      return o;
    });
    await runPath('oauth', tokenB);
  }
  console.log('');
})().catch((e) => console.error('FATAL', e));
