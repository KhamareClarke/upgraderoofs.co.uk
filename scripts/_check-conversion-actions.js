/**
 * scripts/_check-conversion-actions.js
 *
 * One-off read-only probe: list EVERY conversion action in the account with its
 * status and type, then say whether the ids the website is configured to send to
 * are still live.
 *
 * This exists because `NEXT_PUBLIC_GADS_CONV_ID` / `NEXT_PUBLIC_GADS_CLICK_CONV_ID`
 * hold bare `AW-<id>` values with no conversion label. A label cannot be guessed
 * — it only exists on a live action — so the only way to produce a correct value
 * is to read the account. This script answers that question directly instead of
 * sending someone into the Google Ads UI to look.
 *
 * Read-only: one GAQL search per run, no mutate operations.
 *
 * Run: node scripts/_check-conversion-actions.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { google } = require('googleapis');
const https = require('https');

const API_VERSION = 'v22';
const HOST = 'googleads.googleapis.com';

const {
  GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_LOGIN_CUSTOMER_ID,
} = process.env;

// The ids the website is actually configured to fire, read from .env.local.
const CONFIGURED = {
  NEXT_PUBLIC_GADS_CONV_ID: process.env.NEXT_PUBLIC_GADS_CONV_ID,
  NEXT_PUBLIC_GADS_CLICK_CONV_ID: process.env.NEXT_PUBLIC_GADS_CLICK_CONV_ID,
  GADS_CONV_SITE_VISIT: process.env.GADS_CONV_SITE_VISIT,
  GADS_CONV_JOB_WON: process.env.GADS_CONV_JOB_WON,
};

function post(path, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj);
    const req = https.request(
      {
        host: HOST,
        path,
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const customerId = (GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
  if (!customerId) throw new Error('GOOGLE_ADS_CUSTOMER_ID not set in .env.local');

  const oauth2 = new google.auth.OAuth2(GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GOOGLE_ADS_REFRESH_TOKEN });
  const { token } = await oauth2.getAccessToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
  };
  if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');
  }

  const query = `
    SELECT
      conversion_action.id,
      conversion_action.name,
      conversion_action.status,
      conversion_action.type,
      conversion_action.category,
      conversion_action.primary_for_goal,
      conversion_action.tag_snippets
    FROM conversion_action
    ORDER BY conversion_action.status, conversion_action.name`;

  const res = await post(`/${API_VERSION}/customers/${customerId}/googleAds:searchStream`, headers, { query });
  if (res.status !== 200) {
    const errs = (res.body?.error?.details || []).flatMap((d) => d.errors || []);
    console.error(`HTTP ${res.status}:`, errs.length ? errs.map((e) => e.message).join(' | ') : res.body?.error?.message || res.body);
    process.exit(1);
  }

  const rows = (Array.isArray(res.body) ? res.body : [res.body])
    .flatMap((b) => b.results || [])
    .map((r) => r.conversionAction);

  console.log(`\nGoogle Ads customer ${customerId} — ${rows.length} conversion action(s)\n`);

  const byId = new Map();
  for (const a of rows) {
    byId.set(String(a.id), a);
    const snippet = (a.tagSnippets || [])[0];
    console.log(
      `  ${String(a.status).padEnd(9)} id=${String(a.id).padEnd(12)} ${String(a.type).padEnd(14)} ${a.name}`,
    );
    if (snippet) console.log(`            tag snippet: ${snippet}`);
  }

  console.log('\n── Website configuration ──────────────────────────────');
  let anyDead = false;
  for (const [key, value] of Object.entries(CONFIGURED)) {
    if (!value) {
      console.log(`  ${key.padEnd(30)} (unset)`);
      continue;
    }
    // `AW-7693225904` and `AW-7693225904/LABEL` both name an action by its id.
    const idPart = String(value).split('/')[1] || String(value).replace(/^AW-/, '');
    const action = byId.get(idPart);
    if (!action) {
      anyDead = true;
      console.log(`  ${key.padEnd(30)} ${value}  ← ✘ NO SUCH CONVERSION ACTION in this account`);
    } else if (action.status !== 'ENABLED') {
      anyDead = true;
      console.log(`  ${key.padEnd(30)} ${value}  ← ✘ ${action.status} ("${action.name}") — will never record`);
    } else {
      console.log(`  ${key.padEnd(30)} ${value}  ← ✔ ENABLED ("${action.name}")`);
    }
  }

  console.log(
    anyDead
      ? '\nA REMOVED conversion action cannot be re-enabled — it must be recreated in the\n' +
        'Google Ads UI, which produces a NEW id and a NEW label. Until then no browser-side\n' +
        'conversion the website fires is recorded, whatever these env vars hold.\n'
      : '\nAll configured conversion targets resolve to ENABLED actions.\n',
  );
})();
