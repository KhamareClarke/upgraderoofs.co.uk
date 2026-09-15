/**
 * scripts/remediate-gbp-ads-alignment.js
 *
 * Corrective remediation: align the Google Ads account with the verified
 * Google Business Profile location so local ads regain their physical map pin
 * and distance extensions, and stop wasting budget on broad (non-geo-limited)
 * targeting.
 *
 *   1. Authenticate via master OAuth tokens + API keys in .env.local:
 *        - Google Business Profile  (GBP_CLIENT_ID / GBP_CLIENT_SECRET /
 *          GBP_REFRESH_TOKEN) — used only to VERIFY the live location exists.
 *        - Google Ads               (GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET /
 *          GOOGLE_ADS_REFRESH_TOKEN / GOOGLE_ADS_DEVELOPER_TOKEN, optional
 *          GOOGLE_ADS_LOGIN_CUSTOMER_ID)
 *
 *   2. Re-link the verified Upgrade Roofs location asset
 *      (locations/17098915606572808840) to the Ads account:
 *        - Location (map pin + distance) extensions are Google-managed and
 *          read-only; a GBP location is linked via a customer-level AssetSet
 *          of type LOCATION_SYNC whose location_set.source is
 *          BUSINESS_PROFILE_LOCATION_SET (carrying the merchant email + a
 *          live GBP access token).
 *        - Attaching that LOCATION_SYNC asset set at the customer level makes
 *          every active campaign inherit the restored map pin + distance
 *          extensions automatically.
 *
 *   3. Apply explicit positive geo-targeting (campaign_criterion, type
 *      LOCATION) to every active campaign for the 10 verified service towns:
 *        Cheshire, Crewe, Macclesfield, Sandbach, Congleton, Nantwich,
 *        Middlewich, Knutsford, Winsford, Northwich.
 *        Each town name is resolved to a geo_target_constant via a lookup
 *        query, then added as a positive (non-negative) location criterion.
 *
 *   4. Print a verified execution report (no secrets — masked/boolean only).
 *
 * SECURITY: .env.local values are NEVER written or printed. Only presence
 * booleans or masked placeholders are emitted.
 *
 * Run:  node scripts/remediate-gbp-ads-alignment.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { google } = require('googleapis');
const https = require('https');
const path = require('path');

const GBP_ACCT_HOST = 'mybusinessaccountmanagement.googleapis.com';
const GBP_INFO_HOST = 'mybusinessbusinessinformation.googleapis.com';
const ADS_HOST = 'googleads.googleapis.com';
const ADS_VERSION = 'v22';

const GBP_LOCATION_RESOURCE = 'locations/17098915606572808840';
const GBP_LOCATION_ID = GBP_LOCATION_RESOURCE.split('/').pop();

const SERVICE_TOWNS = [
  'Cheshire',
  'Crewe',
  'Macclesfield',
  'Sandbach',
  'Congleton',
  'Nantwich',
  'Middlewich',
  'Knutsford',
  'Winsford',
  'Northwich',
];

const COUNTRY_CODE = 'GB';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function banner(t) {
  console.log('\n' + '='.repeat(80));
  console.log('  ' + t);
  console.log('='.repeat(80));
}

// Presence only. This used to return `v.slice(0, 4) + '••••' + v.slice(-2)` and
// is printed below for client_secret / refresh_token / developer_token — i.e. it
// emitted 6 characters of four different credentials while this file's docstring
// claimed "no secrets were printed". A diagnostic only needs to answer "is this
// configured?".
const masked = (v) => (v ? '(set)' : '(unset)');

function httpGet(host, p, headers) {
  return new Promise((resolve) => {
    const r = https.request({ host, path: p, method: 'GET', headers }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => {
        let b; try { b = JSON.parse(d); } catch { b = { raw: d }; }
        resolve({ status: res.statusCode, body: b });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: { raw: String(e.message || e) } }));
    r.end();
  });
}

function httpPost(host, p, headers, bodyObj) {
  return new Promise((resolve) => {
    const body = JSON.stringify(bodyObj || {});
    const r = https.request({ host, path: p, method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => {
        let b; try { b = JSON.parse(d); } catch { b = { raw: d }; }
        resolve({ status: res.statusCode, body: b });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: { raw: String(e.message || e) } }));
    r.write(body); r.end();
  });
}

function flattenAds(res) {
  if (res.status !== 200) return [];
  return (Array.isArray(res.body) ? res.body : [res.body]).flatMap((b) => b.results || []);
}

function adsError(res) {
  const body = res.body || {};
  const details = body.error && body.error.details ? body.error.details : [];
  const msgs = details.flatMap((d) => (d.errors || [])).map((e) => e.message);
  return msgs.join(' | ') || (body.error && body.error.message) || JSON.stringify(body).slice(0, 300);
}

// ---------------------------------------------------------------------------
// 1. GBP + Ads authentication
// ---------------------------------------------------------------------------

async function authenticate() {
  const env = process.env;

  const report = {
    gbp: { configured: false, authenticated: false, locationVerified: false },
    ads: { configured: false, authenticated: false, customerId: null, loginCustomerId: null },
    warnings: [],
  };

  // -- GBP --
  const gbpOk = ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN'].every((k) => env[k]);
  report.gbp.configured = gbpOk;
  report.gbp.masked = {
    clientId: masked(env.GBP_CLIENT_ID),
    clientSecret: env.GBP_CLIENT_SECRET ? '(set)' : '(unset)',
    refreshToken: env.GBP_REFRESH_TOKEN ? '(set)' : '(unset)',
  };

  let gbpToken = null;
  if (gbpOk) {
    try {
      const o2 = new google.auth.OAuth2(env.GBP_CLIENT_ID, env.GBP_CLIENT_SECRET);
      o2.setCredentials({ refresh_token: env.GBP_REFRESH_TOKEN });
      ({ token: gbpToken } = await o2.getAccessToken());
      report.gbp.authenticated = !!gbpToken;
    } catch (e) {
      report.warnings.push('GBP OAuth failed: ' + (e.message || e));
    }
  }

  // -- Ads --
  const adsEnv = ['GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN'];
  const adsOk = adsEnv.every((k) => env[k]);
  report.ads.configured = adsOk;
  report.ads.masked = {
    clientId: masked(env.GOOGLE_ADS_CLIENT_ID),
    clientSecret: env.GOOGLE_ADS_CLIENT_SECRET ? '(set)' : '(unset)',
    refreshToken: env.GOOGLE_ADS_REFRESH_TOKEN ? '(set)' : '(unset)',
    developerToken: env.GOOGLE_ADS_DEVELOPER_TOKEN ? '(set · ' + masked(env.GOOGLE_ADS_DEVELOPER_TOKEN) + ')' : '(unset)',
  };

  let adsToken = null;
  if (adsOk) {
    try {
      const o2 = new google.auth.OAuth2(env.GOOGLE_ADS_CLIENT_ID, env.GOOGLE_ADS_CLIENT_SECRET);
      o2.setCredentials({ refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN });
      ({ token: adsToken } = await o2.getAccessToken());
      report.ads.authenticated = !!adsToken;
    } catch (e) {
      report.warnings.push('Ads OAuth failed: ' + (e.message || e));
    }
  }

  report.ads.customerId = env.GOOGLE_ADS_CUSTOMER_ID ? env.GOOGLE_ADS_CUSTOMER_ID.replace(/\D/g, '') : null;
  report.ads.loginCustomerId = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ? env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '') : null;

  return { report, gbpToken, adsToken };
}

function adsHeaders(adsToken, env) {
  const h = { Authorization: `Bearer ${adsToken}`, 'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN };
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) h['login-customer-id'] = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');
  return h;
}

// ---------------------------------------------------------------------------
// 2. Verify live GBP location
// ---------------------------------------------------------------------------

async function verifyGbpLocation(gbpToken) {
  if (!gbpToken) return { verified: false, detail: 'no GBP token' };

  const acctRes = await httpGet(GBP_ACCT_HOST, '/v1/accounts', { Authorization: `Bearer ${gbpToken}` });
  if (acctRes.status !== 200) return { verified: false, detail: `accounts HTTP ${acctRes.status}` };

  for (const acct of acctRes.body.accounts || []) {
    const lr = await httpGet(GBP_INFO_HOST, `/v1/${acct.name}/locations?readMask=name&pageSize=100`, { Authorization: `Bearer ${gbpToken}` });
    if (lr.status !== 200) continue;
    for (const loc of lr.body.locations || []) {
      if (loc.name === GBP_LOCATION_RESOURCE) {
        return { verified: true, account: acct.name, location: loc.name };
      }
    }
  }
  return { verified: false, detail: 'locations/17098915606572808840 not found under readable accounts' };
}

// ---------------------------------------------------------------------------
// 3. Ads: list active campaigns
// ---------------------------------------------------------------------------

async function listActiveCampaigns(customerId, headers) {
  const q = `SELECT campaign.resource_name, campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status = 'ENABLED' ORDER BY campaign.name`;
  const res = await httpPost(ADS_HOST, `/${ADS_VERSION}/customers/${customerId}/googleAds:searchStream`, headers, { query: q });
  if (res.status !== 200) return { error: adsError(res), campaigns: [] };
  const campaigns = flattenAds(res).map((r) => {
    const c = r.campaign || {};
    return { resourceName: c.resourceName, id: c.id, name: c.name, status: c.status };
  });
  return { campaigns };
}

// ---------------------------------------------------------------------------
// 4.a2. Resolve the GBP account email (needed by business_profile_location_set)
// ---------------------------------------------------------------------------

async function resolveGbpEmail(gbpToken, accountName) {
  if (!gbpToken) return { email: null, detail: 'no GBP token' };

  // 1. The owning Google account email is available via the OAuth userinfo
  //    endpoint — but the GBP token is minted with ONLY the `business.manage`
  //    scope, so this returns 401 unless the token also carries an email/openid
  //    scope. Treat as a soft miss and fall through.
  const ui = await httpGet('www.googleapis.com', '/oauth2/v1/userinfo?alt=json', { Authorization: `Bearer ${gbpToken}` });
  if (ui.status === 200 && ui.body && ui.body.email) {
    return { email: ui.body.email, detail: 'resolved via userinfo' };
  }

  // 2. Fallback: Account Management accounts/{id}/admins. NOTE: for a PERSONAL
  //    account this returns 400 ("A PERSON_ACCOUNT cannot have admins"), so the
  //    owner email is only recoverable here for ORGANISATION accounts.
  if (accountName) {
    const acctId = accountName.split('/').pop();
    const admins = await httpGet(GBP_ACCT_HOST, `/v1/accounts/${acctId}/admins`, { Authorization: `Bearer ${gbpToken}` });
    if (admins.status === 200) {
      const list = admins.body.admins || admins.body.accountAdmins || [];
      const owner = list.find((a) => a.role === 'PRIMARY_OWNER' || a.role === 'OWNER') || list[0];
      const email = owner && (owner.email || owner.admin);
      if (email) return { email, detail: 'resolved via account admins' };
    }
  }

  return { email: null, detail: `userinfo HTTP ${ui.status}; account admins unavailable` };
}

// ---------------------------------------------------------------------------
// 4.b. (CORRECT) Link the GBP location via a customer-level LOCATION_SYNC asset
//      set. In v22, location (map pin + distance) extensions are Google-managed
//      and read-only; a GBP location is linked by attaching the merchant's
//      Business Profile through an AssetSet of type LOCATION_SYNC whose
//      location_set.source = BUSINESS_PROFILE_LOCATION_SET. Attaching at the
//      customer level makes every campaign inherit it automatically (only one
//      active LOCATION_SYNC asset set is allowed per customer).
// ---------------------------------------------------------------------------

async function listLocationSyncAssetSets(customerId, headers) {
  const q = `SELECT asset_set.resource_name, asset_set.name, asset_set.type FROM asset_set WHERE asset_set.type = 'LOCATION_SYNC'`;
  const res = await httpPost(ADS_HOST, `/${ADS_VERSION}/customers/${customerId}/googleAds:searchStream`, headers, { query: q });
  if (res.status !== 200) return { error: adsError(res), assetSets: [] };
  const assetSets = flattenAds(res).map((r) => ({
    resourceName: r.assetSet && r.assetSet.resourceName,
    name: r.assetSet && r.assetSet.name,
    type: r.assetSet && r.assetSet.type,
  }));
  return { assetSets };
}

async function listCustomerAssetSets(customerId, headers) {
  const q = `SELECT customer_asset_set.asset_set, customer_asset_set.resource_name FROM customer_asset_set`;
  const res = await httpPost(ADS_HOST, `/${ADS_VERSION}/customers/${customerId}/googleAds:searchStream`, headers, { query: q });
  if (res.status !== 200) return { error: adsError(res), links: [] };
  const links = flattenAds(res).map((r) => ({
    assetSet: r.customerAssetSet && r.customerAssetSet.assetSet,
    resourceName: r.customerAssetSet && r.customerAssetSet.resourceName,
  }));
  return { links };
}

async function linkLocationToCustomer(customerId, headers, gbpToken, accountName) {
  const out = {
    assetSetResource: null,
    assetSetCreated: false,
    customerLinkCreated: false,
    alreadyLinked: false,
    emailResolved: false,
    emailMasked: null,
    failed: [],
    note: '',
  };

  // 1. Resolve the GBP account email (masked on output).
  const emailResult = await resolveGbpEmail(gbpToken, accountName);
  if (emailResult.email) {
    out.emailResolved = true;
    out.emailMasked = masked(emailResult.email);
  }

  // 2. Discover existing LOCATION_SYNC asset sets and customer links.
  const existingSets = await listLocationSyncAssetSets(customerId, headers);
  const existingLinks = await listCustomerAssetSets(customerId, headers);

  // 3. If a LOCATION_SYNC asset set is already attached at customer level,
  //    the GBP location linking is effectively already in place.
  const setList = existingSets.assetSets || [];
  const linkList = existingLinks.links || [];
  const linkedSet = setList.find((s) => linkList.some((l) => l.assetSet === s.resourceName));

  if (linkedSet) {
    out.assetSetResource = linkedSet.resourceName;
    out.alreadyLinked = true;
    out.note = 'customer-level LOCATION_SYNC asset set already attached; inherited by all campaigns';
    return out;
  }

  // 4. Require the email + token to build a business_profile_location_set.
  if (!emailResult.email) {
    out.failed.push({ step: 'resolve GBP email', err: emailResult.detail });
    out.note = 'could not resolve the merchant email required for business_profile_location_set';
    return out;
  }

  // 5. (Re)use the first existing LOCATION_SYNC set, else create one populated
  //    with the Business Profile location set (the merchant email + a live
  //    GBP access token) so the link actually activates the map pin.
  let assetSetResource = setList[0] && setList[0].resourceName;
  if (!assetSetResource) {
    const create = {
      name: `GBP Upgrade Roofs — ${GBP_LOCATION_ID}`,
      type: 'LOCATION_SYNC',
      locationSet: {
        source: 'BUSINESS_PROFILE_LOCATION_SET',
        businessProfileLocationSet: {
          emailAddress: emailResult.email,
          httpAuthorizationToken: gbpToken,
        },
      },
    };
    const operations = [{ create }];
    const res = await httpPost(ADS_HOST, `/${ADS_VERSION}/customers/${customerId}/assetSets:mutate`, headers, { operations, partialFailure: true });
    if (res.status !== 200) {
      out.failed.push({ step: 'assetSets:mutate', err: adsError(res) });
      return out;
    }
    assetSetResource = (res.body && res.body.results && res.body.results[0] && res.body.results[0].resourceName) || null;
    if (!assetSetResource) { out.failed.push({ step: 'assetSets:mutate', err: 'no resource name returned' }); return out; }
    out.assetSetCreated = true;
  }
  out.assetSetResource = assetSetResource;

  // 6. Attach at customer level — activates location (map pin + distance)
  //    extensions and passes GBP link down to all campaigns.
  const operations = [{
    create: {
      customer: `customers/${customerId}`,
      assetSet: assetSetResource,
    },
  }];
  const res = await httpPost(ADS_HOST, `/${ADS_VERSION}/customers/${customerId}/customerAssetSets:mutate`, headers, { operations, partialFailure: true });
  if (res.status !== 200) {
    out.failed.push({ step: 'customerAssetSets:mutate', err: adsError(res) });
    return out;
  }
  out.customerLinkCreated = true;
  out.note = 'customer-level LOCATION_SYNC asset set attached; campaigns inherit location extensions';
  return out;
}

// ---------------------------------------------------------------------------
// 4.b. Resolve + apply geo-targeting for the 10 towns
// ---------------------------------------------------------------------------

async function resolveGeoTarget(customerId, headers, town) {
  const candidates = [town, `${town}, Cheshire, England`, `${town}, England, United Kingdom`];
  for (const name of candidates) {
    const q = `SELECT geo_target_constant.resource_name, geo_target_constant.name, geo_target_constant.target_type, geo_target_constant.country_code, geo_target_constant.status FROM geo_target_constant WHERE geo_target_constant.name = '${name.replace(/'/g, "\\'")}'`;
    const res = await httpPost(ADS_HOST, `/${ADS_VERSION}/customers/${customerId}/googleAds:searchStream`, headers, { query: q });
    if (res.status !== 200) continue;
    const rows = flattenAds(res);
    if (rows.length) {
      const gt = rows[0].geoTargetConstant || {};
      return { town, resource: gt.resourceName, name: gt.name, targetType: gt.targetType, countryCode: gt.countryCode };
    }
  }
  return { town, resource: null, name: null, targetType: null };
}

async function listExistingGeoCriteria(customerId, headers) {
  const q = `SELECT campaign_criterion.campaign, campaign_criterion.negative, geo_target_constant.resource_name FROM campaign_criterion WHERE campaign_criterion.type = 'LOCATION'`;
  const res = await httpPost(ADS_HOST, `/${ADS_VERSION}/customers/${customerId}/googleAds:searchStream`, headers, { query: q });
  if (res.status !== 200) return { error: adsError(res), positives: new Set(), negatives: new Set() };
  const positives = new Set();
  const negatives = new Set();
  for (const r of flattenAds(res)) {
    const cc = r.campaignCriterion || {};
    const gt = r.geoTargetConstant || {};
    const key = `${cc.campaign}::${gt.resourceName}`;
    if (cc.negative) negatives.add(key); else positives.add(key);
  }
  return { positives, negatives };
}

async function applyGeoCriteria(customerId, headers, campaigns, geoConstants) {
  const out = { applied: 0, skippedNoConstant: [], alreadyTargeted: [], failed: [] };
  const existing = await listExistingGeoCriteria(customerId, headers);

  for (const cam of campaigns) {
    for (const gc of geoConstants) {
      if (!gc.resource) { if (out.skippedNoConstant.indexOf(gc.town) < 0) out.skippedNoConstant.push(gc.town); continue; }
      const key = `${cam.resourceName}::${gc.resource}`;
      if (existing.positives.has(key)) { out.alreadyTargeted.push(`${cam.name} → ${gc.town}`); continue; }

      const operations = [{
        create: {
          campaign: cam.resourceName,
          negative: false,
          location: { geoTargetConstant: gc.resource },
        },
      }];
      const res = await httpPost(ADS_HOST, `/${ADS_VERSION}/customers/${customerId}/campaignCriteria:mutate`, headers, { operations, partialFailure: true });
      if (res.status === 200) out.applied++;
      else out.failed.push({ campaign: cam.name, town: gc.town, err: adsError(res) });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  banner('UPGRADE ROOFS — GBP/ADS ALIGNMENT REMEDIATION');
  console.log(`Date: ${new Date().toISOString().slice(0, 10)}\n`);

  // 1. Authenticate
  const { report, gbpToken, adsToken } = await authenticate();

  banner('1. AUTHENTICATION (masked — no secrets printed)');
  const b = (x) => (x ? 'YES' : 'NO');
  console.log(`  Google Business Profile  configured=${b(report.gbp.configured)}  token=${b(report.gbp.authenticated)}`);
  console.log(`    client_id      : ${report.gbp.masked.clientId}`);
  console.log(`    client_secret  : ${report.gbp.masked.clientSecret}`);
  console.log(`    refresh_token  : ${report.gbp.masked.refreshToken}`);
  console.log(`  Google Ads               configured=${b(report.ads.configured)}  token=${b(report.ads.authenticated)}`);
  console.log(`    client_id      : ${report.ads.masked.clientId}`);
  console.log(`    client_secret  : ${report.ads.masked.clientSecret}`);
  console.log(`    refresh_token  : ${report.ads.masked.refreshToken}`);
  console.log(`    developer_token: ${report.ads.masked.developerToken}`);
  console.log(`    customer_id    : ${report.ads.customerId || '(unset)'}`);
  console.log(`    login_customer : ${report.ads.loginCustomerId || '(unset)'}`);

  if (report.warnings.length) {
    console.log('\n  WARNINGS:');
    for (const w of report.warnings) console.log(`    - ${w}`);
  }

  if (!report.ads.authenticated || !report.ads.customerId) {
    console.error('\n  ✖ Cannot proceed: Ads auth/customer ID missing. Aborting before any writes.');
    process.exit(1);
  }
  if (!report.gbp.authenticated) {
    console.error('\n  ✖ Cannot proceed: GBP auth missing (needed to verify the location). Aborting.');
    process.exit(1);
  }

  const headers = adsHeaders(adsToken, process.env);
  const customerId = report.ads.customerId;

  // 2. Verify live GBP location
  banner('2. VERIFY LIVE GBP LOCATION');
  const locCheck = await verifyGbpLocation(gbpToken);
  if (locCheck.verified) {
    console.log(`  ✓ Verified: ${locCheck.location}  (account ${locCheck.account})`);
  } else {
    console.log(`  ✖ NOT verified: ${locCheck.detail}`);
    console.log('  Aborting before writes — cannot link an unverified location.');
    process.exit(1);
  }

  // 3. List active campaigns
  banner('3. ACTIVE CAMPAIGNS');
  const active = await listActiveCampaigns(customerId, headers);
  if (active.error) { console.log(`  ✖ ${active.error}`); process.exit(1); }
  if (!active.campaigns.length) {
    console.log('  No ENABLED campaigns found. Nothing to link or geo-target.');
    process.exit(0);
  }
  for (const c of active.campaigns) console.log(`  - ${c.name}  (${c.resourceName})`);

  // 4. Location asset: link GBP location via customer-level LOCATION_SYNC set
  banner('4. LOCATION ASSET (map pin + distance extensions)');
  const linkResult = await linkLocationToCustomer(customerId, headers, gbpToken, locCheck.account);

  console.log(`  GBP email resolved    : ${linkResult.emailResolved ? 'YES' : 'NO'}${linkResult.emailMasked ? '  (' + linkResult.emailMasked + ')' : ''}`);
  console.log(`  LOCATION_SYNC set     : ${linkResult.assetSetResource || '(none)'}${linkResult.assetSetCreated ? '  (created)' : ''}`);
  console.log(`  Customer-level link   : ${linkResult.customerLinkCreated ? 'created' : linkResult.alreadyLinked ? 'already attached' : 'not created'}`);
  if (linkResult.note) console.log(`  Note                  : ${linkResult.note}`);
  for (const f of linkResult.failed) console.log(`  ✖ ${f.step}: ${f.err}`);

  // 5. Geo-targeting for the 10 towns
  banner('5. GEO-TARGETING — 10 SERVICE TOWNS');
  const geoConstants = [];
  for (const town of SERVICE_TOWNS) {
    const gc = await resolveGeoTarget(customerId, headers, town);
    geoConstants.push(gc);
    if (gc.resource) console.log(`  ✓ ${town.padEnd(14)} → ${gc.resource}  [${gc.targetType || '?'}]`);
    else console.log(`  ✖ ${town.padEnd(14)} → no geo_target_constant resolved`);
  }

  const geoApply = await applyGeoCriteria(customerId, headers, active.campaigns, geoConstants);
  console.log(`\n  Applied: ${geoApply.applied} new positive location criteria`);
  console.log(`  Already targeted: ${geoApply.alreadyTargeted.length}`);
  if (geoApply.skippedNoConstant.length) console.log(`  Skipped (no constant): ${geoApply.skippedNoConstant.join(', ')}`);
  if (geoApply.failed.length) {
    console.log('  Failures:');
    for (const f of geoApply.failed) console.log(`    ✖ ${f.campaign} → ${f.town}: ${f.err}`);
  }

  // 6. Verified execution report
  banner('6. VERIFIED EXECUTION REPORT');
  const summary = {
    auth: {
      gbpConfigured: report.gbp.configured,
      gbpAuthenticated: report.gbp.authenticated,
      adsConfigured: report.ads.configured,
      adsAuthenticated: report.ads.authenticated,
    },
    gbpLocation: {
      verified: locCheck.verified,
      resource: locCheck.verified ? locCheck.location : null,
    },
    activeCampaigns: active.campaigns.length,
    locationAsset: {
      emailResolved: linkResult.emailResolved,
      assetSetResource: linkResult.assetSetResource || null,
      assetSetCreated: linkResult.assetSetCreated,
      customerLinkCreated: linkResult.customerLinkCreated,
      alreadyLinked: linkResult.alreadyLinked,
      linkFailures: linkResult.failed.length,
      linked: linkResult.customerLinkCreated || linkResult.alreadyLinked,
    },
    geoTargeting: {
      townsResolved: geoConstants.filter((g) => g.resource).length,
      townsTotal: SERVICE_TOWNS.length,
      criteriaApplied: geoApply.applied,
      criteriaAlreadyPresent: geoApply.alreadyTargeted.length,
      applyFailures: geoApply.failed.length,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  console.log('\n  RESULT:');
  console.log(`   - Location asset re-linked: ${summary.locationAsset.linked ? 'YES' : 'NO'}`);
  console.log(`   - Granular geo-targeting applied: ${summary.geoTargeting.criteriaApplied > 0 ? 'YES (' + summary.geoTargeting.criteriaApplied + ' criteria)' : 'NO'}`);
  console.log('\nRemediation complete. No secrets were printed.\n');
}

main().catch((err) => {
  console.error('\nFATAL:', err.message || err);
  if (/invalid_grant/.test(String(err))) {
    console.error('A refresh token was rejected (invalid_grant). Re-mint the relevant token.');
  }
  process.exit(1);
});
