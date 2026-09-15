/**
 * scripts/audit-change-history.js
 *
 * Change-history audit for the Upgrade Roofs Google Ads account
 * (customer 8479028400), API v22 — the API equivalent of
 * Tools & Settings > Change History in the UI.
 *
 * Lists every change_event since a given date (default: 2026-08-01,
 * i.e. "since Saturday"), with timestamp, user email, resource type,
 * operation, and the changed fields.
 *
 * Run:  node scripts/audit-change-history.js [YYYY-MM-DD]
 *
 * ⚠ KNOWN BREAKAGE — as written this script cannot return rows. Every claim
 * below was verified against the live API (v22, 2026-09-16), not inferred.
 * The query further down is rejected before any rows are considered:
 *
 *     WHERE change_event.change_date_time >= '2026-08-01 00:00:00'
 *     → HTTP 400  changeEventError=CHANGE_DATE_RANGE_INFINITE
 *       "missing filters on change_event.change_date_time or is filtering on
 *        change_event.change_date_time with an infinite range"
 *
 * Two independent causes, both confirmed by probe:
 *
 *   1. change_event requires a BOUNDED window. `>=` is an open ("infinite")
 *      range and is rejected; so is omitting the filter entirely. Only
 *      `DURING LAST_7_DAYS` and `DURING LAST_14_DAYS` are accepted —
 *      `DURING LAST_30_DAYS` fails with changeEventError=START_DATE_TOO_OLD.
 *   2. Even on an accepted window, change_event returns ZERO rows for this
 *      account (LAST_7_DAYS → 0, LAST_14_DAYS → 0). It carries no history
 *      here, so no choice of fields can make this script produce output.
 *
 * change_status is the resource that DOES have data (73 rows in LAST_14_DAYS).
 * Rebuilding on it means knowing these:
 *
 *   - The date field is `change_status.last_change_date_time`. The obvious
 *     `change_status.change_date_time` does not exist → UNRECOGNIZED_FIELD.
 *   - The bounded-window rule above applies here too.
 *   - There is NO `change_status.conversion_action` pointer
 *     (→ UNRECOGNIZED_FIELD), so a change cannot be attributed to a conversion
 *     action by field at all. The changed resource is identifiable only from the
 *     numeric segments of change_status.resource_name — and note that
 *     resource_name names the changeStatus resource, NOT the changed resource,
 *     so ids must not be matched against it directly.
 *   - `change_event.change_resource_type = 'CONVERSION_ACTION'` is not merely
 *     empty, it is invalid: queryError=BAD_ENUM_CONSTANT — that value is not in
 *     ChangeEventResourceType.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { google } = require('googleapis');
const https = require('https');

const API_VERSION = 'v22';
const CUSTOMER_ID = (process.env.GOOGLE_ADS_CUSTOMER_ID || '8479028400').replace(/\D/g, '');
const SINCE = process.argv[2] || '2026-08-01';

function post(path, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj);
    const req = https.request(
      { host: 'googleads.googleapis.com', path, method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      res => { let d = ''; res.on('data', c => (d += c)); res.on('end', () => {
        let p; try { p = JSON.parse(d); } catch { p = { raw: d }; }
        resolve({ status: res.statusCode, body: p });
      }); }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(74));
  console.log(`  CHANGE HISTORY — customer ${CUSTOMER_ID} — since ${SINCE}`);
  console.log('='.repeat(74));

  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_ADS_CLIENT_ID, process.env.GOOGLE_ADS_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN });
  const { token } = await oauth2.getAccessToken();
  const headers = { Authorization: `Bearer ${token}`, 'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN };
  if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');
  }

  async function gaql(query) {
    const res = await post(`/${API_VERSION}/customers/${CUSTOMER_ID}/googleAds:searchStream`, headers, { query });
    if (res.status !== 200) {
      const errs = (res.body && res.body.error && res.body.error.details &&
        res.body.error.details.flatMap(d => d.errors || [])) || [];
      const msg = errs.length ? errs.map(e => e.message).join(' | ')
        : (res.body && res.body.error && res.body.error.message) || JSON.stringify(res.body);
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }
    return (Array.isArray(res.body) ? res.body : [res.body]).flatMap(b => b.results || []);
  }

  const rows = await gaql(`
    SELECT change_event.change_date_time,
           change_event.user_email,
           change_event.client_type,
           change_event.change_resource_type,
           change_event.resource_change_operation,
           change_event.changed_fields,
           change_event.campaign,
           change_event.ad_group,
           change_event.old_resource,
           change_event.new_resource
    FROM change_event
    WHERE change_event.change_date_time >= '${SINCE} 00:00:00'
    ORDER BY change_event.change_date_time DESC
    LIMIT 200`);

  if (!rows.length) {
    console.log(`\nNo changes recorded since ${SINCE}.`);
    return;
  }

  console.log(`\n${rows.length} change(s) found:\n`);
  for (const r of rows) {
    const e = r.changeEvent;
    const fields = (e.changedFields && e.changedFields.paths) || [];
    console.log(`${e.changeDateTime}  ${e.userEmail || '(unknown user)'}  [${e.clientType || '?'}]`);
    console.log(`  ${e.resourceChangeOperation} ${e.changeResourceType}`);
    if (r.campaign) console.log(`  campaign: ${r.campaign.resourceName}`);
    if (r.adGroup) console.log(`  ad group: ${r.adGroup.resourceName}`);
    if (fields.length) console.log(`  fields: ${fields.join(', ')}`);
    console.log('');
  }
}

main().catch(err => { console.error('\nFATAL:', err.message || err); process.exit(1); });
