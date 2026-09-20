/**
 * scripts/reconcile-conversions.js
 *
 * One-off reconciliation of the LIVE Google Ads conversion actions for the
 * spending account (GOOGLE_ADS_CUSTOMER_ID) against the conversion IDs wired
 * into the site via .env.local (NEXT_PUBLIC_GADS_CONV_ID / _CLICK_CONV_ID /
 * _CALL_CONV_ID) and the hardcoded fallbacks in components/Analytics.tsx +
 * lib/tracking.ts.
 *
 * Emits each conversion action's AW-<id> container so it can be compared
 * directly against the configured values. Secrets are never printed.
 *
 * Labels are read from conversion_action.tag_snippets.event_snippet, which is
 * the only place the API exposes them. Two things depend on that:
 *
 *   · A configured target is `AW-<id>/<label>`, but `liveIds` holds bare
 *     `AW-<id>` values — so a naive membership test reports every labelled
 *     target as "NOT in account". The account half is checked against the ids
 *     and the label half against the snippets.
 *   · For _CALL_CONV_ID especially, "is the account right" is not the whole
 *     question: a label from a different action in the SAME account is just as
 *     silently broken. Without the snippet comparison this script would report
 *     green for a call conversion that can never record anything.
 *
 * Run:  node scripts/reconcile-conversions.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { google } = require('googleapis');
const https = require('https');

const API_VERSION = 'v22';
const HOST = 'googleads.googleapis.com';

async function main() {
  const {
    GOOGLE_ADS_CUSTOMER_ID,
    GOOGLE_ADS_DEVELOPER_TOKEN,
    GOOGLE_ADS_CLIENT_ID,
    GOOGLE_ADS_CLIENT_SECRET,
    GOOGLE_ADS_REFRESH_TOKEN,
    GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  } = process.env;

  const missing = ['GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error('Missing env: ' + missing.join(', '));
    process.exit(2);
  }

  const customerId = GOOGLE_ADS_CUSTOMER_ID.replace(/\D/g, '');

  const oauth2 = new google.auth.OAuth2(GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GOOGLE_ADS_REFRESH_TOKEN });
  const { token: accessToken } = await oauth2.getAccessToken();

  const headers = { Authorization: 'Bearer ' + accessToken, 'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN };
  if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');

  const body = JSON.stringify({
    query: `SELECT conversion_action.resource_name, conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category, conversion_action.tag_snippets FROM conversion_action`,
  });

  const result = await new Promise((resolve) => {
    const req = https.request({
      host: HOST,
      path: `/${API_VERSION}/customers/${customerId}/googleAds:searchStream`,
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => {
        let b; try { b = JSON.parse(d); } catch { b = { raw: d }; }
        resolve({ status: res.statusCode, body: b });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: { raw: String(e.message || e) } }));
    req.write(body); req.end();
  });

  if (result.status !== 200) {
    console.error('HTTP ' + result.status);
    console.error(JSON.stringify(result.body, null, 2));
    process.exit(1);
  }

  const rows = (Array.isArray(result.body) ? result.body : [result.body])
    .flatMap((b) => b.results || [])
    .map((r) => r.conversionAction || {});

  const accountId = GOOGLE_ADS_CUSTOMER_ID.replace(/\D/g, '');
  console.log('Customer (spending) account: ' + accountId);
  console.log('Login (manager/MCC) account : ' + (GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/\D/g, '') + '\n');

  console.log('LIVE conversion actions (account ' + accountId + '):');
  console.log('-'.repeat(100));
  for (const ca of rows) {
    const aw = ca.id ? 'AW-' + ca.id : '<no id>';
    console.log(
      (aw + '                    ').slice(0, 18) +
      ' | ' + (ca.status || '?') +
      ' | ' + (ca.type || '?') +
      ' | ' + (ca.category || '?') +
      ' | ' + (ca.name || '?')
    );
  }
  console.log('-'.repeat(100));

  const liveIds = new Set(rows.filter((c) => c.id).map((c) => 'AW-' + c.id));

  // Every label the account actually publishes, harvested from the tag
  // snippets. These snippets are generated per-action, so the label found here
  // is the one Google itself would hand out — not a transcription.
  const liveLabels = new Map(); // 'AW-<id>/<label>' -> action name
  for (const ca of rows) {
    if (!ca.id) continue;
    for (const snippet of ca.tagSnippets || []) {
      // e.g. {'send_to': 'AW-17763560213/eU-fCJyQkPkcEJXWqZZC'}
      // BOTH fields, joined — not `||`. `globalSiteTag` is always non-empty (it
      // is the bare `gtag('config', 'AW-…')` loader) and carries NO label; the
      // label appears only in `eventSnippet`. Taking the first truthy field
      // meant this never found a single label, which then made every labelled
      // target look like it belonged to no action in the account.
      const text = [snippet.globalSiteTag, snippet.eventSnippet].filter(Boolean).join('\n');
      for (const m of text.matchAll(/AW-\d+\/[\w-]+/g)) {
        liveLabels.set(m[0], ca.name || '?');
      }
    }
  }

  // Configured values (presence only — values themselves ARE the info we want,
  // these are conversion-action IDs, not secrets).
  const configured = [
    ['NEXT_PUBLIC_GADS_CONV_ID       (lead form)', process.env.NEXT_PUBLIC_GADS_CONV_ID],
    ['NEXT_PUBLIC_GADS_CLICK_CONV_ID (phone/WA tap)', process.env.NEXT_PUBLIC_GADS_CLICK_CONV_ID],
    ['NEXT_PUBLIC_GADS_CALL_CONV_ID  (completed call)', process.env.NEXT_PUBLIC_GADS_CALL_CONV_ID],
    ['NEXT_PUBLIC_GADS_ID            (remarketing)', process.env.NEXT_PUBLIC_GADS_ID],
  ];

  console.log('\nConfigured vs LIVE:');
  for (const [label, raw] of configured) {
    const val = raw && raw.trim();
    if (!val) {
      console.log('  ' + label + ' : <unset>');
      continue;
    }
    // A labelled target must match the label Google publishes, not merely the
    // account. A bare account id can only be checked for existence.
    const verdict = liveLabels.has(val)
      ? '   ✔ LIVE (label matches "' + liveLabels.get(val) + '")'
      : liveIds.has(val)
        ? '   ✔ LIVE'
        : liveIds.has(val.split('/')[0])
          ? '   ✖ account exists, but that label does NOT belong to any action — records NOTHING'
          : '   ✖ NOT in account';
    console.log('  ' + label + ' : ' + val + verdict);
  }

  console.log('\nLabels published by this account (from tag_snippets):');
  if (liveLabels.size === 0) {
    console.log('  (none returned — the token may lack access to snippet generation)');
  }
  for (const [target, name] of liveLabels) {
    console.log('  ' + target + '   ' + name);
  }

  // Hardcoded ids found in components/Analytics.tsx / lib/tracking.ts.
  //
  // Two things made the first version of this section actively misleading and
  // both are fixed here. It reported a REMOVED action as "✔ LIVE" — the id
  // exists, but a removed action can never record anything, so the check was
  // green for exactly the failure it was meant to catch. And it treated a bare
  // `AW-17763560213` as a missing conversion action, when that value is the
  // account's conversion ID — the container in `gtag('config', …)`, which is
  // never itself an action id.
  const statusById = new Map(rows.filter((c) => c.id).map((c) => ['AW-' + c.id, c.status || '?']));
  const containers = ['AW-17763560213', 'AW-8479028400'];
  console.log('\nHardcoded ids (Analytics.tsx / tracking.ts):');
  for (const f of ['AW-7693225904', 'AW-17763560213', 'AW-8479028400']) {
    if (containers.includes(f)) {
      console.log('  ' + f + '   · conversion-id container (not a conversion action) — expected');
      continue;
    }
    const status = statusById.get(f);
    console.log(
      '  ' + f + '   ' +
        (status === 'ENABLED'
          ? '✔ ENABLED'
          : status
            ? `✖ ${status} — an action in this state records nothing`
            : '✖ not a conversion action in this account'),
    );
  }
  // The container the site actually loads the Google tag for. If a label's
  // account half is not this, the label belongs to a different tag and nothing
  // will record.
  console.log('\n  ⓘ every label above must start with the container the site loads.');
}

main().catch((e) => { console.error(e); process.exit(1); });
