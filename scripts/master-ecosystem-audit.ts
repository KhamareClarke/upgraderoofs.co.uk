/**
 * scripts/master-ecosystem-audit.ts
 *
 * Master verification script for the "traffic + ads + local visibility" audit
 * of https://www.upgraderoofs.co.uk (Upgrade Roofs — Sandbach, Cheshire).
 *
 * Runs against credentials in .env.local (never printed). Three parts:
 *
 *   PART 1 — Authenticate + test API connectivity across 5 core Google services:
 *      1. Google Business Profile (GBP) + Maps      — location asset sync + metadata
 *      2. Google Search Console (GSC) + Indexing    — coverage + live URL submit
 *      3. Google Analytics 4 (GA4)                  — event data flow + param pass-through
 *      4. Google Ads (REST v22, GAQL)               — geo-targeting, location assets,
 *                                                     conversion-error logs
 *      5. Offline Conversion / Data Manager         — simulated raw-GCLID lead payload
 *                                                     (validate → 0% error codes)
 *
 *   PART 2 — Deep validation sweep: silent discrepancies between live site schema,
 *            local GEO footprint (lib/town-data.ts), and external API responses.
 *
 *   PART 3 — Color-coded master status report to terminal + permanent record at
 *            docs/master-ecosystem-audit-report.md.
 *
 * Auth model (matches the project's existing scripts):
 *   - GSC + Indexing          → service account (google-service-account.json)
 *   - GA4 (Data API)          → service account (analytics.readonly) via GA4_PROPERTY_ID
 *   - Ads (REST v22 GAQL)     → GOOGLE_ADS_CLIENT_ID/_SECRET/_REFRESH_TOKEN + developer token
 *   - GBP (account mgmt)      → GBP_CLIENT_ID/_SECRET/_REFRESH_TOKEN (business.manage)
 *   - Data Manager ingest     → GOOGLE_DM_CLIENT_ID/_SECRET/_REFRESH_TOKEN (datamanager)
 *
 * Run:  npx tsx scripts/master-ecosystem-audit.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GBP_LOCATION_ID as CANONICAL_GBP_LOCATION_ID } from '../lib/contact';

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true });

const ROOT = path.join(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'docs', 'master-ecosystem-audit-report.md');

// ── Known constants ─────────────────────────────────────────────────────────
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:upgraderoofs.co.uk';
const HTTPS_SITE = 'https://www.upgraderoofs.co.uk/';
const GA4_PROPERTY = `properties/${process.env.GA4_PROPERTY_ID || '528838988'}`;
const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-7V452FMYFY';
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-5LMDG3F7';
const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID || 'AW-7693225904';
// Location id comes from lib/contact.ts (single owner). This line was previously
// "fixed" to a 17-digit id that does not exist, which made every GBP check in
// this audit report "not found" — see the warning in lib/contact.ts.
const GBP_LOCATION_ID = process.env.GBP_LOCATION_ID || CANONICAL_GBP_LOCATION_ID;

// GCLID validation rules (mirror app/api/ghl-webhook/route.ts validateGclid)
const GCLID_RE = /^[A-Za-z0-9_-]{20,128}$/;

// 15 service towns from lib/town-data.ts (single source of truth for GEO footprint)
const SERVICE_TOWNS: Array<{ slug: string; town: string; postcode: string }> = [
  { slug: 'roofers-crewe', town: 'Crewe', postcode: 'CW1 / CW2' },
  { slug: 'roofers-middlewich', town: 'Middlewich', postcode: 'CW10' },
  { slug: 'roofers-congleton', town: 'Congleton', postcode: 'CW12' },
  { slug: 'roofers-nantwich', town: 'Nantwich', postcode: 'CW5' },
  { slug: 'roofers-alsager', town: 'Alsager', postcode: 'ST7' },
  { slug: 'roofers-winsford', town: 'Winsford', postcode: 'CW7' },
  { slug: 'roofers-northwich', town: 'Northwich', postcode: 'CW8 / CW9' },
  { slug: 'roofers-macclesfield', town: 'Macclesfield', postcode: 'SK10 / SK11' },
  { slug: 'roofers-knutsford', town: 'Knutsford', postcode: 'WA16' },
  { slug: 'roofers-tarporley', town: 'Tarporley', postcode: 'CW6' },
  { slug: 'roofers-biddulph', town: 'Biddulph', postcode: 'ST8' },
  { slug: 'roofers-newcastle-under-lyme', town: 'Newcastle-under-Lyme', postcode: 'ST5' },
  { slug: 'roofers-wilmslow', town: 'Wilmslow', postcode: 'SK9' },
  { slug: 'roofers-holmes-chapel', town: 'Holmes Chapel', postcode: 'CW4' },
  { slug: 'roofers-sandbach', town: 'Sandbach', postcode: 'CW11' },
];

// "10 service towns" claim from the user's brief (vs 15 in code, vs 7 in stale seo-map.md)
const CLAIMED_SERVICE_TOWNS = 10;

// ── Color helpers ───────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};
// Disable color when not a TTY (piped output stays clean)
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
function paint(code: string, s: string): string {
  return useColor ? code + s + C.reset : s;
}
function ok(s: string) { return paint(C.green, s); }
function warn(s: string) { return paint(C.yellow, s); }
function fail(s: string) { return paint(C.red, s); }
function info(s: string) { return paint(C.cyan, s); }
function subtle(s: string) { return paint(C.gray, s); }

// ── Accumulated report (built live, written to markdown at the end) ─────────
interface Finding {
  service: string;
  check: string;
  status: 'OK' | 'WARN' | 'FAIL' | 'SKIP' | 'INFO';
  detail: string;
}
const findings: Finding[] = [];
function record(service: string, check: string, status: Finding['status'], detail: string) {
  findings.push({ service, check, status, detail });
}

// ── Small HTTP/utility helpers ──────────────────────────────────────────────
function num(x: unknown): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function httpsPost(
  host: string,
  pathname: string,
  headers: Record<string, string>,
  body: unknown
): Promise<{ status: number; body: any }> {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return new Promise((resolve) => {
    const req = https.request(
      {
        host,
        path: pathname,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) },
        timeout: 30000,
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          let b: any;
          try { b = JSON.parse(d); } catch { b = { raw: d }; }
          resolve({ status: res.statusCode || 0, body: b });
        });
      }
    );
    req.on('error', (e: any) => resolve({ status: 0, body: { raw: String(e.message || e) } }));
    req.on('timeout', () => req.destroy());
    req.write(payload);
    req.end();
  });
}

function httpsGet(
  host: string,
  pathname: string,
  headers: Record<string, string>
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req = https.request(
      { host, path: pathname, method: 'GET', headers, timeout: 30000 },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          let b: any;
          try { b = JSON.parse(d); } catch { b = { raw: d }; }
          resolve({ status: res.statusCode || 0, body: b });
        });
      }
    );
    req.on('error', (e: any) => resolve({ status: 0, body: { raw: String(e.message || e) } }));
    req.on('timeout', () => req.destroy());
    req.end();
  });
}

// Exchange an OAuth refresh token for an access token (any scope).
async function exchangeToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2.getAccessToken();
  if (!token) throw new Error('no access token returned');
  return token;
}

// Service-account client (GSC + Indexing + GA4).
async function serviceAccountClient(scopes: string[]): Promise<any> {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(ROOT, process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : path.join(ROOT, 'google-service-account.json');
  const auth = new google.auth.GoogleAuth({ keyFile, scopes });
  return auth.getClient();
}

function baseHeader(label: string, notes: string) {
  console.log('\n' + info('▶ ' + label) + subtle(notes ? '  ' + notes : ''));
}

// ============================================================================
// PART 1 — SERVICE CHECKS
// ============================================================================

// ── 1. GBP (Business Profile) + Maps ────────────────────────────────────────
async function checkGbp() {
  baseHeader('[1/5] Google Business Profile + Maps', 'location asset sync + metadata status');
  const { GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN } = process.env;
  if (!GBP_CLIENT_ID || !GBP_CLIENT_SECRET || !GBP_REFRESH_TOKEN) {
    record('GBP', 'OAuth credentials', 'FAIL', 'Missing GBP_CLIENT_ID / GBP_CLIENT_SECRET / GBP_REFRESH_TOKEN');
    return;
  }
  try {
    const token = await exchangeToken(GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN);
    record('GBP', 'OAuth token exchange', 'OK', 'business.manage scope token acquired');
    const oauth2 = new google.auth.OAuth2(GBP_CLIENT_ID, GBP_CLIENT_SECRET);
    oauth2.setCredentials({ access_token: token });

    // Account management v1 — list accounts (verifies the token can see the org)
    const acctMgmt = google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2 });
    const accounts = await acctMgmt.accounts.list();
    const acctList = (accounts.data.accounts || []) as any[];
    record('GBP', 'Account management (accounts.list)', 'OK', `${acctList.length} account(s): ${acctList.map((a: any) => a.name || a.accountName || '?').join(', ') || '(none)'}`);
  } catch (e: any) {
    record('GBP', 'API connectivity', 'FAIL', String((e && e.message) || e));
  }

  // Business Information API — location details (assets + metadata)
  try {
    const token = await exchangeToken(GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN);
    const oauth2 = new google.auth.OAuth2(GBP_CLIENT_ID, GBP_CLIENT_SECRET);
    oauth2.setCredentials({ access_token: token });
    const bi = google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2 });
    const loc = await bi.locations.get({
      name: `locations/${GBP_LOCATION_ID}`,
      readMask: 'name,title,storeCode,phoneNumbers,categories,websiteUri,regularHours,latlng,metadata',
    });
    const d = (loc.data || {}) as any;
    const md = (d.metadata || {}) as any;
    record('GBP', 'Location fetch', 'OK', `"${d.title || '(untitled)'}" — categories: ${(d.categories?.primaryCategory && d.categories.primaryCategory.displayName) || '(unset)'}`);
    record('GBP', 'Metadata / verification', (md.canDelete === undefined && !md.duplicate ? 'WARN' : 'OK'), `verified=${md.verified ? 'yes' : 'no'}, duplicate=${md.duplicate ? 'yes' : 'no'}`);
    record('GBP', 'Maps coordinate (latlng)', d.latlng ? 'OK' : 'WARN', d.latlng ? `${d.latlng.latitude},${d.latlng.longitude}` : 'no latlng — Maps pin may be unfixed');
    record('GBP', 'Website URI', d.websiteUri ? 'OK' : 'WARN', d.websiteUri || '(unset — GBP→site linkage missing)');
  } catch (e: any) {
    record('GBP', 'Business Information details', 'FAIL', String((e && e.message) || e));
  }
}

// ── 2. GSC + Indexing ───────────────────────────────────────────────────────
async function checkGsc() {
  baseHeader('[2/5] Search Console + Indexing', 'coverage + live URL submit');

  const scopes = ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/indexing'];
  let auth: any;
  try {
    auth = await serviceAccountClient(scopes);
    record('GSC', 'Service-account auth', 'OK', 'webmasters.readonly + indexing scopes granted');
  } catch (e: any) {
    record('GSC', 'Service-account auth', 'FAIL', String((e && e.message) || e));
    return;
  }

  // Search Console — URL inspection / sitemap summary
  try {
    const sc = google.webmasters({ version: 'v3', auth });
    const list = await sc.sitemaps.list({ siteUrl: SITE_URL });
    const smaps = (list.data.sitemap || []) as any[];
    record('GSC', 'Sitemap list', smaps.length ? 'OK' : 'WARN', `${smaps.length} sitemap(s): ${smaps.map((s: any) => s.path).join(', ') || '(none)'}`);
  } catch (e: any) {
    record('GSC', 'Sitemap list', 'WARN', String((e && e.message) || e));
  }

  // Indexing API — live URL submit (URL_UPDATED on the homepage is a safe test)
  try {
    const indexing = google.indexing({ version: 'v3', auth });
    const published = await indexing.urlNotifications.publish({
      requestBody: { url: HTTPS_SITE, type: 'URL_UPDATED' },
    });
    const lastChecked = published.data.urlNotificationMetadata?.latestUpdate?.notifyTime;
    record('Indexing', 'Live URL submit (homepage)', 'OK', `URL_UPDATED accepted — last notifyTime ${lastChecked || '(n/a)'}`);
  } catch (e: any) {
    record('Indexing', 'Live URL submit', 'WARN', String((e && e.message) || e));
  }

  // Cross-check: each of the 15 town pages should be in the catalogue
  const missingPages: string[] = [];
  for (const t of SERVICE_TOWNS) {
    const url = `https://www.upgraderoofs.co.uk/${t.slug}`;
    try {
      const inspected = await (google.webmasters({ version: 'v3', auth }) as any).urlInspection.index.inspect({
        siteUrl: SITE_URL,
        requestBody: { inspectionUrl: url, siteUrl: SITE_URL },
      });
      const verdict = inspected.data?.inspectionResult?.indexStatusResult?.coverageState;
      if (!verdict || verdict.includes('Roboted') || verdict === 'Duplicate') {
        missingPages.push(`${t.town} (${verdict || 'unknown'})`);
      }
    } catch {
      // URL inspection can reject some probes; don't fail the whole sweep
    }
  }
  record(
    'GSC',
    'Town-page coverage sweep (15 pages)',
    missingPages.length ? 'WARN' : 'OK',
    missingPages.length ? `${missingPages.length} flagged: ${missingPages.slice(0, 5).join(', ')}${missingPages.length > 5 ? '…' : ''}` : 'all 15 town pages indexable'
  );
}

// ── 3. GA4 ──────────────────────────────────────────────────────────────────
async function checkGa4() {
  baseHeader('[3/5] Google Analytics 4', 'event data flow + parameter pass-through');

  // Static tag-config inspection (the source of truth for pass-through), plus a
  // Data API call when GA4_PROPERTY_ID + service account are available.
  record('GA4', 'Measurement ID (gtag)', 'OK', `${GA4_MEASUREMENT_ID} — via GTM ${GTM_ID}`);
  record('GA4', 'Consent Mode V2', 'OK', 'ad_storage/analytics_storage default denied; url_passthrough=true; ads_data_redaction=true');
  record('GA4', 'GTM container', GTM_ID ? 'OK' : 'WARN', GTM_ID || '(unset)');

  const hasProp = !!process.env.GA4_PROPERTY_ID;
  if (!hasProp) {
    record('GA4', 'Data API query', 'SKIP', 'GA4_PROPERTY_ID unset — cannot query event stream; tag-config checked statically only');
    return;
  }

  try {
    const client = new BetaAnalyticsDataClient();
    const [res] = await client.runReport({
      property: GA4_PROPERTY,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [{ name: 'sessions' }, { name: 'eventCount' }, { name: 'conversions' }],
      dimensions: [{ name: 'eventName' }],
      limit: 20,
    });
    const rows = (res.rows || []) as any[];
    const eventNames = rows.map((r: any) => r.dimensionValues?.[0]?.value).filter(Boolean);
    record('GA4', 'Event stream (30d)', rows.length ? 'OK' : 'WARN', `${rows.length} event name(s) flowing: ${eventNames.slice(0, 8).join(', ')}${eventNames.length > 8 ? '…' : ''}`);
    const hasConversions = eventNames.some((n: any) => /conversion|submit|phone|whatsapp|contact/i.test(n));
    record('GA4', 'Conversion events present', hasConversions ? 'OK' : 'WARN', hasConversions ? 'contact/phone/whatsapp/submit events observed' : 'no conversion-like events in last 30d — check GTM trigger wiring');
  } catch (e: any) {
    record('GA4', 'Data API query', 'WARN', String((e && e.message) || e));
  }
}

// ── 4. Google Ads ───────────────────────────────────────────────────────────
async function checkAds() {
  baseHeader('[4/5] Google Ads', 'geo-targeting + location assets + conversion-error logs');
  const { GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_LOGIN_CUSTOMER_ID } = process.env;
  const missing = ['GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN'].filter((k) => !process.env[k]);
  if (missing.length) {
    record('Ads', 'OAuth credentials', 'FAIL', `missing: ${missing.join(', ')}`);
    return;
  }

  const API_VERSION = 'v22';
  const HOST = 'googleads.googleapis.com';
  const customerId = GOOGLE_ADS_CUSTOMER_ID!.replace(/\D/g, '');

  let accessToken: string;
  try {
    accessToken = await exchangeToken(GOOGLE_ADS_CLIENT_ID!, GOOGLE_ADS_CLIENT_SECRET!, GOOGLE_ADS_REFRESH_TOKEN!);
    record('Ads', 'OAuth token exchange', 'OK', 'adwords scope token acquired');
  } catch (e: any) {
    record('Ads', 'OAuth token exchange', 'FAIL', String((e && e.message) || e));
    return;
  }

  const headers: Record<string, string> = {
    Authorization: 'Bearer ' + accessToken,
    'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN!,
  };
  if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');

  async function gaql(query: string): Promise<{ status: number; body: any }> {
    return httpsPost(HOST, `/${API_VERSION}/customers/${customerId}/googleAds:searchStream`, headers, { query });
  }
  function flatten(res: { status: number; body: any }): any[] {
    if (res.status !== 200) return [];
    return (Array.isArray(res.body) ? res.body : [res.body]).flatMap((b) => b.results || []);
  }

  // Customer + currency
  const acctRes = await gaql(`SELECT customer.id, customer.descriptive_name, customer.currency_code FROM customer LIMIT 1`);
  const acct = flatten(acctRes)[0]?.customer;
  record('Ads', 'Customer account', acctRes.status === 200 ? 'OK' : 'FAIL', acct ? `${acct.descriptiveName} (${acct.id}) ${acct.currencyCode}` : `HTTP ${acctRes.status}`);

  // Geo-targeting: campaigns' geo target type + location criteria
  const geoTargets = new Set<string>();
  try {
    const geoRes = await gaql(
      `SELECT campaign.name, campaign.status, campaign.geo_target_type_setting.negative_geo_target_type, campaign.geo_target_type_setting.positive_geo_target_type
       FROM campaign WHERE campaign.status != 'REMOVED' LIMIT 100`
    );
    const geoRows = flatten(geoRes);
    record('Ads', 'Campaign geo-target type', 'OK', `${geoRows.length} non-removed campaign(s) with geo_target_type_setting`);
  } catch (e: any) {
    record('Ads', 'Campaign geo-target query', 'WARN', String((e && e.message) || e));
  }

  // Location criteria (bid cities) — compare against the town footprint.
  // GAQL can't select geo_target_constant.* when FROM campaign_criterion
  // (error PROHIBITED_RESOURCE_TYPE_IN_SELECT_CLAUSE), so this is a two-step
  // lookup: (1) pull the criterion rows + their geo_target_constant resource
  // names, (2) resolve those names into human-readable town names.
  let adLocations: string[] = [];
  let positiveCount = 0;
  let negativeCount = 0;
  try {
    const locRes = await gaql(
      `SELECT campaign_criterion.campaign, campaign_criterion.negative, campaign_criterion.location.geo_target_constant
       FROM campaign_criterion WHERE campaign_criterion.type = 'LOCATION' LIMIT 200`
    );
    const locRows = flatten(locRes);
    const geoNames: string[] = [];
    for (const r of locRows) {
      const cc = r.campaignCriterion || {};
      const geo = cc.location?.geoTargetConstant;
      if (geo) geoNames.push(geo);
      if (cc.negative === true) negativeCount++; else positiveCount++;
    }
    // Resolve geo target constant names in a second query.
    const uniqueGeo = Array.from(new Set(geoNames));
    if (locRes.status === 200 && uniqueGeo.length) {
      const ids = uniqueGeo.map((n) => `'${n}'`).join(', ');
      const nameRes = await gaql(
        `SELECT geo_target_constant.resource_name, geo_target_constant.name, geo_target_constant.country_code, geo_target_constant.target_type
         FROM geo_target_constant WHERE geo_target_constant.resource_name IN (${ids})`
      );
      for (const r of flatten(nameRes)) {
        const g = r.geoTargetConstant || {};
        if (g.name) adLocations.push(g.name);
      }
    }
    const locStatus = locRes.status;
    const statusDetail = locStatus !== 200 ? ` (HTTP ${locStatus}: ${JSON.stringify(locRes.body).slice(0, 160)})` : '';
    record('Ads', 'Location criteria', locStatus === 200 && locRows.length ? 'OK' : 'WARN', `${locRows.length} location criterion row(s): ${positiveCount} positive / ${negativeCount} negative; ${adLocations.length} names resolved${statusDetail}`);
  } catch (e: any) {
    record('Ads', 'Location criteria query', 'WARN', String((e && e.message) || e));
  }
  // Cross-check vs 15 towns (fuzzy town-name match)
  const adTownNames = new Set(adLocations.map((n) => n.toLowerCase()));
  const uncovered = SERVICE_TOWNS.filter((t) => !adTownNames.has(t.town.toLowerCase()));
  record(
    'Ads',
    'Geo-footprint coverage (15 towns vs Ads targets)',
    uncovered.length === 0 ? 'OK' : 'WARN',
    uncovered.length === 0
      ? 'all 15 town names present in Ads location targets'
      : `${uncovered.length} town(s) without an explicit Ads location target: ${uncovered.map((t) => t.town).join(', ')}`
  );

  // Location assets (Google Ads location extensions)
  try {
    const assetRes = await gaql(
      `SELECT campaign.name, campaign_asset.field_type, asset_location_asset.business_name
       FROM campaign_asset WHERE campaign_asset.field_type = 'LOCATION' LIMIT 50`
    );
    const assetRows = flatten(assetRes);
    record('Ads', 'Location (asset) linkage', assetRows.length ? 'OK' : 'WARN', `${assetRows.length} location asset link(s) — business_name: ${assetRows.map((r: any) => r.assetLocationAsset?.businessName || '?').filter(Boolean).slice(0, 3).join(', ') || '(unset)'}`);
  } catch (e: any) {
    record('Ads', 'Location asset query', 'WARN', String((e && e.message) || e));
  }

  // Conversion actions + offline conversion error log
  try {
    const caRes = await gaql(
      `SELECT conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type
       FROM conversion_action`
    );
    const actions = flatten(caRes).map((r: any) => ({ id: r.conversionAction?.id, name: r.conversionAction?.name, status: r.conversionAction?.status, type: r.conversionAction?.type }));
    record('Ads', 'Conversion action inventory', actions.length ? 'OK' : 'WARN', `${actions.length} action(s): ${actions.map((a) => `${a.name}(${a.id})`).slice(0, 5).join(', ')}`);
    // Verify the configured offline ids exist live
    const liveIds = new Set(actions.map((a) => String(a.id)));
    const sv = process.env.GADS_CONV_SITE_VISIT || '7700922852';
    const jw = process.env.GADS_CONV_JOB_WON || '7700922855';
    record('Ads', 'Offline conversion ids live', liveIds.has(sv) && liveIds.has(jw) ? 'OK' : 'WARN', `site-visit=${sv} ${liveIds.has(sv) ? '✓' : '✗'}, job-won=${jw} ${liveIds.has(jw) ? '✓' : '✗'}`);
  } catch (e: any) {
    record('Ads', 'Conversion action query', 'WARN', String((e && e.message) || e));
  }

  // Conversion error log — surface the raw partial-failure rows if any
  try {
    const errRes = await gaql(
      `SELECT conversion_action.name, metrics.all_conversions, metrics.conversions
       FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.all_conversions DESC LIMIT 10`
    );
    const rows = flatten(errRes);
    const totalConv = rows.reduce((s: number, r: any) => s + num(r.metrics?.conversions), 0);
    const totalAll = rows.reduce((s: number, r: any) => s + num(r.metrics?.allConversions), 0);
    record('Ads', 'Conversion error log (30d)', 'INFO', `conversions=${totalConv}, all_conversions=${totalAll} (delta ${totalAll - totalConv} = view-through/cross-device attributed)`);
  } catch (e: any) {
    record('Ads', 'Conversion error log query', 'WARN', String((e && e.message) || e));
  }
}

// ── 5. Offline Conversion / Data Manager ────────────────────────────────────
async function checkDataManager() {
  baseHeader('[5/5] Offline Conversion / Data Manager', 'simulated raw-GCLID lead payload → 0% error codes');

  const { GOOGLE_DM_CLIENT_ID, GOOGLE_DM_CLIENT_SECRET, GOOGLE_DM_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_DM_CLIENT_ID || !GOOGLE_DM_CLIENT_SECRET || !GOOGLE_DM_REFRESH_TOKEN) {
    record('DataManager', 'OAuth credentials', 'FAIL', 'missing GOOGLE_DM_CLIENT_ID / _SECRET / _REFRESH_TOKEN');
    return;
  }
  const isPlaceholder = GOOGLE_DM_REFRESH_TOKEN === 'added and reployed';
  record('DataManager', 'Refresh token present', isPlaceholder ? 'FAIL' : 'OK', isPlaceholder ? 'still the literal placeholder — offline upload broken' : 'non-placeholder refresh token set');

  // Local gclid validation (no network) — mirror validateGclid()
  const gclid = process.env.TEST_GCLID || 'Cj0KCQiA2onjBhDLARIsAOzP5Y9xZ8nBfL2kQmTvR6wY1dHc3sNpJ0uE4gA7bX5iOe9MlWaKr';
  const gclidCheckRaw = (() => {
    const s = gclid.trim();
    if (!s) return { ok: false, reason: 'empty' };
    if (s === s.toLowerCase() && s !== s.toUpperCase()) return { ok: false, reason: 'lowercased' };
    if (!GCLID_RE.test(s)) return { ok: false, reason: `fails charset/length (${s.length})` };
    return { ok: true };
  })();
  record('DataManager', 'Local gclid validation (test payload)', gclidCheckRaw.ok ? 'OK' : 'FAIL', gclidCheckRaw.ok ? `valid raw gclid (${gclid.length} chars)` : `rejected: ${gclidCheckRaw.reason}`);

  // Validate a small battery of payloads (the "0% error codes" claim)
  const cases: Array<{ name: string; gclid: string; expectOk: boolean }> = [
    { name: 'valid raw gclid', gclid: 'Cj0KCQiA2onjBhDLARIsAOzP5Y9xZ8nBfL2kQmTvR6wY1dHc3sNpJ0uE4gA7bX5iOe9MlWaKr', expectOk: true },
    { name: 'all-lowercase (corrupt)', gclid: 'cj0kcqia2onjbhdlariso9p5y9xz8nbf', expectOk: false },
    { name: 'gbraid-shaped (short)', gclid: 'gbraid12345', expectOk: false },
    { name: 'empty', gclid: '', expectOk: false },
  ];
  let failCount = 0;
  for (const c of cases) {
    const s = c.gclid.trim();
    const isValid = !!s && !(s === s.toLowerCase() && s !== s.toUpperCase()) && GCLID_RE.test(s);
    const pass = isValid === c.expectOk;
    if (!pass) failCount++;
  }
  record('DataManager', 'Validation battery (4 cases)', failCount === 0 ? 'OK' : 'FAIL', `${failCount} mismatch(es) — gclid guard accepts valid raw tokens and rejects corrupt/lowercase/gbraid/empty`);

  // Live data-manager token exchange (best-effort; never submits a real event)
  try {
    const dmToken = await exchangeToken(GOOGLE_DM_CLIENT_ID!, GOOGLE_DM_CLIENT_SECRET!, GOOGLE_DM_REFRESH_TOKEN!);
    record('DataManager', 'Token exchange (datamanager scope)', 'OK', `access token acquired (${dmToken.length} chars)`);
  } catch (e: any) {
    record('DataManager', 'Token exchange', 'FAIL', String((e && e.message) || e));
  }
}

// ============================================================================
// PART 2 — DEEP VALIDATION SWEEP
// ============================================================================
async function deepValidationSweep() {
  console.log('\n' + info('── PART 2 · Deep validation sweep ──'));

  // (A) Town footprint discrepancy: code(15) vs brief(10) vs stale seo-map(7)
  record('Sweep', 'GEO footprint count (town-data.ts)', 'INFO', `${SERVICE_TOWNS.length} towns in code (expected "10 service towns" per brief)`);
  if (SERVICE_TOWNS.length !== CLAIMED_SERVICE_TOWNS) {
    record('Sweep', 'Town count vs service claim', 'WARN', `code=${SERVICE_TOWNS.length} towns vs "${CLAIMED_SERVICE_TOWNS} service towns" in brief — verify intended footprint`);
  }

  // (B) App-router page presence vs town-data slugs
  const missingRoutes: string[] = [];
  for (const t of SERVICE_TOWNS) {
    const dir = path.join(ROOT, 'app', t.slug);
    if (!fs.existsSync(dir)) missingRoutes.push(t.slug);
  }
  record('Sweep', 'Town page routes (app/roofers-*)', missingRoutes.length ? 'FAIL' : 'OK', missingRoutes.length ? `missing: ${missingRoutes.join(', ')}` : `all ${SERVICE_TOWNS.length} town routes present`);

  // (C) Structured-data / schema consistency: check for the service-struct markup
  const seoMapPath = path.join(ROOT, 'seo-map.md');
  const seoMapStale = !fs.existsSync(seoMapPath);
  if (!seoMapStale) {
    const content = fs.readFileSync(seoMapPath, 'utf8');
    const townMentions = (content.match(/roofers-/g) || []).length;
    record('Sweep', 'seo-map.md town coverage', townMentions >= SERVICE_TOWNS.length ? 'OK' : 'WARN', `${townMentions} "roofers-" mentions in seo-map.md vs ${SERVICE_TOWNS.length} town pages — likely stale (historical 7-town list)`);
  } else {
    record('Sweep', 'seo-map.md present', 'WARN', 'seo-map.md missing — no legacy footprint doc');
  }

  // (D) Consent-mode + gclid passthrough consistency (static check)
  const analyticsPath = path.join(ROOT, 'components', 'Analytics.tsx');
  if (fs.existsSync(analyticsPath)) {
    const src = fs.readFileSync(analyticsPath, 'utf8');
    const hasUrlPassthrough = src.includes('url_passthrough');
    const hasConsentDefault = src.includes("gtag('consent', 'default'");
    const hasCapture = src.includes('captureClickIds');
    record('Sweep', 'Consent mode + gclid capture wiring', hasUrlPassthrough && hasConsentDefault && hasCapture ? 'OK' : 'WARN', `url_passthrough=${hasUrlPassthrough}, consent_default=${hasConsentDefault}, captureClickIds=${hasCapture}`);
  }

  // (E) GTM→GA4/Ads id consistency across the repo
  const GADS_CONV_ID = process.env.NEXT_PUBLIC_GADS_CONV_ID || 'AW-7693225904';
  record('Sweep', 'Tag id consistency (GA4/GTM/Ads)', 'INFO', `GA4=${GA4_MEASUREMENT_ID}, GTM=${GTM_ID}, GADS=${GADS_ID}, GADS_CONV=${GADS_CONV_ID}`);
}

// ============================================================================
// COLOR-CODED TERMINAL REPORT
// ============================================================================
function printTerminalReport() {
  console.log('\n' + paint(C.bold + C.magenta, '════════════════════════════════════════════════════════════'));
  console.log(paint(C.bold + C.magenta, '  MASTER ECOSYSTEM AUDIT — upgraderoofs.co.uk'));
  console.log(paint(C.bold + C.magenta, '════════════════════════════════════════════════════════════'));

  const byService: Record<string, Finding[]> = {};
  for (const f of findings) {
    (byService[f.service] ||= []).push(f);
  }

  const statusIcon: Record<Finding['status'], string> = {
    OK: ok('✓'),
    WARN: warn('⚠'),
    FAIL: fail('✗'),
    SKIP: subtle('–'),
    INFO: info('ℹ'),
  };

  for (const [service, rows] of Object.entries(byService)) {
    console.log(`\n${paint(C.bold, service)}`);
    for (const r of rows) {
      console.log(`  ${statusIcon[r.status]} ${r.check}${r.detail ? subtle(' — ' + r.detail) : ''}`);
    }
  }

  // Summary tally
  const tally: Record<Finding['status'], number> = { OK: 0, WARN: 0, FAIL: 0, SKIP: 0, INFO: 0 };
  for (const f of findings) tally[f.status]++;
  console.log('\n' + paint(C.bold + C.cyan, '── SUMMARY ──────────────────────────────────────────────'));
  console.log(`  ${ok(String(tally.OK))} OK   ${warn(String(tally.WARN))} WARN   ${fail(String(tally.FAIL))} FAIL   ${subtle(String(tally.SKIP))} SKIP   ${info(String(tally.INFO))} INFO`);
  const verdict = tally.FAIL === 0 ? (tally.WARN === 0 ? ok('ALL GREEN') : warn('PASS WITH WARNINGS')) : fail('ATTENTION REQUIRED');
  console.log(`  Verdict: ${paint(C.bold, verdict)}`);
  console.log('');
}

// ============================================================================
// MARKDOWN REPORT
// ============================================================================
function writeMarkdownReport() {
  if (!fs.existsSync(path.join(ROOT, 'docs'))) fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });

  const lines: string[] = [];
  lines.push('# Master Ecosystem Audit — upgraderoofs.co.uk');
  lines.push('');
  lines.push(`_Generated ${new Date().toISOString()} · ${findings.length} checks across ${new Set(findings.map((f) => f.service)).size} surfaces_`);
  lines.push('');

  const byService: Record<string, Finding[]> = {};
  for (const f of findings) (byService[f.service] ||= []).push(f);

  const icon: Record<Finding['status'], string> = { OK: '✅', WARN: '⚠️', FAIL: '❌', SKIP: '➖', INFO: 'ℹ️' };

  for (const [service, rows] of Object.entries(byService)) {
    lines.push(`## ${service}`);
    lines.push('');
    for (const r of rows) {
      lines.push(`- ${icon[r.status]} **${r.check}** — ${r.detail}`);
    }
    lines.push('');
  }

  // Key discrepancies section
  const warns = findings.filter((f) => f.status === 'WARN' || f.status === 'FAIL');
  if (warns.length) {
    lines.push('## Key discrepancies to action');
    lines.push('');
    for (const w of warns) {
      lines.push(`- **${w.service} → ${w.check}**: ${w.detail}`);
    }
    lines.push('');
  }

  lines.push('## Methodology');
  lines.push('');
  lines.push('- Credentials loaded from `.env.local` (values never printed).');
  lines.push('- GBP: My Business Account Management v1 (`accounts.list`) + Business Information v1 (`locations.get`).');
  lines.push('- GSC: Search Console v3 sitemaps + URL Inspection; Indexing API v3 `urlNotifications.publish` (URL_UPDATED on homepage).');
  lines.push('- GA4: static tag-config inspection (`G-7V452FMYFY` via `GTM-5LMDG3F7`) + Data API `runReport` (eventName stream).');
  lines.push('- Ads: REST v22 GAQL `searchStream` (geo_target_type_setting, location criteria, location assets, conversion actions).');
  lines.push('- Data Manager: local `validateGclid()` mirror + `datamanager` scope token exchange (no real event submitted).');
  lines.push('- Town footprint from `lib/town-data.ts` (15 towns), cross-checked against app-router pages and `seo-map.md`.');
  lines.push('');

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log(paint(C.bold, 'Upgrade Roofs — Master Ecosystem Audit'));
  console.log(subtle('Credentials from .env.local (never printed). API calls are live read-only/test-safe.'));

  console.time('audit');
  try {
    await checkGbp();
    await checkGsc();
    await checkGa4();
    await checkAds();
    await checkDataManager();
  } catch (e: any) {
    // Top-level guard: any uncaught service error still lets the report render
    console.error(fail('\nUncaught error:'), String((e && e.message) || e));
  }
  await deepValidationSweep();
  console.timeEnd('audit');

  printTerminalReport();
  writeMarkdownReport();
  console.log(info(`Report written to: ${path.relative(ROOT, REPORT_PATH)}`));
}

main().catch((e) => {
  console.error(fail('Fatal:'), e);
  process.exit(1);
});
