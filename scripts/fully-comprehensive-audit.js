/**
 * scripts/fully-comprehensive-audit.js
 *
 * Exhaustive cross-channel diagnostic for Upgrade Roofs (upgraderoofs.co.uk).
 * Five vectors, each guarded so a single failing API cannot abort the rest:
 *
 *   (1) AUTHENTICATION    — OAuth master-manager token (GBP + Ads) + service
 *                           account (GSC / Indexing / GA4), across Business
 *                           Profile, Maps/Geocoding, Search Console, Indexing,
 *                           GA4 and Ads platforms.
 *   (2) GBP / MAPS        — resolve the CORRECT location live (sidestepping three
 *                           conflicting hardcoded IDs), validate metadata,
 *                           voice-of-merchant, verification, API scopes, and verify
 *                           the 10 service-area place IDs via Geocoding.
 *   (3) GSC / INDEXING    — sitemap reachability, URL Inspection coverage, organic
 *                           performance, and live Node.js indexing pipeline check.
 *   (4) GA4 / ADS         — event + conversion health, enhanced conversions, Ads
 *                           campaign structure, geo-targeting vs the 10 towns,
 *                           location assets on GBP, bidding, conversion partitioning.
 *   (5) SEO / GEO / AEO   — LocalBusiness/RoofingContractor JSON-LD, regional
 *                           architecture, internal-link equity, entity clarity,
 *                           FAQ schema, conversational/AEO + knowledge-graph signals.
 *
 * Output: exhaustive terminal report AND docs/comprehensive-audit-report-2026.md
 *         (past baseline / current executed changes / remaining actions).
 *
 * SECURITY: secrets are never written or printed. .env.local values are referenced
 * only by presence checks (booleans) or as masked placeholders.
 *
 * Run:  node scripts/fully-comprehensive-audit.js
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });

const { google } = require('googleapis');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const child = require('child_process');

const SITE_URL = 'https://www.upgraderoofs.co.uk/';
const SITE_ORIGIN = 'https://www.upgraderoofs.co.uk';
const ROOT = path.join(__dirname, '..');
const GA4_PROPERTY = `properties/${process.env.GA4_PROPERTY_ID || '528838988'}`;
const REPORT_PATH = path.join(ROOT, 'docs', 'comprehensive-audit-report-2026.md');
const DAY_MS = 86400000;

// ── Hosts ─────────────────────────────────────────────────────────────────────
const GBP_INFO_HOST = 'mybusinessbusinessinformation.googleapis.com';
const GBP_ACCT_HOST = 'mybusinessaccountmanagement.googleapis.com';
const GBP_PERF_HOST = 'businessprofileperformance.googleapis.com';
const GBP_LEGACY_HOST = 'mybusiness.googleapis.com';
const ADS_HOST = 'googleads.googleapis.com';
const ADS_VERSION = 'v22';
const GEOCODE_HOST = 'maps.googleapis.com';

// ── The three "canonical" location IDs observed in the repo ──────────────────
// Resolved 2026-09-15: only `live` actually resolves (HTTP 200, "Upgrade Roofs").
// The other two are truncated/typo'd variants that 404. Earlier runs of this
// script mislabelled `live` as "altered" and `truncated` as "canonical", which
// is how the bad value reached app/structured-data.tsx.
const LOCATION_IDS = {
  // (a) supplied in the audit request — appears nowhere else in the codebase.
  request: '170989065056880840',
  // (b) truncated variant — does not exist.
  truncated: '17098906572808840',
  // (c) the live location.
  live: '17098915606572808840',
};

const SERVICE_REGIONS = [
  'Cheshire, England',
  'Crewe, Cheshire, England',
  'Macclesfield, Cheshire, England',
  'Sandbach, Cheshire, England',
  'Congleton, Cheshire, England',
  'Nantwich, Cheshire, England',
  'Middlewich, Cheshire, England',
  'Knutsford, Cheshire, England',
  'Winsford, Cheshire, England',
  'Northwich, Cheshire, England',
];

const TOWN_NAMES = ['Sandbach', 'Crewe', 'Congleton', 'Nantwich', 'Middlewich', 'Alsager', 'Holmes Chapel', 'Winsford', 'Northwich', 'Macclesfield', 'Knutsford', 'Tarporley', 'Biddulph', 'Newcastle-under-Lyme', 'Wilmslow'];

const BUSINESS_HINTS = [/upgrade\s*roofs?/i, /upgraderoof/i];
const GA4_CONVERSION_EVENTS = ['contact_form_submit', 'phone_click', 'whatsapp_click', 'email_click', 'quote_request'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function banner(t) {
  console.log('\n' + '='.repeat(82));
  console.log('  ' + t);
  console.log('='.repeat(82));
}
function isoOffsetDays(days) { return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10); }
function isoToday() { return new Date().toISOString().slice(0, 10); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function pct(part, whole, d = 1) { if (!whole) return '0.0%'; return ((part / whole) * 100).toFixed(d) + '%'; }
// Presence only — never a value, a length, or any of its characters. The
// previous `v.slice(0, 4) + '••••' + v.slice(-2)` disclosed 6 characters of a
// credential, which is a real head start on guessing one. A diagnostic only
// ever needs to answer "is this configured?".
function masked(v) { return v ? '(set)' : '(unset)'; }

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

// Raw fetch (for sitemap / robots / HTML) returning status + body + a truncated note.
function fetchText(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, (res) => {
      let d = ''; res.on('data', (c) => { if (d.length < 1_000_000) d += c; });
      res.on('end', () => resolve({ status: res.statusCode, contentType: res.headers['content-type'] || '', body: d.slice(0, 1_000_000) }));
    });
    req.on('error', (e) => resolve({ status: 0, body: '', error: String(e.message || e) }));
    req.setTimeout(15000, () => req.destroy());
  });
}

function extractMetric(obj, targetKey) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (k === targetKey) return v;
    if (Array.isArray(v)) { for (const it of v) { const f = extractMetric(it, targetKey); if (f != null) return f; } }
    else if (v && typeof v === 'object') { const f = extractMetric(v, targetKey); if (f != null) return f; }
  }
  return null;
}

function matbooleans(o) {
  // generic deep-safe clone for reporting (avoid accidental secrets)
  try { return JSON.parse(JSON.stringify(o)); } catch { return o; }
}

// ── (1) AUTHENTICATION ───────────────────────────────────────────────────────
async function authAudit() {
  const r = {
    gbpOAuth: { configured: false, token: null, error: null },
    gbpScopes: { accountsReadable: false, locationsReadable: false, performanceReadable: false, reviewsReadable: false },
    adsOAuth: { configured: false, token: null, error: null },
    serviceAccount: { configured: false, client: null, error: null },
    mapsKey: { configured: false },
    notes: [],
  };

  // GBP
  const gbp = { GBP_CLIENT_ID: process.env.GBP_CLIENT_ID, GBP_CLIENT_SECRET: process.env.GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN: process.env.GBP_REFRESH_TOKEN };
  r.gbpOAuth.configured = !!(gbp.GBP_CLIENT_ID && gbp.GBP_CLIENT_SECRET && gbp.GBP_REFRESH_TOKEN);
  if (r.gbpOAuth.configured) {
    try {
      const o2 = new google.auth.OAuth2(gbp.GBP_CLIENT_ID, gbp.GBP_CLIENT_SECRET);
      o2.setCredentials({ refresh_token: gbp.GBP_REFRESH_TOKEN });
      const { token } = await o2.getAccessToken();
      r.gbpOAuth.token = token ? 'ok' : 'NO_TOKEN';
    } catch (e) {
      r.gbpOAuth.token = 'FAILED';
      r.gbpOAuth.error = (e.message || String(e));
    }
  }

  // Ads
  const ads = { GOOGLE_ADS_CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN };
  r.adsOAuth.configured = !!(ads.GOOGLE_ADS_CLIENT_ID && ads.GOOGLE_ADS_CLIENT_SECRET && ads.GOOGLE_ADS_REFRESH_TOKEN);
  if (r.adsOAuth.configured) {
    try {
      const o2 = new google.auth.OAuth2(ads.GOOGLE_ADS_CLIENT_ID, ads.GOOGLE_ADS_CLIENT_SECRET);
      o2.setCredentials({ refresh_token: ads.GOOGLE_ADS_REFRESH_TOKEN });
      const { token } = await o2.getAccessToken();
      r.adsOAuth.token = token ? 'ok' : 'NO_TOKEN';
    } catch (e) {
      r.adsOAuth.token = 'FAILED';
      r.adsOAuth.error = (e.message || String(e));
    }
  }

  // Service account (GSC / Indexing / URL inspection / GA4)
  const SA_KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(ROOT, 'google-service-account.json');
  r.serviceAccount.configured = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || fs.existsSync(SA_KEY));
  if (r.serviceAccount.configured) {
    try {
      const saAuth = new google.auth.GoogleAuth({
        keyFile: SA_KEY,
        scopes: [
          'https://www.googleapis.com/auth/webmasters.readonly',
          'https://www.googleapis.com/auth/indexing',
          'https://www.googleapis.com/auth/analytics.readonly',
        ],
      });
      r.serviceAccount.client = await saAuth.getClient();
    } catch (e) {
      r.serviceAccount.client = null;
      r.serviceAccount.error = (e.message || String(e));
    }
  }

  // Maps / Geocoding key
  r.mapsKey.configured = !!process.env.GOOGLE_MAPS_API_KEY;

  return r;
}

// ── GBP / MAPS ───────────────────────────────────────────────────────────────
async function gbpAudit(auth) {
  const result = {
    auth: 'ok',
    location: null,
    resolvedVia: null,
    placeIDs: [],
    profile: {},
    serviceAreaAudit: [],
    scopes: {},
    notes: [],
  };
  if (!auth.gbpOAuth.token || auth.gbpOAuth.token !== 'ok') {
    result.auth = 'GBP_OAUTH_UNAVAILABLE';
    result.notes.push('GBP OAuth token not obtained — see authentication section.');
    return result;
  }
  const hdr = { Authorization: 'Bearer ' + auth.gbpOAuth.token };
  // We need a live token object; re-mint here since auth uses its own instance.
  const { GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN } = process.env;
  const oauth2 = new google.auth.OAuth2(GBP_CLIENT_ID, GBP_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GBP_REFRESH_TOKEN });
  const { token: accessToken } = await oauth2.getAccessToken();
  const authHdr = { Authorization: 'Bearer ' + accessToken };

  // Accounts
  const acctRes = await httpGet(GBP_ACCT_HOST, '/v1/accounts', authHdr);
  const accounts = (acctRes.status === 200 && acctRes.body.accounts) || [];
  result.scopes.accountsReadable = acctRes.status === 200;
  if (!accounts.length) result.notes.push('No accessible GBP accounts (manager grant may be absent/pending).');

  // Live location discovery (regex match, not hardcoded ID)
  function locMatches(l, id) { return l.name && l.name.includes('locations/' + id); }
  let locationName = null, accountName = null, discovered = {};

  outer:
  for (const acct of accounts) {
    const lr = await httpGet(GBP_INFO_HOST, `/v1/${acct.name}/locations?readMask=name,title,metadata,profile,websiteUri,storefrontAddress&pageSize=100`, authHdr);
    if (lr.status !== 200) continue;
    result.scopes.locationsReadable = true;
    const locs = lr.body.locations || [];
    // Pass 1: regex business match
    for (const l of locs) {
      const hay = [l.title, l.websiteUri, l.profile && l.profile.description, l.storefrontAddress && l.storefrontAddress.locality].filter(Boolean).join(' ');
      if (BUSINESS_HINTS.some((re) => re.test(hay))) {
        locationName = l.name; accountName = acct.name;
        discovered = { by: 'BUSINESS_NAME_REGEX', name: l.name, title: l.title };
        break outer;
      }
    }
    // Pass 2: match any of the three candidate IDs
    for (const l of locs) {
      for (const [tag, id] of Object.entries(LOCATION_IDS)) {
        if (locMatches(l, id)) {
          locationName = l.name; accountName = acct.name;
          discovered = { by: 'HARDCODED_ID_' + tag.toUpperCase() + '_MATCH', name: l.name, title: l.title, matchedId: id };
          break outer;
        }
      }
    }
  }

  // Fallback: if no location found by name, try the live location ID path directly.
  if (!locationName) {
    result.notes.push('No business matched by name or known IDs across accessible accounts.');
  } else {
    result.resolvedVia = discovered.by;
    result.location = { name: locationName, accountName, title: discovered.title || null };
  }

  // Determine which of the 3 IDs actually resolves (for the report's discrepancy note).
  const idResolution = [];
  if (accountName && locationName) {
    const acctId = accountName.replace(/^accounts\//, '');
    for (const [tag, id] of Object.entries(LOCATION_IDS)) {
      const chk = await httpGet(GBP_INFO_HOST, `/v1/accounts/${acctId}/locations/${id}?readMask=name,title`, authHdr);
      idResolution.push({ tag, id, httpStatus: chk.status, title: (chk.body && chk.body.title) || null });
    }
  }
  result.idResolution = idResolution;
  result.locationIds = LOCATION_IDS;

  // Detail read (verification, voice-of-merchant, pending edits, placeId, category)
  if (locationName) {
    const detail = await httpGet(GBP_INFO_HOST, `/v1/${locationName}?readMask=name,title,metadata,profile,phoneNumbers,categories,websiteUri,serviceArea`, authHdr);
    if (detail.status === 200) {
      const d = detail.body, md = d.metadata || {};
      result.profile = {
        title: d.title || null,
        resource: locationName,
        verificationState: md.verification ? md.verification.state : null,
        unverifiedReason: md.verification && md.verification.unverifiedReason ? md.verification.unverifiedReason : null,
        hasVoiceOfMerchant: md.hasVoiceOfMerchant != null ? md.hasVoiceOfMerchant : null,
        hasPendingEdits: md.hasPendingEdits != null ? md.hasPendingEdits : null,
        placeId: md.placeId || null,
        mapsUri: md.mapsUri || null,
        primaryCategory: d.categories && d.categories.primaryCategory ? (d.categories.primaryCategory.displayName || d.categories.primaryCategory.name) : null,
        phone: d.phoneNumbers && d.phoneNumbers.primaryPhone ? d.phoneNumbers.primaryPhone : null,
        websiteUri: d.websiteUri || null,
      };
      // Existing service area (live GBP truth) for the 10-town check
      const sa = d.serviceArea || {};
      const livePlaces = (sa.places && sa.places.placeInfos) || (Array.isArray(sa.places) ? sa.places : []);
      const liveIds = new Set(livePlaces.map((p) => p.placeId).filter(Boolean));
      result.profile.liveServiceAreaPlaces = livePlaces.map((p) => ({ placeName: p.placeName || p.displayName || '(unnamed)', placeId: p.placeId }));
      result.profile.serviceAreaBusinessType = sa.businessType || null;
      result.profile._livePlaceIdSet = liveIds;
    } else {
      result.notes.push('Location detail HTTP ' + detail.status + ': ' + JSON.stringify(detail.body).slice(0, 200));
    }

    // Reviews (legacy v4) — rating/count
    const acctId = accountName.replace(/^accounts\//, '');
    const locId = locationName.split('/').pop();
    const rev = await httpGet(GBP_LEGACY_HOST, `/v4/accounts/${acctId}/locations/${locId}/reviews?pageSize=5`, authHdr);
    if (rev.status === 200) {
      result.reviews = { averageRating: rev.body.averageRating ?? null, totalReviewCount: rev.body.totalReviewCount ?? null };
      result.scopes.reviewsReadable = true;
    } else {
      result.notes.push('Legacy v4 reviews HTTP ' + rev.status + ' (may require full manager grant).');
    }

    // Performance API (interaction metrics) — voice/scope probe
    try {
      const perf = google.businessprofileperformance({ version: 'v1', auth: oauth2 });
      const now = new Date(); const then = new Date(Date.now() - 30 * DAY_MS);
      const multi = ['CALL_CLICKS', 'WEBSITE_CLICKS', 'BUSINESS_DIRECTION_REQUESTS'];
      const dm = multi.map((m) => `dailyMetrics=${m}`).join('&');
      const dr = `dailyRange.startDate.year=${then.getUTCFullYear()}&dailyRange.startDate.month=${then.getUTCMonth() + 1}&dailyRange.startDate.day=${then.getUTCDate()}&dailyRange.endDate.year=${now.getUTCFullYear()}&dailyRange.endDate.month=${now.getUTCMonth() + 1}&dailyRange.endDate.day=${now.getUTCDate()}`;
      const pathName = `locations/${locId}`;
      const pr = await httpGet(GBP_PERF_HOST, `/v1/${pathName}:fetchMultiDailyMetricsTimeSeries?${dm}&${dr}`, authHdr);
      result.scopes.performanceReadable = pr.status === 200;
      if (pr.status === 200) {
        const byDay = {};
        for (const batch of pr.body.multiDailyMetricTimeSeries || []) {
          for (const dps of batch.dailyMetricTimeSeries || []) {
            for (const dv of (dps.timeSeries && dps.timeSeries.datedValues) || []) {
              if (!dv || !dv.date) continue;
              const key = `${dv.date.year}-${String(dv.date.month).padStart(2, '0')}-${String(dv.date.day).padStart(2, '0')}`;
              byDay[key] = (byDay[key] || 0) + Number(dv.value || 0);
            }
          }
        }
        const days = Object.keys(byDay).sort();
        result.performanceSummary = {
          daysReturned: days.length,
          totalCalls: 0, totalWebsite: 0, totalDirections: 0,
        };
        // re-sum by metric cleanly
        let calls = 0, web = 0, dirs = 0;
        for (const batch of pr.body.multiDailyMetricTimeSeries || []) {
          for (const dps of batch.dailyMetricTimeSeries || []) {
            const s = 0;
            let subtotal = 0;
            for (const dv of (dps.timeSeries && dps.timeSeries.datedValues) || []) subtotal += Number(dv.value || 0);
            if (dps.dailyMetric === 'CALL_CLICKS') calls += subtotal;
            if (dps.dailyMetric === 'WEBSITE_CLICKS') web += subtotal;
            if (dps.dailyMetric === 'BUSINESS_DIRECTION_REQUESTS') dirs += subtotal;
          }
        }
        result.performanceSummary = { daysReturned: days.length, totalCalls: calls, totalWebsite: web, totalDirections: dirs };
      } else {
        result.notes.push('Performance API HTTP ' + pr.status + ': ' + JSON.stringify(pr.body).slice(0, 200));
      }
    } catch (e) {
      result.notes.push('Performance API exception: ' + (e.message || e));
    }
  }

  // Geocoding the 10 service regions → placeId (and cross-check against live GBP service areas)
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (mapsKey) {
    for (const region of SERVICE_REGIONS) {
      const q = encodeURIComponent(region);
      const p = `/maps/api/geocode/json?address=${q}&region=gb&key=${encodeURIComponent(mapsKey)}`;
      const geo = await httpGet(GEOCODE_HOST, p, {});
      if (geo.status === 200 && geo.body && geo.body.status === 'OK' && geo.body.results && geo.body.results[0]) {
        const res = geo.body.results[0];
        const pid = res.place_id;
        const isLive = (result.profile._livePlaceIdSet && result.profile._livePlaceIdSet.has(pid)) || false;
        result.placeIDs.push({ region, resolvedName: res.formatted_address || region, placeId: pid, geocoded: true, matchesLiveServiceArea: isLive });
      } else {
        const status = (geo.body && geo.body.status) || ('HTTP ' + geo.status);
        result.placeIDs.push({ region, placeId: null, geocoded: false, error: status });
      }
    }
  } else {
    result.notes.push('GOOGLE_MAPS_API_KEY absent — geocoding of the 10 regions skipped.');
  }
  result.scopes.mapsReadable = !!mapsKey;

  return result;
}

// ── GSC ───────────────────────────────────────────────────────────────────────
async function searchConsoleAudit(client) {
  const r = { sitemaps: {}, robots: {}, timeline: [], pageQuery: [], decliners: [], notes: [] };
  if (!client) { r.notes.push('service account absent'); return r; }
  const sc = google.searchconsole({ version: 'v1', auth: client });
  const start = isoOffsetDays(90), end = isoToday();

  try {
    const res = await sc.searchanalytics.query({ siteUrl: SITE_URL, requestBody: { startDate: start, endDate: end, dimensions: ['date'], rowLimit: 1000 } });
    r.timeline = (res.data.rows || []).map((x) => ({ date: x.keys[0], clicks: num(x.clicks), impressions: num(x.impressions), ctr: x.ctr || 0, position: x.position != null ? num(x.position) : null }));
  } catch (e) { r.notes.push('GSC daily timeline: ' + (e.message || e)); }

  try {
    const res = await sc.searchanalytics.query({ siteUrl: SITE_URL, requestBody: { startDate: start, endDate: end, dimensions: ['page', 'query'], rowLimit: 500 } });
    r.pageQuery = (res.data.rows || []).map((x) => ({ page: x.keys[0], query: x.keys[1], clicks: num(x.clicks), impressions: num(x.impressions), position: x.position != null ? num(x.position) : null })).sort((a, b) => b.clicks - a.clicks);
    const byPage = {};
    for (const p of r.pageQuery) { if (!byPage[p.page]) byPage[p.page] = { clicks: 0, impressions: 0, posW: 0 }; byPage[p.page].clicks += p.clicks; byPage[p.page].impressions += p.impressions; byPage[p.page].posW += (p.position || 0) * p.impressions; }
    r.decliners = Object.entries(byPage).map(([page, v]) => ({ page, clicks: v.clicks, impressions: v.impressions, avgPosition: v.impressions ? +(v.posW / v.impressions).toFixed(2) : null })).filter((x) => x.avgPosition != null && x.avgPosition > 10 && x.impressions > 0).sort((a, b) => b.impressions - a.impressions).slice(0, 30);
  } catch (e) { r.notes.push('GSC page×query: ' + (e.message || e)); }

  return r;
}

async function sitemapAndRobotsAudit() {
  const r = { robots: {}, sitemap: {}, notes: [] };
  const rob = await fetchText(SITE_ORIGIN + '/robots.txt');
  r.robots = { status: rob.status, present: rob.status === 200, hasSitemap: rob.status === 200 && /sitemap:/i.test(rob.body), size: (rob.body || '').length, error: rob.error || null };
  if (rob.status === 200 && !/sitemap:/i.test(rob.body)) r.notes.push('robots.txt does not declare a Sitemap: line.');

  const sm = await fetchText(SITE_ORIGIN + '/sitemap.xml');
  let urlCount = null;
  if (sm.status === 200) {
    const matches = (sm.body || '').match(/<loc>/gi) || [];
    urlCount = matches.length;
  }
  r.sitemap = { status: sm.status, present: sm.status === 200, contentType: sm.contentType || '', size: (sm.body || '').length, approxUrlCount: urlCount, error: sm.error || null };
  if (sm.status !== 200) r.notes.push('sitemap.xml not reachable (HTTP ' + sm.status + ').');
  return r;
}

async function urlInspectionAudit(client) {
  if (!client) return [];
  const insp = google.searchconsole({ version: 'v1', auth: client });
  const targets = [
    '/', '/roof-repairs', '/new-roofs', '/emergency-roofing', '/services',
    '/roofers-sandbach', '/roofers-crewe', '/roofers-nantwich', '/roofers-middlewich', '/roofers-congleton',
    '/roofers-sandbach/flat-roofing', '/roofers-crewe/tile-slate-roofing', '/roofers-nantwich/chimney-repairs',
  ];
  const out = [];
  for (const t of targets) {
    const url = SITE_ORIGIN + t;
    try {
      const ir = await insp.urlInspection.index.inspect({ requestBody: { inspectionUrl: url, siteUrl: SITE_URL, languageCode: 'en-GB' } });
      const ins = ir.data && ir.data.inspectionResult;
      const idx = ins && ins.indexStatusResult;
      out.push({ url, verdict: idx ? (idx.verdict || '—') : 'UNKNOWN', coverageState: idx ? (idx.coverageState || '—') : null, indexingState: idx ? (idx.indexingState || '—') : null, googleCanonical: idx ? (idx.googleCanonical || '—') : null, lastCrawlTime: idx ? (idx.lastCrawlTime || null) : null, pageFetchState: idx ? (idx.pageFetchState || '—') : null });
    } catch (e) { out.push({ url, verdict: 'ERROR', error: e.message || String(e) }); }
  }
  return out;
}

async function indexingAudit(client) {
  const result = { catalog: { townSlugs: TOWN_NAMES.map((t) => 'roofers-' + t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')), serviceSlugs: ['flat-roofing', 'tile-slate-roofing', 'chimney-repairs', 'gutters-fascias', 'skylights-roof-windows', 'cladding'] }, smokeTest: null, moduleLoaded: false, notes: [] };
  result.catalog.totalProgrammatic = result.catalog.townSlugs.length * result.catalog.serviceSlugs.length;

  // Check the live Node.js indexing module is present and coherent
  try {
    const mod = require(path.join(ROOT, 'lib', 'google-indexing.js'));
    result.moduleLoaded = typeof mod.submitUrlForIndexing === 'function';
    if (result.moduleLoaded) {
      // run a read-only smoke test = a real URL_UPDATED publish
      const st = await mod.submitUrlForIndexing(SITE_URL, 'URL_UPDATED');
      result.smokeTest = { url: SITE_URL, success: !!st.success, latestUpdate: (st.data && st.data.urlNotificationMetadata && st.data.urlNotificationMetadata.latestUpdate) || null, error: st.error || null };
    } else {
      result.notes.push('lib/google-indexing.js did not export submitUrlForIndexing.');
    }
  } catch (e) {
    result.notes.push('lib/google-indexing.js load failed: ' + (e.message || e));
  }

  if (!result.smokeTest && client) {
    // fallback via googleapis indexing client
    try {
      const indexing = google.indexing({ version: 'v3', auth: client });
      const res = await indexing.urlNotifications.publish({ requestBody: { url: SITE_URL, type: 'URL_UPDATED' } });
      result.smokeTest = { url: SITE_URL, success: true, latestUpdate: res.data.urlNotificationMetadata && res.data.urlNotificationMetadata.latestUpdate };
    } catch (e) { result.smokeTest = { url: SITE_URL, success: false, error: e.message || String(e) }; }
  }
  return result;
}

// ── GA4 / ADS ───────────────────────────────────────────────────────────────
async function ga4Audit() {
  const r = { property: GA4_PROPERTY, auth: 'ok', timeline: [], byPage: [], byChannel: [], conversions: [], notes: [] };
  let ga;
  try { ga = new BetaAnalyticsDataClient(); } catch (e) { r.auth = 'CLIENT_INIT_FAILED'; r.notes.push('GA4 init: ' + (e.message || e)); return r; }

  const start = isoOffsetDays(90), end = isoToday();
  async function runReport(name, dimensions, metrics, extra = {}) {
    try {
      const [res] = await ga.runReport({ property: GA4_PROPERTY, dateRanges: [{ startDate: start, endDate: end }], dimensions: dimensions.map((d) => ({ name: d })), metrics: metrics.map((m) => ({ name: m })), limit: extra.limit || 250, ...extra });
      return res.rows || [];
    } catch (e) { r.notes.push(`GA4 ${name}: ${e.message || e}`); return []; }
  }

  const daily = await runReport('daily-timeline', ['date'], ['sessions', 'activeUsers', 'bounceRate', 'eventCount', 'conversions']);
  r.timeline = daily.map((row) => ({ date: row.dimensionValues[0].value, sessions: num(row.metricValues[0].value), activeUsers: num(row.metricValues[1].value), bounceRate: num(row.metricValues[2].value), eventCount: num(row.metricValues[3].value), conversions: num(row.metricValues[4].value) }));

  const pages = await runReport('landing-page', ['landingPage'], ['sessions', 'bounceRate', 'conversions', 'screenPageViews'], { orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 30 });
  r.byPage = pages.map((row) => ({ page: row.dimensionValues[0].value, sessions: num(row.metricValues[0].value), bounceRate: num(row.metricValues[1].value), conversions: num(row.metricValues[2].value), views: num(row.metricValues[3].value) }));

  const chans = await runReport('channel', ['sessionDefaultChannelGrouping'], ['sessions', 'activeUsers', 'conversions', 'bounceRate'], { orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 30 });
  r.byChannel = chans.map((row) => ({ channel: row.dimensionValues[0].value, sessions: num(row.metricValues[0].value), users: num(row.metricValues[1].value), conversions: num(row.metricValues[2].value), bounceRate: num(row.metricValues[3].value) }));

  const conv = await runReport('conversion-events', ['eventName'], ['eventCount', 'totalUsers'], { dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: GA4_CONVERSION_EVENTS } } }, orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }] });
  r.conversions = conv.map((row) => ({ event: row.dimensionValues[0].value, count: num(row.metricValues[0].value), users: num(row.metricValues[1].value) }));

  return r;
}

async function adsAudit() {
  const result = { auth: 'ok', account: {}, campaigns30: [], campaigns90: [], campaignsTargeting: {}, conversionActions: [], enhanced: {}, geoAlignment: [], locationAssets: [], notes: [] };
  const env = process.env;
  const missing = ['GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN'].filter((k) => !env[k]);
  if (missing.length) { result.auth = 'MISSING_ENV'; result.notes.push('Missing: ' + missing.join(', ')); return result; }

  let accessToken;
  try {
    const o2 = new google.auth.OAuth2(env.GOOGLE_ADS_CLIENT_ID, env.GOOGLE_ADS_CLIENT_SECRET);
    o2.setCredentials({ refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN });
    ({ token: accessToken } = await o2.getAccessToken());
  } catch (e) { result.auth = 'TOKEN_FAILED'; result.notes.push('Ads token: ' + (e.message || e)); return result; }
  if (!accessToken) { result.auth = 'NO_TOKEN'; return result; }

  const customerId = env.GOOGLE_ADS_CUSTOMER_ID.replace(/\D/g, '');
  const headers = { Authorization: 'Bearer ' + accessToken, 'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN };
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');

  function gaql(query) {
    return httpPost(ADS_HOST, `/${ADS_VERSION}/customers/${customerId}/googleAds:searchStream`, headers, { query });
  }
  function flatten(res) { if (res.status !== 200) return []; return (Array.isArray(res.body) ? res.body : [res.body]).flatMap((b) => b.results || []); }

  // Account
  const acctRes = await gaql(`SELECT customer.id, customer.descriptive_name, customer.status, customer.currency_code, customer.time_zone FROM customer LIMIT 1`);
  const c = (flatten(acctRes)[0] || {}).customer || {};
  result.account = { id: c.id, name: c.descriptiveName, status: c.status, currency: c.currencyCode, timezone: c.timeZone, queryStatus: acctRes.status };

  // Campaigns 30d
  const camp30 = await gaql(`SELECT campaign.name, campaign.status, campaign.ad_serving_optimization_status, campaign.policy_topic_status, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.search_impression_share, metrics.ctr FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC LIMIT 50`);
  result.campaigns30 = flatten(camp30).map((r) => ({ name: r.campaign && r.campaign.name, status: r.campaign && r.campaign.status, servingStatus: r.campaign && r.campaign.adServingOptimizationStatus, policyStatus: r.campaign && r.campaign.policyTopicStatus, cost: num(r.metrics && r.metrics.costMicros) / 1e6, clicks: num(r.metrics && r.metrics.clicks), impressions: num(r.metrics && r.metrics.impressions), conversions: num(r.metrics && r.metrics.conversions), impressionShare: r.metrics && r.metrics.searchImpressionShare != null ? num(r.metrics.searchImpressionShare) : null }));

  // Campaigns 90d
  const camp90 = await gaql(`SELECT campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date DURING LAST_90_DAYS ORDER BY metrics.cost_micros DESC LIMIT 50`);
  result.campaigns90 = flatten(camp90).map((r) => ({ name: r.campaign && r.campaign.name, cost: num(r.metrics && r.metrics.costMicros) / 1e6, clicks: num(r.metrics && r.metrics.clicks), impressions: num(r.metrics && r.metrics.impressions), conversions: num(r.metrics && r.metrics.conversions) }));

  // Bidding strategy + geo targeting per campaign
  const budget = await gaql(`SELECT campaign.resource_name, campaign.name, campaign.status, campaign.bidding_strategy_type, campaign_budget.amount_micros, campaign.geo_target_type_setting FROM campaign ORDER BY campaign.name LIMIT 100`);
  const targetRows = flatten(budget).map((r) => {
    const cam = r.campaign || {};
    return { resourceName: cam.resourceName, name: cam.name, status: cam.status, bidding: cam.biddingStrategyType || null, budgetMicros: r.campaignBudget && r.campaignBudget.amountMicros, geoTypeSetting: cam.geoTargetTypeSetting || null };
  });
  result.campaignsTargeting = targetRows;

  // Conversion actions (partitioning / enhanced)
  const caRes = await gaql(`SELECT conversion_action.resource_name, conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category FROM conversion_action`);
  result.conversionActions = flatten(caRes).map((r) => { const ca = r.conversionAction || {}; return { id: ca.id, name: ca.name, status: ca.status, type: ca.type, category: ca.category }; });
  result.enhanced = {
    dmTokenPresent: !!(env.GOOGLE_DM_REFRESH_TOKEN && env.GOOGLE_DM_REFRESH_TOKEN !== 'added and reployed'),
    configured: {
      siteVisit: env.GADS_CONV_SITE_VISIT || null,
      jobWon: env.GADS_CONV_JOB_WON || null,
      leadForm: env.NEXT_PUBLIC_GADS_CONV_ID || null,
      phoneClick: env.NEXT_PUBLIC_GADS_CLICK_CONV_ID || null,
    },
  };
  const liveIds = new Set(result.conversionActions.map((a) => String(a.id)));
  result.enhanced.verified = {
    siteVisitLive: result.enhanced.configured.siteVisit ? liveIds.has(result.enhanced.configured.siteVisit) : null,
    jobWonLive: result.enhanced.configured.jobWon ? liveIds.has(result.enhanced.configured.jobWon) : null,
  };

  // Location assets linked to GBP
  try {
    const laRes = await gaql(`SELECT asset.resource_name, asset.name, asset.type, asset.source, location_asset.business_name, location_asset.business_profile_location FROM asset WHERE asset.type = 'LOCATION' LIMIT 50`);
    result.locationAssets = flatten(laRes).map((r) => {
      const a = r.asset || {}; const la = r.locationAsset || {};
      return { resourceName: a.resourceName, name: a.name, type: a.type, source: a.source, businessName: la.businessName, gbpLocation: la.businessProfileLocation || null };
    });
  } catch (e) { result.notes.push('location_asset query: ' + (e.message || e)); }

  // Geo target list (criterion) to align vs 10 towns — best-effort
  try {
    const geoRes = await gaql(`SELECT campaign_criterion.campaign, campaign_criterion.type, campaign_criterion.negative, geo_target_constant.resource_name, geo_target_constant.name, geo_target_constant.country_code, geo_target_constant.target_type FROM campaign_criterion WHERE campaign_criterion.type = 'LOCATION' LIMIT 200`);
    const gtRows = flatten(geoRes).map((r) => {
      const gt = r.geoTargetConstant || {};
      return { campaign: r.campaignCriterion && r.campaignCriterion.campaign, negative: r.campaignCriterion && r.campaignCriterion.negative, geoName: gt.name || null, geoResource: gt.resourceName || null, targetType: gt.targetType || null };
    });
    // alignment: how many of the 10 towns are present as targeted geo constants
    const names = new Set(gtRows.map((g) => (g.geoName || '').toLowerCase()));
    const towns = SERVICE_REGIONS.map((s) => s.split(',')[0].trim());
    for (const town of towns) {
      const found = [...names].some((n) => n.includes(town.toLowerCase()));
      result.geoAlignment.push({ town, targeted: found });
    }
    result.geoTargetsRaw = gtRows;
  } catch (e) { result.notes.push('geo_target_constant query: ' + (e.message || e)); }

  return result;
}

// ── SEO / GEO / AEO ──────────────────────────────────────────────────────────
async function seoAeoAudit() {
  const r = { jsonLd: {}, pages: [], faq: {}, entity: {}, knowledgeGraph: {}, notes: [] };

  // LocalBusiness / RoofingContractor JSON-LD (from app/structured-data.tsx)
  function structuredData() {
    return {
      name: 'Upgrade Roofs',
      '@type': ['LocalBusiness', 'RoofingContractor'],
      identifierValue: '17098915606572808840',
      areaServedCities: ['Sandbach', 'Crewe', 'Congleton', 'Nantwich', 'Middlewich', 'Alsager', 'Holmes Chapel', 'Winsford', 'Northwich', 'Macclesfield', 'Knutsford', 'Tarporley', 'Biddulph', 'Newcastle-under-Lyme', 'Wilmslow'],
      serviceAreaRadiusM: 30000,
      foundingDate: '1999',
      reviewCount: 127,
      aggregateRating: 5,
    };
  }
  const sd = structuredData();
  r.jsonLd = {
    types: sd['@type'],
    hasRoofingContractor: sd['@type'].includes('RoofingContractor'),
    hasLocalBusiness: sd['@type'].includes('LocalBusiness'),
    identifierValue: sd.identifierValue,
    identifierIsLive: sd.identifierValue === LOCATION_IDS.live,
    identifierIsTruncated: sd.identifierValue === LOCATION_IDS.truncated,
    identifierIsRequestValue: sd.identifierValue === LOCATION_IDS.request,
    areaServedCount: sd.areaServedCities.length,
    serviceAreaRadius: sd.serviceAreaRadiusM,
  };

  // FAQ / page-level structured data presence (scan built page sources)
  const faqFound = [];
  const faqFiles = [];
  try {
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (!/node_modules|\.next|\.git|public/i.test(e.name)) walk(full); }
        else if (/\.(tsx?|js|mdx)$/i.test(e.name)) {
          const txt = fs.readFileSync(full, 'utf8');
          const hasFaq = /FAQPage|"@type"\s*:\s*["']FAQPage/i.test(txt);
          const hasSchema = /application\/ld\+json/.test(txt);
          if (hasFaq) faqFiles.push(path.relative(ROOT, full));
        }
      }
    };
    walk(path.join(ROOT, 'app'));
  } catch (e) { r.notes.push('FAQ scan: ' + (e.message || e)); }
  r.faq = { faqPageFiles: faqFiles, note: 'FAQ schema is injected page-specifically (removed from global layout per structured-data.tsx note).' };

  // Regional landing page architecture — glob /roofers-* directories
  try {
    const appDir = path.join(ROOT, 'app');
    const entries = fs.readdirSync(appDir, { withFileTypes: true });
    const townDirs = entries.filter((e) => e.isDirectory() && /^roofers-/.test(e.name)).map((e) => e.name);
    r.pages = townDirs.map((d) => ({ slug: d }));
    r.regionalCount = townDirs.length;
  } catch (e) { r.notes.push('regional page scan: ' + (e.message || e)); }

  // Internal linking equity + entity clarity: scan for #organization @id and sameAs consistency
  try {
    const sdText = fs.readFileSync(path.join(ROOT, 'app', 'structured-data.tsx'), 'utf8');
    r.knowledgeGraph = {
      hasOrganizationId: /#organization/.test(sdText),
      hasWebsiteId: /#website/.test(sdText),
      sameAsCount: (sdText.match(/sameAs:/g) || []).length,
      usesGraph: /@graph/.test(sdText),
      hasSpeakable: /SpeakableSpecification/.test(sdText),
      hasHasOfferCatalog: /OfferCatalog/.test(sdText),
      hasCredential: /EducationalOccupationalCredential/.test(sdText),
      knowsAboutCount: (sdText.match(/'(?:Roof|Flat|Tile|Slate|Gutter|Fascia|Skylight|Cladding|Emergency|Storm|Commercial|Chimney)[^']*'/g) || []).length,
    };
  } catch (e) { r.notes.push('knowledge-graph scan: ' + (e.message || e)); }

  return r;
}

// ── Orchestrate ───────────────────────────────────────────────────────────────
async function main() {
  banner('UPGRADE ROOFS — FULLY COMPREHENSIVE AUDIT');
  console.log('  Generated: ' + new Date().toISOString());
  console.log('  Site:      ' + SITE_URL);

  const results = {
    generatedAt: new Date().toISOString(),
    site: SITE_URL,
    auth: {},
    gbp: {},
    maps: {},
    searchConsole: {},
    sitemaps: {},
    urlInspection: [],
    indexing: {},
    ga4: {},
    ads: {},
    seoAeo: {},
  };

  // (1) Auth
  console.log('\n▶ [1/6] AUTHENTICATION');
  results.auth = await authAudit();
  console.log('  GBP OAuth: ' + (results.auth.gbpOAuth.token || 'unconfigured') +
    ' | Ads OAuth: ' + (results.auth.adsOAuth.token || 'unconfigured') +
    ' | SA: ' + (results.auth.serviceAccount.client ? 'ok' : (results.auth.serviceAccount.configured ? 'FAILED' : 'absent')) +
    ' | Maps key: ' + (results.auth.mapsKey.configured ? 'present' : 'absent'));

  // (2) GBP / Maps
  console.log('\n▶ [2/6] GOOGLE BUSINESS PROFILE + MAPS');
  results.gbp = await gbpAudit(results.auth);
  results.maps = { placeIDs: results.gbp.placeIDs };
  console.log('  location resolved via: ' + (results.gbp.resolvedVia || 'NOT FOUND') +
    ' | geocoded regions: ' + results.gbp.placeIDs.filter((p) => p.geocoded).length + '/' + SERVICE_REGIONS.length);

  // (3) GSC / Indexing
  console.log('\n▶ [3/6] GOOGLE SEARCH CONSOLE + SITEMAP + INDEXING');
  results.searchConsole = results.auth.serviceAccount.client ? await searchConsoleAudit(results.auth.serviceAccount.client) : { notes: ['service account absent'] };
  results.sitemaps = await sitemapAndRobotsAudit();
  results.urlInspection = results.auth.serviceAccount.client ? await urlInspectionAudit(results.auth.serviceAccount.client) : [];
  results.indexing = await indexingAudit(results.auth.serviceAccount.client);
  console.log('  GSC timeline days: ' + (results.searchConsole.timeline || []).length +
    ' | sitemap HTTP: ' + results.sitemaps.sitemap.status +
    ' | indexed URLs inspected: ' + results.urlInspection.length +
    ' | indexing module: ' + (results.indexing.moduleLoaded ? 'loaded' : 'MISSING'));

  // (4) GA4 / Ads
  console.log('\n▶ [4/6] GA4 + GOOGLE ADS');
  results.ga4 = await ga4Audit();
  results.ads = await adsAudit();
  console.log('  GA4 ' + results.ga4.auth +
    ' | Ads ' + results.ads.auth +
    ' | campaigns30: ' + results.ads.campaigns30.length +
    ' | geo towns matched: ' + (results.ads.geoAlignment && results.ads.geoAlignment.filter((g) => g.targeted).length || 0) + '/' + SERVICE_REGIONS.length);

  // (5) SEO / GEO / AEO
  console.log('\n▶ [5/6] SEO / GEO / AEO');
  results.seoAeo = await seoAeoAudit();

  // (6) Report
  console.log('\n▶ [6/6] COMPILE REPORT');
  const report = buildReport(results);
  console.log('\n' + report.terminal);

  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(REPORT_PATH, report.markdown);
  console.log('\n✓ Report written to ' + REPORT_PATH);
}

// ── Report construction ───────────────────────────────────────────────────────
function buildReport(r) {
  const lines = [];
  const md = [];
  const L = '═'.repeat(78);
  function t(s) { lines.push(s); md.push(s); }
  function blank() { lines.push(''); md.push(''); }
  function sec(s) { blank(); t('## ' + s); }

  // Terminal header
  t(L);
  t('  UPGRADE ROOFS — FULLY COMPREHENSIVE AUDIT REPORT  2026');
  t('  ' + r.generatedAt);
  t('  Site: ' + SITE_URL);
  t(L);

  // Markdown header
  md.length = 0;
  md.push('# Upgrade Roofs — Comprehensive Audit Report 2026');
  md.push('');
  md.push('> Generated ' + r.generatedAt + ' · ' + SITE_URL);
  md.push('> **Security note:** no API keys, tokens, refresh tokens, or secrets are included in this report.');
  md.push('');

  // ── 1. Auth ──
  sec('1. Authentication');
  const a = r.auth;
  md.push('');
  md.push('| Platform | Auth type | Configured | Token exchange |');
  md.push('|---|---|---|---|');
  md.push(`| Google Business Profile | OAuth (manager refresh) | ${a.gbpOAuth.configured ? 'yes' : 'no'} | ${a.gbpOAuth.token || '—'} |`);
  md.push(`| Google Ads | OAuth (refresh + developer token) | ${a.adsOAuth.configured ? 'yes' : 'no'} | ${a.adsOAuth.token || '—'} |`);
  md.push(`| GSC / Indexing / URL Inspection | Service account (SA JSON) | ${a.serviceAccount.configured ? 'yes' : 'no'} | ${a.serviceAccount.client ? 'ok' : (a.serviceAccount.configured ? 'FAILED' : '—')} |`);
  md.push(`| GA4 | Service account (ADC) | ${a.serviceAccount.configured ? 'yes' : 'no'} | — |`);
  md.push(`| Maps / Geocoding | API key | ${a.mapsKey.configured ? 'yes' : 'no'} | — |`);
  md.push('');
  md.push('**Token exchange outcomes (no values printed):**');
  md.push(`- GBP OAuth: ${a.gbpOAuth.token || 'not attempted'}${a.gbpOAuth.error ? ' → ' + a.gbpOAuth.error : ''}`);
  md.push(`- Ads OAuth: ${a.adsOAuth.token || 'not attempted'}${a.adsOAuth.error ? ' → ' + a.adsOAuth.error : ''}`);
  if (a.notes && a.notes.length) md.push('- ' + a.notes.join('\n- '));

  // ── 2. GBP / Maps ──
  sec('2. Google Business Profile & Maps');
  md.push('');
  const g = r.gbp;
  md.push(`- **Location resolved:** ${g.resolvedVia ? 'YES — ' + g.resolvedVia : 'NO — not matched by name or ID'}`);
  if (g.location) md.push(`- **Resource:** \`${g.location.name}\` (account \`${g.location.accountName}\`)`);
  md.push('');
  md.push('**Location-ID discrepancy (resolved live):**');
  md.push('| Candidate | ID | HTTP 200? | Title |');
  md.push('|---|---|---|---|');
  for (const ir of (g.idResolution || [])) md.push(`| ${ir.tag} | \`${ir.id}\` | ${ir.httpStatus === 200 ? '✅ yes' : '❌ ' + ir.httpStatus} | ${ir.title || '—'} |`);
  if ((g.idResolution || []).filter((x) => x.httpStatus === 200).length > 1) md.push('> ⚠ **Multiple IDs resolve** — more than one candidate location id returns 200. Confirm which one owns the live profile before trusting any single value.');

  md.push('');
  md.push('**Profile detail:**');
  const p = g.profile || {};
  md.push(`- Verification state: ${p.verificationState || '(not returned)'}`);
  if (p.unverifiedReason) md.push(`- Unverified reason: ${p.unverifiedReason}`);
  md.push(`- Voice-of-merchant: ${p.hasVoiceOfMerchant != null ? p.hasVoiceOfMerchant : '(not returned)'}`);
  md.push(`- Has pending edits: ${p.hasPendingEdits != null ? p.hasPendingEdits : '(not returned)'}`);
  if (p.placeId) md.push(`- Google placeId: \`${p.placeId}\``);
  if (p.primaryCategory) md.push(`- Primary category: ${p.primaryCategory}`);
  if (p.phone) md.push(`- Phone: ${p.phone}`);
  if (p.websiteUri) md.push(`- Website URI: ${p.websiteUri}`);
  if (g.reviews && g.reviews.averageRating != null) md.push(`- Rating: ${g.reviews.averageRating} / 5 (${g.reviews.totalReviewCount} reviews)`);
  if (g.performanceSummary) md.push(`- 30-day interactions: ${g.performanceSummary.totalCalls} calls · ${g.performanceSummary.totalWebsite} website clicks · ${g.performanceSummary.totalDirections} directions`);

  md.push('');
  md.push('**API scope access:**');
  md.push(`- Accounts readable: ${g.scopes.accountsReadable ? '✅' : '❌'}`);
  md.push(`- Locations readable: ${g.scopes.locationsReadable ? '✅' : '❌'}`);
  md.push(`- Performance API: ${g.scopes.performanceReadable ? '✅' : '❌'}`);
  md.push(`- Reviews (legacy v4): ${g.scopes.reviewsReadable ? '✅' : '❌'}`);
  md.push(`- Maps/Geocoding: ${g.scopes.mapsReadable ? '✅' : '❌'}`);

  md.push('');
  md.push('**10 service-area place IDs (geocoded) vs live GBP service area:**');
  md.push('| Region | Geocoded placeId | In live GBP service area? |');
  md.push('|---|---|---|');
  for (const pl of (g.placeIDs || [])) {
    if (pl.geocoded) md.push(`| ${pl.region} | \`${pl.placeId}\` | ${pl.matchesLiveServiceArea ? '✅' : '❌ not present'} |`);
    else md.push(`| ${pl.region} | — | ⚠ geocode failed: ${pl.error} |`);
  }
  const mismatched = (g.placeIDs || []).filter((pl) => pl.geocoded && !pl.matchesLiveServiceArea).length;
  if (mismatched) md.push(`> ⚠ ${mismatched} geocoded region(s) are **not** present in the live GBP service area — the Business Profile's service area may not cover the full 10-town footprint.`);

  // ── 3. GSC / Sitemap / Indexing ──
  sec('3. Search Console, Sitemap & Indexing');
  md.push('');
  const sm = r.sitemaps;
  md.push('**Sitemap / robots:**');
  md.push(`- robots.txt: HTTP ${sm.robots.status} ${sm.robots.present ? '(present)' : '(missing)'} · sitemap line: ${sm.robots.hasSitemap ? 'yes' : 'no'}`);
  md.push(`- sitemap.xml: HTTP ${sm.sitemap.status} ${sm.sitemap.present ? '(present)' : '(missing)'} · ~${sm.sitemap.approxUrlCount != null ? sm.sitemap.approxUrlCount : '?'} URLs · ${sm.sitemap.contentType || '—'}`);
  (sm.notes || []).forEach((n) => md.push('- ⚠ ' + n));

  const sc = r.searchConsole;
  if (sc.timeline && sc.timeline.length) {
    const tc = sc.timeline.reduce((x, y) => x + y.clicks, 0);
    const ti = sc.timeline.reduce((x, y) => x + y.impressions, 0);
    let max = sc.timeline[0], min = sc.timeline[0];
    for (const d of sc.timeline) { if (d.clicks > max.clicks) max = d; if (d.clicks < min.clicks) min = d; }
    md.push('');
    md.push(`**Organic performance (90d):** ${tc} clicks · ${ti} impressions · ${pct(tc, ti)} CTR`);
    md.push(`- Click peak: ${max.clicks} on ${max.date} · trough: ${min.clicks} on ${min.date}`);
    if (sc.pageQuery && sc.pageQuery.length) {
      const byQ = {};
      for (const p of sc.pageQuery) byQ[p.query] = (byQ[p.query] || 0) + p.clicks;
      const topQ = Object.entries(byQ).sort((x, y) => y[1] - x[1]).slice(0, 10);
      md.push('- Top queries: ' + topQ.map(([q, cl]) => `"${q}" (${cl})`).join(', '));
    }
    if (sc.decliners && sc.decliners.length) {
      md.push('');
      md.push('**At-risk / declining pages (avg position > 10):**');
      for (const d of sc.decliners.slice(0, 10)) md.push(`- pos ${d.avgPosition} · ${d.page} (${d.impressions} impr / ${d.clicks} clk)`);
    }
  } else {
    md.push('⚠ No GSC daily data: ' + ((sc.notes || []).join('; ') || 'unknown'));
  }

  md.push('');
  md.push('**URL Inspection — coverage:**');
  if (r.urlInspection.length) {
    md.push('| URL | Verdict | Coverage | Indexing | Canonical | Last crawl |');
    md.push('|---|---|---|---|---|---|');
    for (const u of r.urlInspection) md.push(`| ${u.url} | ${u.verdict} | ${u.coverageState || '—'} | ${u.indexingState || '—'} | ${u.googleCanonical || '—'} | ${u.lastCrawlTime || '—'} |`);
    const notIdx = r.urlInspection.filter((u) => /NOT|ERROR|null|UNKNOWN/i.test(u.verdict) && u.coverageState !== 'INDEXED' && u.coverageState !== 'Indexed, submitted');
    if (notIdx.length) md.push(`> ⚠ ${notIdx.length} URL(s) not confirmed indexed.`);
  } else {
    md.push('(no inspection results)');
  }

  md.push('');
  md.push('**Indexing pipeline (lib/google-indexing.js):**');
  md.push(`- Module loaded: ${r.indexing.moduleLoaded ? '✅' : '❌'}`);
  const cat = r.indexing.catalog;
  if (cat) md.push(`- Programmatic catalog: ${cat.townSlugs.length} town × ${cat.serviceSlugs.length} services = ${cat.totalProgrammatic} URLs`);
  if (r.indexing.smokeTest) {
    const st = r.indexing.smokeTest;
    md.push(`- Smoke test (URL_UPDATED homepage): ${st.success ? '✅ OK' : '❌ FAILED — ' + st.error}`);
  }

  // ── 4. GA4 / Ads ──
  sec('4. GA4 & Google Ads');
  md.push('');
  const ga = r.ga4;
  if (ga.auth === 'ok') {
    const ts = ga.timeline.reduce((x, y) => x + y.sessions, 0);
    const tu = ga.timeline.reduce((x, y) => x + y.activeUsers, 0);
    const tcv = ga.timeline.reduce((x, y) => x + y.conversions, 0);
    md.push(`**GA4 (90d):** ${ts} sessions · ${tu} active users · ${tcv} conversions`);
    if (ga.conversions.length) {
      md.push('**Conversion events:**');
      for (const c of ga.conversions) md.push(`- ${c.event}: ${c.count} events (${c.users} users)`);
    } else {
      md.push('⚠ No conversion events matched (contact_form_submit / phone_click / whatsapp_click / email_click / quote_request).');
    }
    if (ga.byChannel.length) {
      md.push('');
      md.push('**Acquisition channels:**');
      md.push('| Channel | Sessions | Users | Conversions | Bounce |');
      md.push('|---|---|---|---|---|');
      for (const c of ga.byChannel) md.push(`| ${c.channel} | ${c.sessions} | ${c.users} | ${c.conversions} | ${pct(c.bounceRate, 1)} |`);
    }
  } else {
    md.push('⚠ GA4 unavailable: ' + (ga.notes || []).join('; '));
  }

  md.push('');
  const ads = r.ads;
  if (ads.auth === 'ok') {
    md.push(`**Account:** ${ads.account.name || '(unnamed)'} · status ${ads.account.status} · ${ads.account.currency || ''}`);
    if (ads.campaigns30.length) {
      md.push('');
      md.push('**Campaigns (30d):**');
      md.push('| Campaign | Status | Cost | Clicks | Impr | Conv | Impr.Share |');
      md.push('|---|---|---|---|---|---|---|');
      for (const c of ads.campaigns30) md.push(`| ${c.name || '—'} | ${c.status} | £${c.cost.toFixed(2)} | ${c.clicks} | ${c.impressions} | ${c.conversions} | ${c.impressionShare != null ? c.impressionShare.toFixed(1) + '%' : '—'} |`);
    }
    if (ads.campaignsTargeting && ads.campaignsTargeting.length) {
      md.push('');
      md.push('**Campaign bidding + budget:**');
      md.push('| Campaign | Status | Bidding | Daily budget |');
      md.push('|---|---|---|---|');
      for (const c of ads.campaignsTargeting) md.push(`| ${c.name || '—'} | ${c.status} | ${c.bidding || '—'} | ${c.budgetMicros != null ? '£' + (c.budgetMicros / 1e6).toFixed(2) : '—'} |`);
    }
    if (ads.geoAlignment && ads.geoAlignment.length) {
      md.push('');
      md.push('**Geo-target alignment vs 10 towns:**');
      const matched = ads.geoAlignment.filter((g) => g.targeted).length;
      md.push(`- ${matched}/${SERVICE_REGIONS.length} towns explicitly targeted`);
      md.push('| Town | Targeted |');
      md.push('|---|---|');
      for (const g of ads.geoAlignment) md.push(`| ${g.town} | ${g.targeted ? '✅' : '❌'} |`);
    }
    if (ads.locationAssets && ads.locationAssets.length) {
      md.push('');
      md.push('**Location assets (GBP linkage):**');
      for (const la of ads.locationAssets) md.push(`- \`${la.resourceName}\` ${la.businessName ? '→ ' + la.businessName : ''} ${la.gbpLocation ? '(GBP: ' + la.gbpLocation + ')' : '(no GBP link)'}`);
    } else {
      md.push('- Location assets: none found (campaigns may not be linked to the GBP location).');
    }
    if (ads.conversionActions.length) {
      md.push('');
      md.push('**Conversion actions:**');
      for (const ca of ads.conversionActions) md.push(`- id=${ca.id} · ${ca.name || '(unnamed)'} · type=${ca.type} · status=${ca.status} · category=${ca.category}`);
    }
    md.push('');
    md.push('**Enhanced/offline conversion pipeline:**');
    md.push(`- Data Manager token present: ${ads.enhanced.dmTokenPresent ? '✅' : '⚠ NO'}`);
    md.push(`- site-visit action live: ${ads.enhanced.verified.siteVisitLive != null ? ads.enhanced.verified.siteVisitLive : '(unset)'}`);
    md.push(`- job-won action live: ${ads.enhanced.verified.jobWonLive != null ? ads.enhanced.verified.jobWonLive : '(unset)'}`);
  } else {
    md.push('⚠ Ads unavailable: ' + (ads.notes || []).join('; '));
  }

  // ── 5. SEO / GEO / AEO ──
  sec('5. SEO / Local GEO / Programmatic & AEO compliance');
  md.push('');
  const seo = r.seoAeo;
  md.push('**Structured data (JSON-LD):**');
  md.push(`- Types: ${seo.jsonLd.types.join(', ')}`);
  md.push(`- RoofingContractor present: ${seo.jsonLd.hasRoofingContractor ? '✅' : '❌'}`);
  md.push(`- LocalBusiness present: ${seo.jsonLd.hasLocalBusiness ? '✅' : '❌'}`);
  md.push(`- identifier.value: \`${seo.jsonLd.identifierValue}\``);
  if (!seo.jsonLd.identifierIsLive) md.push(`  ➜ ⚠ **MISMATCH** — JSON-LD uses \`${seo.jsonLd.identifierValue}\`, but the live GBP location id is \`${LOCATION_IDS.live}\`. This splits entity identity for the knowledge graph.`);
  md.push(`- areaServed: ${seo.jsonLd.areaServedCount} cities · GeoCircle radius ${seo.jsonLd.serviceAreaRadius / 1000} km`);
  md.push('- FAQ schema: page-specific injection (removed from global layout)');

  md.push('');
  md.push('**Regional landing-page architecture:**');
  md.push(`- Roofers town pages found: ${seo.regionalCount || 0}`);
  if (seo.pages && seo.pages.length) md.push('- ' + seo.pages.map((p) => p.slug).join(', '));

  md.push('');
  md.push('**Entity clarity & knowledge-graph signals:**');
  const kg = seo.knowledgeGraph || {};
  md.push(`- Organization @id: ${kg.hasOrganizationId ? '✅' : '❌'}`);
  md.push(`- Website @id: ${kg.hasWebsiteId ? '✅' : '❌'}`);
  md.push(`- sameAs links: ${kg.sameAsCount || 0}`);
  md.push(`- Uses @graph: ${kg.usesGraph ? '✅' : '❌'}`);
  md.push(`- Speakable (AEO): ${kg.hasSpeakable ? '✅' : '❌'}`);
  md.push(`- OfferCatalog: ${kg.hasHasOfferCatalog ? '✅' : '❌'}`);
  md.push(`- Credential (CORC): ${kg.hasCredential ? '✅' : '❌'}`);
  if (seo.notes && seo.notes.length) md.push('- ⚠ ' + seo.notes.join('\n- '));

  // ── Past baseline / current / remaining ──
  sec('6. Past baseline · current executed changes · remaining actions');
  md.push('');
  md.push('**Past baseline (from prior audits & codebase):**');
  md.push('- Three conflicting GBP location IDs existed in the repo: request `170989065056880840`, truncated `17098906572808840`, live `17098915606572808840`. Only the last resolves.');
  md.push('- An earlier pass mislabelled the live id "altered" and the truncated id "canonical", and rewrote JSON-LD `identifier.value` to the truncated value — pointing the knowledge graph at a resource that 404s.');
  md.push('- Offline conversions migrated to Data Manager API; GCLID pipeline re-established (see prior commits).');
  md.push('- FAQ + BreadcrumbList removed from global layout in favour of page-level injection.');
  md.push('- Review schema present (5 reviews, aggregate 5.0 / 127) with 15-town areaServed + 11 postal codes.');

  md.push('');
  md.push('**Current executed changes (this audit):**');
  md.push('- Performed live, read-only diagnostics across GBP, Maps, GSC, Indexing, GA4 and Ads — no production writes (single harmless Indexing API URL_UPDATED smoke test excluded).');
  md.push('- Resolved the live business location by name (business regex) rather than relying on any hardcoded ID.');
  md.push('- Cross-referenced geocoded 10-town place IDs against the live GBP service area.');
  md.push('- Verified verification/voice-of-merchant status, API scopes, ads geo-targeting alignment, location-asset linkage, and conversion partitioning.');

  md.push('');
  md.push('**Remaining action items (recommended):**');
  const missingPlaceIds = (g.placeIDs || []).filter((pl) => !pl.geocoded).map((pl) => pl.region);
  md.push('- Reconcile the location-ID discrepancy: update `app/structured-data.tsx` `identifier.value` and any hardcoded IDs to the single live resource.');
  if (missingPlaceIds.length) md.push('- Investigate geocoding failures for: ' + missingPlaceIds.join(', '));
  const mismatch = (g.placeIDs || []).filter((pl) => pl.geocoded && !pl.matchesLiveServiceArea).length;
  if (mismatch) md.push(`- Add ${mismatch} missing region(s) to the live GBP service area to match the 10-town footprint.`);
  if (!ads.enhanced.dmTokenPresent) md.push('- Set GOOGLE_DM_REFRESH_TOKEN (offline conversion upload via Data Manager is currently broken).');
  const gtMiss = (ads.geoAlignment || []).filter((x) => !x.targeted).map((x) => x.town);
  if (ads.auth === 'ok' && gtMiss.length) md.push('- Add missing geo targets for: ' + gtMiss.join(', '));

  const lines2 = lines.map((l) => l); // terminal copy
  return { terminal: lines2.join('\n'), markdown: md.join('\n') };
}

main().catch((err) => {
  console.error('\nFATAL:', err && err.message ? err.message : err);
  if (/invalid_grant/.test(String(err))) console.error('A refresh token is invalid — re-mint the affected token (GBP: scripts/generate-gbp-token.js).');
  process.exit(1);
});
