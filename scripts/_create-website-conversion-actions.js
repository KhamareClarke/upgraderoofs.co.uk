/**
 * scripts/_create-website-conversion-actions.js
 *
 * Recreate the two browser-side (WEBPAGE) conversion actions the website fires:
 *   1. Submit lead form   — category SUBMIT_LEAD_FORM, ONE_PER_CLICK
 *   2. Phone/WhatsApp tap — category CONTACT,         MANY_PER_CLICK
 *
 * Both were REMOVED in the account (ids 7693225904 / 7711193492), and the site's
 * NEXT_PUBLIC_GADS_CONV_ID / NEXT_PUBLIC_GADS_CLICK_CONV_ID still name them. A
 * REMOVED action cannot be re-enabled, so the only fix is a new action with a new
 * id and a new label.
 *
 * SAFETY: the mutate is only ever sent with `validateOnly: true` unless the
 * script is run with `--apply`. validateOnly performs the full server-side
 * validation — permissions, developer-token level, field values — and writes
 * nothing. So the dry run answers "can these credentials write?" definitively,
 * at zero risk.
 *
 *   node scripts/_create-website-conversion-actions.js            # dry run
 *   node scripts/_create-website-conversion-actions.js --apply    # writes
 *
 * primary_for_goal is deliberately FALSE (secondary / observation-only). These
 * actions have never recorded a conversion, and this account has spent real
 * money, so they must not become a Smart Bidding target until they are seen to
 * fire. Flip to primary in the UI once the data is trustworthy.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { google } = require('googleapis');
const https = require('https');

const API_VERSION = 'v22';
const HOST = 'googleads.googleapis.com';
const APPLY = process.argv.includes('--apply');

const {
  GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_LOGIN_CUSTOMER_ID,
} = process.env;

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

function errLines(body) {
  const errs = (body && body.error && body.error.details
    ? body.error.details.flatMap((d) => d.errors || [])
    : []) || [];
  if (!errs.length) return [body && body.error ? body.error.message : JSON.stringify(body)];
  return errs.map((e) => {
    const code = e.errorCode ? Object.entries(e.errorCode).map(([k, v]) => `${k}=${v}`).join(',') : '';
    const loc = e.location ? ` @${(e.location.fieldPathElements || []).map((f) => f.fieldName).join('.')}` : '';
    return `${e.message}${code ? `  [${code}]` : ''}${loc}`;
  });
}

const OPERATIONS = [
  {
    create: {
      // NOT "Submit lead form" — that name is still held by the REMOVED action
      // id=7693225904, and Google Ads enforces unique names account-wide
      // regardless of status. "(Website)" mirrors the "(Offline)" convention
      // already used by the two live UPLOAD_CLICKS actions.
      name: 'Submit lead form (Website)',
      type: 'WEBPAGE',
      category: 'SUBMIT_LEAD_FORM',
      status: 'ENABLED',
      countingType: 'ONE_PER_CLICK',
      valueSettings: { defaultValue: 0, alwaysUseDefaultValue: false },
      primaryForGoal: false,
    },
  },
  {
    create: {
      name: 'Phone/WhatsApp Click (Website)',
      type: 'WEBPAGE',
      category: 'CONTACT',
      status: 'ENABLED',
      countingType: 'MANY_PER_CLICK',
      valueSettings: { defaultValue: 0, alwaysUseDefaultValue: false },
      primaryForGoal: false,
    },
  },
];

async function listActions(headers, customerId, ids) {
  const query = `
    SELECT conversion_action.id, conversion_action.name, conversion_action.status,
           conversion_action.type, conversion_action.category,
           conversion_action.counting_type, conversion_action.primary_for_goal,
           conversion_action.tag_snippets
    FROM conversion_action
    WHERE conversion_action.id IN (${ids.join(',')})`;
  const res = await post(`/${API_VERSION}/customers/${customerId}/googleAds:searchStream`, headers, { query });
  if (res.status !== 200) return { error: errLines(res.body).join(' | ') };
  return {
    rows: (Array.isArray(res.body) ? res.body : [res.body]).flatMap((b) => b.results || []).map((r) => r.conversionAction),
  };
}

(async () => {
  const customerId = (GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
  if (!customerId) throw new Error('GOOGLE_ADS_CUSTOMER_ID not set in .env.local');

  const oauth2 = new google.auth.OAuth2(GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GOOGLE_ADS_REFRESH_TOKEN });
  const { token } = await oauth2.getAccessToken();

  const headers = { Authorization: `Bearer ${token}`, 'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN };
  if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');
  }

  console.log(`\nCustomer ${customerId}  |  API ${API_VERSION}  |  mode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN (validateOnly)'}`);
  console.log(`primary_for_goal: false (secondary / observation-only)\n`);
  console.log('Proposed conversion actions:');
  for (const op of OPERATIONS) {
    const c = op.create;
    console.log(`  • "${c.name}"  type=${c.type} category=${c.category} counting=${c.countingType} status=${c.status}`);
  }

  // ── 1. validateOnly — full server-side validation, writes nothing ──────────
  console.log('\n[1/2] validateOnly mutate …');
  const dry = await post(`/${API_VERSION}/customers/${customerId}/conversionActions:mutate`, headers, {
    validateOnly: true,
    operations: OPERATIONS,
  });
  if (dry.status !== 200) {
    console.error(`  ✘ HTTP ${dry.status}`);
    errLines(dry.body).forEach((l) => console.error(`    ${l}`));
    process.exit(1);
  }
  console.log('  ✔ ACCEPTED — credentials can write and the payload is valid. Nothing was created.');

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to create them.\n');
    return;
  }

  // ── 2. The real mutate ─────────────────────────────────────────────────────
  console.log('\n[2/2] Applying …');
  const res = await post(`/${API_VERSION}/customers/${customerId}/conversionActions:mutate`, headers, {
    operations: OPERATIONS,
  });
  if (res.status !== 200) {
    console.error(`  ✘ HTTP ${res.status}`);
    errLines(res.body).forEach((l) => console.error(`    ${l}`));
    process.exit(1);
  }

  const created = (res.body.results || []).map((r) => r.resourceName);
  console.log('  ✔ Created:');
  created.forEach((r) => console.log(`      ${r}`));

  const ids = created.map((r) => r.split('/').pop());
  const look = await listActions(headers, customerId, ids);
  if (look.error) {
    console.log(`  (could not re-read: ${look.error})`);
    return;
  }
  console.log('\n── Resulting conversion actions ──────────────────────');
  for (const a of look.rows || []) {
    console.log(`  id=${a.id}  ${a.status}  ${a.type}  category=${a.category}  counting=${a.countingType}  primaryForGoal=${a.primaryForGoal}`);
    console.log(`    name: ${a.name}`);
    for (const s of a.tagSnippets || []) {
      console.log(`    tag : ${typeof s === 'string' ? s : JSON.stringify(s)}`);
    }
  }
  console.log('');
})().catch((err) => {
  console.error('\nFATAL:', err.message || err);
  process.exit(1);
});
