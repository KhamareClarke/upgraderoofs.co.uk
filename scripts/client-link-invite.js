/**
 * scripts/client-link-invite.js
 *
 * Sends a manager (MCC) -> client link invitation through the Google Ads API
 * instead of the UI, and by default does NOT send it.
 *
 * Credentials come from .env.local, the same set every other Ads script here
 * uses. Note which ID plays which part, because getting this backwards is the
 * one way this call silently does the wrong thing:
 *
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID  7317123591  the MANAGER. This is both the
 *                                             customer id in the URL path and
 *                                             the login-customer-id header.
 *   --client                      4765908384  the account being INVITED.
 *
 * That is the whole shape of the API call: authenticating as the manager and
 * creating a CustomerClientLink with status PENDING. The inverse service,
 * CustomerManagerLinkService, is the one the CLIENT uses to accept — it is not
 * used here and cannot be, because we do not have the client's credentials.
 *
 * Three things happen before anything is sent, in order:
 *   1. listAccessibleCustomers  — is the manager reachable with this token
 *   2. customer_client / customer_client_link GAQL — does a link already exist,
 *      in any state, so we do not fire a duplicate invitation at an account that
 *      is already linked or already has one pending
 *   3. the mutate with validateOnly: true — the server checks the operation
 *      without applying it
 *
 * Step 3 is the dry run. It is skipped when --send is passed.
 *
 * Usage:
 *   node scripts/client-link-invite.js                       # dry run (default)
 *   node scripts/client-link-invite.js --client 4765908384   # dry run, explicit
 *   node scripts/client-link-invite.js --send                # actually invites
 *
 * Safe by default: without --send this script makes no writes at all.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { google } = require('googleapis');
const https = require('https');

// Match the rest of the scripts/ directory. Override with GOOGLE_ADS_API_VERSION
// if this one is sunset — the developer token is version-independent, so a
// version bump here needs no other change.
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v22';
const HOST = 'googleads.googleapis.com';

const {
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_LOGIN_CUSTOMER_ID,
} = process.env;

// --- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
const SEND = argv.includes('--send');
const argClient = (() => {
  const i = argv.indexOf('--client');
  return i !== -1 ? argv[i + 1] : undefined;
})();

const managerId = String(GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/\D/g, '');
const clientId = String(argClient || '4765908384').replace(/\D/g, '');

function banner(t) {
  console.log('\n' + '='.repeat(66));
  console.log('  ' + t);
  console.log('='.repeat(66));
}

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
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ host: HOST, path, method: 'GET', headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function adsHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
    'login-customer-id': managerId,
  };
}

/** Flatten the API's nested error envelope into readable lines. */
function explainAdsError(body) {
  const errs = (body && body.error && body.error.details &&
    body.error.details.flatMap((d) => d.errors || [])) || [];
  if (!errs.length && body && body.error) {
    return [`${body.error.status || body.error.code}: ${body.error.message}`];
  }
  return errs.map((e) => {
    const code = e.errorCode ? Object.entries(e.errorCode).map(([k, v]) => `${k}=${v}`).join(',') : '';
    return `${e.message}${code ? `  [${code}]` : ''}`;
  });
}

async function main() {
  banner(SEND ? 'CLIENT LINK INVITATION — LIVE SEND' : 'CLIENT LINK INVITATION — DRY RUN (nothing will be sent)');
  console.log(`API version: ${API_VERSION}`);
  console.log(`Manager (path + login-customer-id): ${managerId}`);
  console.log(`Client to invite:                   ${clientId}`);

  const missing = [
    ['GOOGLE_ADS_DEVELOPER_TOKEN', GOOGLE_ADS_DEVELOPER_TOKEN],
    ['GOOGLE_ADS_CLIENT_ID', GOOGLE_ADS_CLIENT_ID],
    ['GOOGLE_ADS_CLIENT_SECRET', GOOGLE_ADS_CLIENT_SECRET],
    ['GOOGLE_ADS_REFRESH_TOKEN', GOOGLE_ADS_REFRESH_TOKEN],
    ['GOOGLE_ADS_LOGIN_CUSTOMER_ID', GOOGLE_ADS_LOGIN_CUSTOMER_ID],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`\nMissing env vars in .env.local: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (!/^\d{10}$/.test(managerId) || !/^\d{10}$/.test(clientId)) {
    console.error('\nBoth IDs must be 10 digits.');
    process.exit(1);
  }
  if (managerId === clientId) {
    console.error('\nManager and client are the same account — that is never a valid link.');
    process.exit(1);
  }

  const oauth2 = new google.auth.OAuth2(GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GOOGLE_ADS_REFRESH_TOKEN });
  let accessToken;
  try {
    ({ token: accessToken } = await oauth2.getAccessToken());
  } catch (err) {
    console.error(`\nRefresh token exchange failed: ${err.message}`);
    process.exit(1);
  }
  const headers = adsHeaders(accessToken);

  // -- 1. reachability -------------------------------------------------------
  banner('1. Can this token act as the manager?');
  const acc = await get(`/${API_VERSION}/customers:listAccessibleCustomers`, headers);
  if (acc.status !== 200) {
    console.error(`listAccessibleCustomers failed (HTTP ${acc.status}):`);
    explainAdsError(acc.body).forEach((l) => console.error('  ' + l));
    console.error('\n  If this mentions the API version, retry with GOOGLE_ADS_API_VERSION=v23 or v24.');
    process.exit(1);
  }
  const accessible = (acc.body.resourceNames || []).map((r) => r.replace('customers/', ''));
  console.log(`Accessible customers: ${accessible.length}`);
  console.log(`  manager ${managerId}: ${accessible.includes(managerId) ? 'YES' : 'NO  <-- cannot act as this manager'}`);
  console.log(`  client  ${clientId}: ${accessible.includes(clientId) ? 'yes (already reachable)' : 'no (expected — that is what the invite changes)'}`);
  if (!accessible.includes(managerId)) {
    console.error('\nThe Google account behind the refresh token cannot act as that manager. Stopping.');
    process.exit(1);
  }

  async function gaql(query) {
    const res = await post(`/${API_VERSION}/customers/${managerId}/googleAds:searchStream`, headers, { query });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${explainAdsError(res.body).join(' | ')}`);
    return (Array.isArray(res.body) ? res.body : [res.body]).flatMap((b) => b.results || []);
  }

  // -- 2. existing link? -----------------------------------------------------
  banner('2. Does a link to this client already exist?');
  let existing = [];
  try {
    existing = await gaql(
      `SELECT customer_client_link.resource_name, customer_client_link.client_customer,
              customer_client_link.status, customer_client_link.manager_link_id
       FROM customer_client_link
       WHERE customer_client_link.client_customer = 'customers/${clientId}'`
    );
  } catch (err) {
    console.log(`  (link query failed, continuing: ${err.message})`);
  }
  if (!existing.length) {
    console.log('  No existing link in any state. A new invitation is the right call.');
  } else {
    for (const r of existing) {
      const l = r.customerClientLink;
      console.log(`  ${l.resourceName}`);
      console.log(`     status=${l.status}  manager_link_id=${l.managerLinkId}`);
    }
    const active = existing.some((r) => r.customerClientLink.status === 'ACTIVE');
    const pending = existing.some((r) => r.customerClientLink.status === 'PENDING');
    if (active) console.log('\n  ALREADY ACTIVE — sending another invitation would be a no-op or an error.');
    else if (pending) console.log('\n  ALREADY PENDING — an invitation is outstanding. Do not send a second one.');
  }

  // -- 3. validateOnly -------------------------------------------------------
  const operation = {
    create: {
      clientCustomer: `customers/${clientId}`,
      status: 'PENDING',
    },
  };
  const body = SEND ? { operation } : { operation, validateOnly: true };

  banner(SEND ? '3. SENDING (validateOnly omitted)' : '3. Server-side validation (validateOnly: true)');
  console.log('Request:');
  console.log(`  POST /${API_VERSION}/customers/${managerId}/customerClientLinks:mutate`);
  console.log('  ' + JSON.stringify(body));

  const res = await post(`/${API_VERSION}/customers/${managerId}/customerClientLinks:mutate`, headers, body);

  console.log(`\nHTTP ${res.status}`);
  if (res.status !== 200) {
    console.log('Response errors:');
    explainAdsError(res.body).forEach((l) => console.log('  ' + l));
    console.log(JSON.stringify(res.body, null, 2).slice(0, 2000));
    console.log('\nThe operation was REJECTED. Nothing was sent.');
    process.exit(1);
  }

  console.log(JSON.stringify(res.body, null, 2).slice(0, 2000));
  if (SEND) {
    console.log('\n>>> Invitation SENT. The client account now has a PENDING manager link');
    console.log(`>>> and must accept it from customer ${clientId} before the link is ACTIVE.`);
  } else {
    console.log('\n>>> validateOnly returned 200: the server accepted the operation.');
    console.log('>>> NOTHING WAS SENT. Re-run with --send to actually issue the invitation.');
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err.message || err);
  process.exit(1);
});
