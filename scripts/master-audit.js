/**
 * scripts/master-audit.js
 *
 * Comprehensive diagnostic audit for the "traffic + ads fell off" issue at
 * https://www.upgraderoofs.co.uk. Uses ONLY the Google APIs already configured
 * in this project — no new dependencies.
 *
 * Coverage:
 *   1. SEARCH CONSOLE (organic SEO + programmatic/AEO-GEO drop)
 *        - 16 months of clicks/impressions/CTR/position, grouped by month.
 *        - A page×query report to see if the drop is programmatic-SEO
 *          (location service pages) vs. question/AEO-GEO queries.
 *        - URL Inspection API on 3–5 core programmatic pages for their exact
 *          index status (de-indexed / crawled-not-indexed / canonical issue).
 *   2. INDEXING API (recovery pipeline test)
 *        - Submit one URL_UPDATED for a poor performer; log the response.
 *   3. GOOGLE BUSINESS PROFILE (map-pack drop)
 *        - GBP profile state + verification via the OAuth client.
 *        - GBP Performance Metrics (interactions: website clicks, calls, impressions).
 *   4. GOOGLE ADS (the strike)
 *        - Account/campaign status + policy via the Ads REST API. Where the API
 *          cannot surface policy, print exact Policy Manager UI steps.
 *
 * Auth:
 *   - GSC + Indexing + URL Inspection → service account (google-service-account.json).
 *   - GBP → GBP_CLIENT_ID / GBP_CLIENT_SECRET / GBP_REFRESH_TOKEN (OAuth).
 *   - Ads → GOOGLE_ADS_* OAuth client + developer token.
 *
 * Every step is independently guarded — one failing API never aborts the rest.
 * Writes ./master-audit-results.json + prints a terminal summary. Secrets are
 * never written or printed.
 *
 * Run:  node scripts/master-audit.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { google } = require('googleapis');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://www.upgraderoofs.co.uk/';
const GBP_LOCATION_ID = '17098915606572808840';
const OUTPUT = path.join(__dirname, '..', 'master-audit-results.json');

// ── Generic HTTPS helpers ────────────────────────────────────────────────────
function httpGet(host, path, headers) {
  return new Promise((resolve) => {
    const req = https.request({ host, path, method: 'GET', headers }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        let body;
        try { body = JSON.parse(d); } catch { body = { raw: d }; }
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: { raw: String(e.message || e) } }));
    req.end();
  });
}

// Raw-text HTTP GET (no JSON assumption) — for homepage HTML + robots.txt.
// Follows up to `maxRedirects` 30x redirects; two-arg forms return {status, headers, body}.
function httpGetRaw(host, path, headers = {}, { maxRedirects = 3 } = {}) {
  return new Promise((resolve) => {
    const doReq = (hostname, p, redirectsLeft) => {
      const req = https.request({ host: hostname, path: p, method: 'GET', headers }, (res) => {
        const redirectStatus = res.statusCode;
        const location = res.headers.location;
        if (redirectStatus >= 300 && redirectStatus < 400 && location && redirectsLeft > 0) {
          res.resume();
          let nextHost, nextPath;
          if (location.startsWith('http')) {
            const u = new URL(location);
            nextHost = u.host; nextPath = u.pathname + u.search;
          } else {
            nextHost = hostname; nextPath = location;
          }
          doReq(nextHost, nextPath, redirectsLeft - 1);
          return;
        }
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d, finalHost: hostname }));
      });
      req.on('error', (e) => resolve({ status: 0, headers: {}, body: '', error: String(e.message || e) }));
      req.end();
    };
    doReq(host, path, maxRedirects);
  });
}

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;
const DAY_MS = 24 * ONE_HOUR;

function isoOffset(date, days) { return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10); }

function pct(part, whole, digits = 1) {
  if (!whole) return '0.0%';
  return ((part / whole) * 100).toFixed(digits) + '%';
}

// Extract a named metric from GMB insightValue structures (value can appear at
// any depth). Returns null when absent.
function extractMetric(obj, targetKey) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (key === targetKey) return v;
    if (Array.isArray(v)) {
      for (const item of v) {
        const found = extractMetric(item, targetKey);
        if (found != null) return found;
      }
    } else if (v && typeof v === 'object') {
      const found = extractMetric(v, targetKey);
      if (found != null) return found;
    }
  }
  return null;
}

function manualActionWarning() {
  return [
    '╔══════════════════════════════════════════════════════════════════════════╗',
    '║  ⚠  MANUAL ACTION CHECK — REQUIRED (cannot be read via GSC API)         ║',
    '║  A site-wide Manual Action ("pure spam", "thin content", "cloaking",     ║',
    '║  "hacked", etc.) is the SINGLE most common cause of a sudden organic     ║',
    '║  traffic collapse — and it is NOT exposed through the Search Console     ║',
    '║  API. You MUST check it by hand:                                         ║',
    '║    1. Open https://search.google.com/search-console                     ║',
    '║    2. Select https://www.upgraderoofs.co.uk/                             ║',
    '║    3. Left menu → "Security & Manual Actions"                            ║',
    '║    4. If anything is listed, click "Details" for the exact violation     ║',
    '║       and the specific affected URLs.                                    ║',
    '╚══════════════════════════════════════════════════════════════════════════╝',
  ];
}

// ── 1. SEARCH CONSOLE ────────────────────────────────────────────────────────
async function searchConsole(client) {
  const sc = google.searchconsole({ version: 'v1', auth: client });
  const endDate = isoOffset(new Date(), 0); // today (UTC)
  const startDate = isoOffset(new Date(), -485); // ~16 months

  const result = {
    property: SITE_URL,
    startDate,
    endDate,
    monthly: [],
    pageQuery: { rows: [], note: '' },
    urlInspection: [],
  };

  // 1a. Monthly time series ---------------------------------------------------
  try {
    const res = await sc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: 1000,
      },
    });
    const rows = res.data.rows || [];
    const byMonth = {};
    for (const r of rows) {
      const m = (r.keys[0] || '').slice(0, 7); // YYYY-MM
      if (!byMonth[m]) byMonth[m] = { clicks: 0, impressions: 0, position: 0, weight: 0 };
      const c = Number(r.clicks) || 0;
      const im = Number(r.impressions) || 0;
      const p = Number(r.position) || 0;
      byMonth[m].clicks += c;
      byMonth[m].impressions += im;
      byMonth[m].position += p * im;
      byMonth[m].weight += im;
    }
    result.monthly = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        clicks: v.clicks,
        impressions: v.impressions,
        ctr: v.impressions ? +(v.clicks / v.impressions).toFixed(4) : 0,
        avgPosition: v.weight ? +(v.position / v.weight).toFixed(2) : null,
      }));
  } catch (e) {
    result.monthly = [];
    result.pageQuery.note = 'monthly query failed: ' + (e.message || e);
  }

  // 1b. Page × query report ---------------------------------------------------
  try {
    const res = await sc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page', 'query'],
        rowLimit: 500,
      },
    });
    const rows = (res.data.rows || []).map((r) => ({
      page: r.keys[0] || '',
      query: r.keys[1] || '',
      clicks: Number(r.clicks) || 0,
      impressions: Number(r.impressions) || 0,
      position: Number(r.position) || null,
    }));
    result.pageQuery.rows = rows;

    // Classify: programmatic location/service pages vs question/AEO-GEO queries.
    const questionRe = /^(what|when|where|which|who|why|how|do|does|is|are|can|could|should|would|best|top|near|cost|price|much|roofer|roofers|roofing)\b/i;
    const programmaticRe = /\/(roofers|roofing|roof-repairs|flat-roof|new-roof|roof-replacement|roofers-)[^/]*\//i;
    let prog = { clicks: 0, impressions: 0 };
    let aeo = { clicks: 0, impressions: 0 };
    let other = { clicks: 0, impressions: 0 };
    for (const r of rows) {
      const isProg = programmaticRe.test(r.page);
      const isQ = questionRe.test(r.query);
      const bucket = isProg ? prog : isQ ? aeo : other;
      bucket.clicks += r.clicks;
      bucket.impressions += r.impressions;
    }
    result.pageQuery.classification = {
      programmaticPages: prog,
      aeoGeoQueries: aeo,
      other: other,
      totalClicks: prog.clicks + aeo.clicks + other.clicks,
      totalImpressions: prog.impressions + aeo.impressions + other.impressions,
    };
  } catch (e) {
    result.pageQuery.rows = [];
    result.pageQuery.note = (result.pageQuery.note ? result.pageQuery.note + '; ' : '') + 'page/query query failed: ' + (e.message || e);
  }

  // 1c. URL Inspection on core programmatic pages ----------------------------
  const insp = google.searchconsole({ version: 'v1', auth: client });
  const targets = [
    '/roofers/sandbach/',
    '/roof-repairs/',
    '/roofers/',
    '/flat-roof/',
    '/new-roof/',
  ];
  for (const t of targets) {
    const url = 'https://www.upgraderoofs.co.uk' + t;
    try {
      const ir = await insp.urlInspection.index.inspect({
        requestBody: { inspectionUrl: url, siteUrl: SITE_URL, languageCode: 'en-GB' },
      });
      const ins = ir.data && ir.data.inspectionResult;
      const idx = ins && ins.indexStatusResult;
      result.urlInspection.push({
        url,
        status: idx ? (idx.verdict || '—') : 'UNKNOWN',
        coverageState: idx ? (idx.coverageState || '—') : null,
        googleCanonical: idx ? (idx.googleCanonical || '—') : null,
        userCanonical: idx ? (idx.userCanonical || '—') : null,
        indexingState: idx ? (idx.indexingState || '—') : null,
        lastCrawlTime: idx ? (idx.lastCrawlTime || null) : null,
        pageFetchState: idx ? (idx.pageFetchState || '—') : null,
        raw: ir.data,
      });
    } catch (e) {
      result.urlInspection.push({
        url,
        status: 'ERROR',
        error: e.message || String(e),
      });
    }
  }

  return result;
}

// ── 2. INDEXING API ─────────────────────────────────────────────────────────
async function indexing(client) {
  const indexing = google.indexing({ version: 'v3', auth: client });
  const url = 'https://www.upgraderoofs.co.uk/roofers/sandbach/';
  try {
    const r = await indexing.urlNotifications.publish({
      requestBody: { url, type: 'URL_UPDATED' },
    });
    return {
      url,
      type: 'URL_UPDATED',
      success: true,
      lastUpdated: r.data.urlNotificationMetadata && r.data.urlNotificationMetadata.latestUpdate,
      notifier: r.data.urlNotificationMetadata && r.data.urlNotificationMetadata.latestUpdate && r.data.urlNotificationMetadata.latestUpdate.notifier,
      raw: r.data,
    };
  } catch (e) {
    return { url, type: 'URL_UPDATED', success: false, error: e.message || String(e) };
  }
}

// ── 3. GBP ──────────────────────────────────────────────────────────────────
async function gbp() {
  const result = { auth: 'ok', profile: {}, metrics: {}, notes: [] };
  const { GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN } = process.env;
  if (!GBP_CLIENT_ID || !GBP_CLIENT_SECRET || !GBP_REFRESH_TOKEN) {
    result.auth = 'MISSING_CREDENTIALS';
    result.notes.push('GBP_CLIENT_ID / _SECRET / _REFRESH_TOKEN not present in .env.local — GBP check skipped.');
    return result;
  }

  let accessToken;
  try {
    const oauth2 = new google.auth.OAuth2(GBP_CLIENT_ID, GBP_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: GBP_REFRESH_TOKEN });
    const { token } = await oauth2.getAccessToken();
    accessToken = token;
  } catch (e) {
    result.auth = 'TOKEN_EXCHANGE_FAILED';
    result.notes.push('GBP refresh token exchange failed: ' + (e.message || e));
    return result;
  }
  if (!accessToken) { result.auth = 'NO_TOKEN'; return result; }

  // 3a. Accounts + location state --------------------------------------------
  const acctRes = await httpGet('mybusinessaccountmanagement.googleapis.com', '/v1/accounts', { Authorization: 'Bearer ' + accessToken });
  const accounts = (acctRes.status === 200 && acctRes.body.accounts) || [];
  result.accountsRaw = acctRes.body;

  let locationName = null;
  let accountName = null;
  // Fast path with pinned account
  const pinned = (process.env.GBP_ACCOUNT_ID || '').trim().replace(/^accounts\//, '');
  for (const acct of accounts) {
    const aid = acct.name.replace(/^accounts\//, '');
    const locRes = await httpGet('mybusinessbusinessinformation.googleapis.com',
      `/v1/${acct.name}/locations?readMask=name,title,metadata,profile&pageSize=100`,
      { Authorization: 'Bearer ' + accessToken });
    const locs = (locRes.body && locRes.body.locations) || [];
    for (const l of locs) {
      if (l.name && l.name.includes('locations/' + GBP_LOCATION_ID)) {
        locationName = l.name;
        accountName = acct.name;
        result.profile = { ...result.profile, title: l.title, resource: l.name };
      }
    }
  }

  result.locationName = locationName;
  result.accountName = accountName;

  if (locationName) {
    const detail = await httpGet('mybusinessbusinessinformation.googleapis.com',
      `/v1/${locationName}?readMask=name,title,metadata,profile,phoneNumbers,categories,websiteUri`,
      { Authorization: 'Bearer ' + accessToken });
    if (detail.status === 200) {
      const d = detail.body;
      const md = d.metadata || {};
      result.profile = {
        title: d.title || null,
        resource: locationName,
        verificationState: md.verification ? (md.verification.state || null) : null,
        verificationReason: md.verification && md.verification.unverifiedReason ? md.verification.unverifiedReason : null,
        verificationCompletion: md.verification && md.verification.completion ? md.verification.completion : null,
        hasVoiceOfMerchant: md.hasVoiceOfMerchant ?? null,
        hasPendingEdits: md.hasPendingEdits ?? null,
        placeId: md.placeId || null,
        mapsUri: md.mapsUri || null,
        primaryCategory: d.categories && d.categories.primaryCategory ? d.categories.primaryCategory.displayName : null,
        phone: d.phoneNumbers && d.phoneNumbers.primaryPhone ? d.phoneNumbers.primaryPhone : null,
        websiteUri: d.websiteUri || null,
        raw: d,
      };
    } else {
      result.notes.push(`location detail HTTP ${detail.status}: ${JSON.stringify(detail.body).slice(0, 300)}`);
    }
  } else {
    result.notes.push(`GBP location locations/${GBP_LOCATION_ID} not found in accessible accounts (manager grant may be pending).`);
    result.notes.push('Account list returned ' + accounts.length + ' account(s).');
  }

  // 3b. Reviews/rating via legacy v4 (only place averageRating lives) --------
  if (accountName && locationName) {
    const acctId = accountName.replace(/^accounts\//, '');
    const locId = locationName.split('/').pop();
    const revRes = await httpGet('mybusiness.googleapis.com',
      `/v4/accounts/${acctId}/locations/${locId}/reviews?pageSize=5&orderBy=updateTime%20desc`,
      { Authorization: 'Bearer ' + accessToken });
    if (revRes.status === 200) {
      result.reviews = {
        averageRating: revRes.body.averageRating ?? null,
        totalReviewCount: revRes.body.totalReviewCount ?? null,
        reviews: (revRes.body.reviews || []).map((r) => ({
          starRating: r.starRating || null,
          reviewer: r.reviewer && r.reviewer.displayName || 'Anonymous',
          createTime: r.createTime || null,
          comment: r.comment ? r.comment.slice(0, 200) : null,
        })),
      };
    } else {
      result.reviews = { error: `HTTP ${revRes.status}`, body: revRes.body };
      result.notes.push(`v4 reviews HTTP ${revRes.status}: ${JSON.stringify(revRes.body).slice(0, 300)}`);
    }

    // 3c. Performance metrics (interactions) ---------------------------------
    // MyBusiness v4.9 location metrics: GET /v4/{locationName}/localPosts is
    // posts-only. Interaction counts (calls, website clicks, direction requests)
    // live in the Business Profile "Performance" API — here we call the MyBusiness
    // v4 `reportInsights`-style endpoint best-effort and, on 404, fall back to the
    // documented v4 metrics URL. Record everything raw so nothing is hidden.
    const gbpMetrics = { status: null, body: null, calls: null, messages: null, websiteClicks: null, directions: null, note: '' };
    try {
      const insRes = await httpGet('mybusiness.googleapis.com',
        `/v4/accounts/${acctId}/locations/${locId}/insights`,
        { Authorization: 'Bearer ' + accessToken });
      gbpMetrics.status = insRes.status;
      gbpMetrics.body = insRes.body;
      if (insRes.status !== 200) {
        gbpMetrics.note = `insights endpoint HTTP ${insRes.status}`;
      }
    } catch (e) {
      gbpMetrics.note = 'insights error: ' + (e.message || e);
    }

    // Fallback / additional: localPost metrics not needed; attempt the explicit
    // `metrics` resource (v4) which exposes interactions when the account owns
    // a VERIFIED location. If the location is unverified/pending manager grant,
    // this 404s — which itself is a diagnostic signal.
    try {
      const start = new Date(Date.now() - 90 * DAY_MS);
      const end = new Date();
      const metricsPath =
        `/v4/accounts/${acctId}/locations/${locId}/metrics` +
        `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      const mRes = await httpGet('mybusiness.googleapis.com', metricsPath, { Authorization: 'Bearer ' + accessToken });
      gbpMetrics.metricsResource = { status: mRes.status, body: mRes.body };
      if (mRes.status === 200) {
        const b = mRes.body || {};
        gbpMetrics.calls = b.phoneCallCount != null ? b.phoneCallCount : null;
        gbpMetrics.messages = b.messagesCount != null ? b.messagesCount : null;
        gbpMetrics.websiteClicks = b.insightValue ? extractMetric(b, 'ACTIONS_WEBSITE') : (b.websiteClickCount != null ? b.websiteClickCount : null);
        gbpMetrics.directions = b.insightValue ? extractMetric(b, 'ACTIONS_DRIVING_DIRECTIONS') : (b.directionsCount != null ? b.directionsCount : null);
        gbpMetrics.raw = b;
      } else {
        gbpMetrics.note += (gbpMetrics.note ? '; ' : '') + `metrics endpoint HTTP ${mRes.status}`;
      }
    } catch (e) {
      gbpMetrics.note += (gbpMetrics.note ? '; ' : '') + 'metrics error: ' + (e.message || e);
    }
    result.metrics = gbpMetrics;
  }

  return result;
}

// ── 6. TRACKING & TAG HEALTH + 7. TECHNICAL SEO BASELINE ────────────────────
async function trackingAndTechnical() {
  const result = { homepage: {}, robots: {}, tags: {} };

  // 7a. robots.txt
  const robots = await httpGetRaw('www.upgraderoofs.co.uk', '/robots.txt');
  result.robots = {
    status: robots.status,
    body: robots.body || '',
    finalHost: robots.finalHost,
  };
  const rlines = (robots.body || '').split(/\r?\n/).map((l) => l.trim());
  result.robots.disallowAll = rlines.some((l) => l.toLowerCase().startsWith('disallow:') && l.includes('/') && !l.toLowerCase().includes('$') && l.split(' ').slice(1).join(' ').trim() === '/');
  const majorBlockers = [];
  for (const l of rlines) {
    const m = l.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);
    if (m && m[2] && (m[2].toLowerCase().includes('googlebot') || m[2].toLowerCase().includes('bingbot') || (m[1].toLowerCase() === 'disallow' && m[2].trim() === '/')) ) {
      majorBlockers.push(l);
    }
  }
  result.robots.userAgentLines = rlines.filter((l) => /^user-agent\s*:/i.test(l));
  result.robots.disallowLines = rlines.filter((l) => /^disallow\s*:/i.test(l));
  result.robots.allowLines = rlines.filter((l) => /^allow\s*:/i.test(l));
  result.robots.majorCrawlerBlocks = majorBlockers;

  // 6a / 7b. Homepage HTML — confirm 200, detect GTM + AW tags.
  const home = await httpGetRaw('www.upgraderoofs.co.uk', '/', { 'User-Agent': 'Mozilla/5.0 (upgraderoofs-audit)' });
  result.homepage = { status: home.status, finalHost: home.finalHost, bytes: (home.body || '').length, redirectLoop: home.error ? true : false };
  const full = home.body || '';
  const htmlHead = (full.split(/<\/head>/i)[0] || '').replace(/^.*<head[^>]*>/is, '');
  result.tags = {
    gtmFound: /GTM-[A-Z0-9]+/.test(full),
    gtmContainerIds: [...new Set((full.match(/GTM-[A-Z0-9]+/g) || []))],
    gtagAwFound: /gtag\([^{]*'AW-|AW-[0-9]{6,}/.test(full),
    awIds: [...new Set((full.match(/AW-[0-9]{6,}/g) || []))],
    awInHead: /AW-[0-9]{6,}/.test(htmlHead),
    gtmInHead: /GTM-[A-Z0-9]+/.test(htmlHead),
    analyticsFound: /G-[A-Z0-9]{6,}/.test(full),
    ga4Ids: [...new Set((full.match(/G-[A-Z0-9]{6,}/g) || []))],
  };
  result.tags.expectedAwId = process.env.NEXT_PUBLIC_GADS_CONV_ID || null;

  return result;
}

// ── 4. GOOGLE ADS ────────────────────────────────────────────────────────────
async function ads() {
  const result = { auth: 'ok', account: {}, campaigns: [], policy: {}, conversionsThisMonth: {}, monthlySpend: [], conversionActions: [], notes: [] };
  const { GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_LOGIN_CUSTOMER_ID } = process.env;
  const missing = ['GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN'].filter((k) => !process.env[k]);
  if (missing.length) {
    result.auth = 'MISSING_ENV';
    result.notes.push('Missing: ' + missing.join(', ') + ' — Ads check skipped.');
    result.policy = adsPolicyManagerInstructions();
    return result;
  }

  const API_VERSION = 'v22';
  const HOST = 'googleads.googleapis.com';
  const customerId = GOOGLE_ADS_CUSTOMER_ID.replace(/\D/g, '');

  let accessToken;
  try {
    const oauth2 = new google.auth.OAuth2(GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: GOOGLE_ADS_REFRESH_TOKEN });
    ({ token: accessToken } = await oauth2.getAccessToken());
  } catch (e) {
    result.auth = 'TOKEN_EXCHANGE_FAILED';
    result.notes.push('Ads refresh-token exchange failed: ' + (e.message || e));
    result.policy = adsPolicyManagerInstructions();
    return result;
  }
  if (!accessToken) { result.auth = 'NO_TOKEN'; return result; }

  const headers = {
    Authorization: 'Bearer ' + accessToken,
    'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
  };
  if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');

  async function gaql(query) {
    const body = JSON.stringify({ query });
    return new Promise((resolve) => {
      const req = https.request({
        host: HOST, path: `/${API_VERSION}/customers/${customerId}/googleAds:searchStream`,
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
  }
  function flatten(res) {
    if (res.status !== 200) return [];
    return (Array.isArray(res.body) ? res.body : [res.body]).flatMap((b) => b.results || []);
  }

  // Account status
  const acctRes = await gaql(`SELECT customer.id, customer.descriptive_name, customer.status, customer.manager, customer.currency_code, customer.time_zone FROM customer LIMIT 1`);
  result.account.raw = acctRes.body;
  const c = flatten(acctRes)[0] && flatten(acctRes)[0].customer;
  result.account = {
    id: c && c.id,
    name: c && c.descriptiveName,
    status: c && c.status,
    manager: c && c.manager,
    currency: c && c.currencyCode,
    timezone: c && c.timeZone,
    queryStatus: acctRes.status,
  };

  // Campaign + policy status (last 30 days + whole account)
  const campRes = await gaql(
    `SELECT campaign.name, campaign.status, campaign.start_date, campaign.end_date,
            campaign.ad_serving_optimization_status, campaign.policy_topic_status,
            metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr, metrics.conversions
     FROM campaign
     WHERE segments.date DURING LAST_30_DAYS
     ORDER BY metrics.cost_micros DESC LIMIT 20`);
  result.campaigns = flatten(campRes).map((r) => ({
    name: r.campaign && r.campaign.name,
    status: r.campaign && r.campaign.status,
    servingStatus: r.campaign && r.campaign.adServingOptimizationStatus,
    policyStatus: r.campaign && r.campaign.policyTopicStatus,
    startDate: r.campaign && r.campaign.startDate,
    endDate: r.campaign && r.campaign.endDate,
    impressions: r.metrics && Number(r.metrics.impressions) || 0,
    clicks: r.metrics && Number(r.metrics.clicks) || 0,
    cost: r.metrics && Number(r.metrics.costMicros) / 1e6 || 0,
    ctr: r.metrics && Number(r.metrics.ctr) || 0,
    conversions: r.metrics && Number(r.metrics.conversions) || 0,
  }));

  // Count policy violations across campaigns
  let withPolicy = 0, pausedSuspended = 0;
  for (const c of result.campaigns) {
    if (c.policyStatus && c.policyStatus !== 'UNSPECIFIED' && c.policyStatus !== 'UNKNOWN') withPolicy++;
    if (c.status === 'PAUSED' || c.status === 'REMOVED' || c.status === 'SUSPENDED') pausedSuspended++;
  }
  result.policy = {
    campaignCount: result.campaigns.length,
    withPolicyFlag: withPolicy,
    pausedOrSuspended: pausedSuspended,
    note: 'policy_topic_status surfaces only aggregate flags; individual strike reasons live in the Ads Policy Manager UI.',
    instructions: adsPolicyManagerInstructions(),
  };

  // 5a. Current-month conversions + cost/conversion.
  try {
    const convRes = await gaql(
      `SELECT metrics.conversions, metrics.conversions_value, metrics.cost_micros, metrics.cost_per_conversion
       FROM customer WHERE segments.date DURING THIS_MONTH`);
    const convRows = flatten(convRes);
    const raw = convRows[0] && (convRows[0].metrics || {});
    result.conversionsThisMonth = {
      conversions: raw.conversions != null ? Number(raw.conversions) : null,
      conversionsValue: raw.conversionsValue != null ? Number(raw.conversionsValue) : null,
      cost: raw.costMicros != null ? Number(raw.costMicros) / 1e6 : null,
      costPerConversion: raw.costPerConversion != null ? Number(raw.costPerConversion) / 1e6 : null,
      note: convRes.status !== 200 ? `query HTTP ${convRes.status}` : null,
      raw: convRes.body,
    };
  } catch (e) {
    result.conversionsThisMonth = { error: e.message || String(e) };
  }

  // 8a. Spend / clicks / impressions grouped by month (16 months).
  try {
    const startDate = isoOffset(new Date(), -485);
    const endDate = isoOffset(new Date(), 0);
    const spendRes = await gaql(
      `SELECT metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions
       FROM customer WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`);
    const rows = flatten(spendRes);
    const byMonth = {};
    for (const r of rows) {
      const d = r.segments && r.segments.date;
      if (!d) continue;
      const m = d.slice(0, 7);
      const mm = r.metrics || {};
      if (!byMonth[m]) byMonth[m] = { spend: 0, clicks: 0, impressions: 0, conversions: 0 };
      byMonth[m].spend += Number(mm.costMicros) / 1e6 || 0;
      byMonth[m].clicks += Number(mm.clicks) || 0;
      byMonth[m].impressions += Number(mm.impressions) || 0;
      byMonth[m].conversions += Number(mm.conversions) || 0;
    }
    result.monthlySpend = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        spend: +v.spend.toFixed(2),
        clicks: v.clicks,
        impressions: v.impressions,
        conversions: v.conversions,
      }));
    if (spendRes.status !== 200) result.notes.push('monthly spend query HTTP ' + spendRes.status);
  } catch (e) {
    result.notes.push('monthly spend query error: ' + (e.message || e));
  }

  // 6b. Conversion action inventory (names + status).
  try {
    const caRes = await gaql(
      `SELECT conversion_action.resource_name, conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category
       FROM conversion_action`);
    result.conversionActions = flatten(caRes).map((r) => {
      const ca = r.conversionAction || {};
      return { resourceName: ca.resourceName || null, id: ca.id || null, name: ca.name || null, status: ca.status || null, type: ca.type || null, category: ca.category || null };
    });
    if (caRes.status !== 200) result.notes.push('conversion_action query HTTP ' + caRes.status);
  } catch (e) {
    result.notes.push('conversion_action query error: ' + (e.message || e));
  }

  return result;
}

function adsPolicyManagerInstructions() {
  return [
    'GOOGLE ADS POLICY MANAGER — WHERE TO FIND THE STRIKE REASON',
    '  1. Sign in at ads.google.com (the account that owns customer 8479028400).',
    '  2. Click the wrench/tools icon (top-right) → "Troubleshooting" → "Policy Manager".',
    '  3. Under "Policy issues", each row shows the AD GROUP / KEYWORD / EXTENSION',
    '     with the exact "Policy details" link. Click it to read the specific',
    '     disapproval reason and the "Appeal" button.',
    '  4. "Account status" (top of Policy Manager / Billing & Settings → Account',
    '     status) shows whether the account itself is "Suspended" and why.',
    '  5. If the whole account is suspended, check the red banner on the dashboard',
    '     → "Appeal" → the form names the violation (e.g. "misrepresentation",',
    '     "suspended for suspicious payment", "policy violation — circumventing',
    '     systems"). Common roofing-ad triggers: guaranty/injury claims,',
    '     "insurance" wording, unverified emergency claims, or destination/phone',
    '     mismatch on the landing page.',
  ];
}

// ── Orchestrate ──────────────────────────────────────────────────────────────
async function main() {
  console.log('MASTER AUDIT — upgraderoofs.co.uk traffic & ads drop');
  console.log('Date: ' + new Date().toISOString() + '\n');

  const results = {
    generatedAt: new Date().toISOString(),
    site: SITE_URL,
    gbpLocationId: GBP_LOCATION_ID,
    searchConsole: {},
    indexing: {},
    gbp: {},
    ads: {},
    tracking: {},
    leadsSummary: {},
    notes: [],
  };

  // Service account client (GSC + Indexing + URL Inspection)
  const SA_KEY = path.join(__dirname, '..', 'google-service-account.json');
  const saAuth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || SA_KEY,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/indexing'],
  });
  const client = await saAuth.getClient();

  // 1. Search Console
  console.log('▶ [1/4] Search Console (16 months + page/query + URL inspection)');
  results.searchConsole = await searchConsole(client);
  console.log('  monthly buckets: ' + results.searchConsole.monthly.length +
    '  | page/query rows: ' + results.searchConsole.pageQuery.rows.length +
    '  | URL inspection: ' + results.searchConsole.urlInspection.length);

  // 2. Indexing API
  console.log('▶ [2/4] Indexing API recovery test');
  results.indexing = await indexing(client);
  console.log('  result: ' + (results.indexing.success ? 'OK' : 'FAILED — ' + (results.indexing.error || 'unknown')));

  // 3. GBP
  console.log('▶ [3/4] Google Business Profile');
  results.gbp = await gbp();
  console.log('  auth: ' + results.gbp.auth + '  | location found: ' + (results.gbp.locationName ? 'yes' : 'NO'));

  // 4. Ads
  console.log('▶ [4/4] Google Ads (account + campaign + policy + conversions + monthly spend)');
  results.ads = await ads();
  console.log('  auth: ' + results.ads.auth + '  | campaigns: ' + results.ads.campaigns.length +
    '  | conversion actions: ' + results.ads.conversionActions.length);

  // 6 + 7. Tracking tag health + technical SEO baseline
  console.log('▶ [5/5] Tracking & tag health + technical SEO (robots.txt + homepage)');
  results.tracking = await trackingAndTechnical();
  console.log('  homepage status: ' + results.tracking.homepage.status +
    '  | GTM found: ' + (results.tracking.tags.gtmFound ? 'yes' : 'NO') +
    '  | AW tag found: ' + (results.tracking.tags.gtagAwFound ? 'yes' : 'NO'));

  // Leads summary (Ads conversions + GBP calls/messages)
  const convMonth = results.ads.conversionsThisMonth || {};
  const gbpM = results.gbp.metrics || {};
  const adsLeads = typeof convMonth.conversions === 'number' ? convMonth.conversions : 0;
  const gbpCalls = typeof gbpM.calls === 'number' ? gbpM.calls : 0;
  const gbpMsgs = typeof gbpM.messages === 'number' ? gbpM.messages : 0;
  results.leadsSummary = {
    month: 'current (August 2026)',
    adsConversions: adsLeads,
    gbpCalls: gbpCalls,
    gbpMessages: gbpMsgs,
    gbpLocalLeadsTotal: gbpCalls + gbpMsgs,
    grandTotal: adsLeads + gbpCalls + gbpMsgs,
    note: 'GBP calls/messages are 0 when the metrics endpoint 404s (unverified location / pending manager grant).',
    adsConversionsValue: convMonth.conversionsValue != null ? convMonth.conversionsValue : null,
    adsCost: convMonth.cost != null ? convMonth.cost : null,
    adsCostPerConversion: convMonth.costPerConversion != null ? convMonth.costPerConversion : null,
  };

  // Write JSON
  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  console.log('\n✓ Wrote ' + OUTPUT + '\n');

  // ── Terminal summary ──────────────────────────────────────────────────────
  printSummary(results);
}

function printSummary(results) {
  const line = '═'.repeat(78);
  console.log(line);
  console.log('  SUMMARY — TRAFFIC & ADS ROOT-CAUSE TIMELINE');
  console.log(line);

  // GSC monthly trend
  const sc = results.searchConsole;
  const m = sc.monthly || [];
  console.log('\n[ORGANIC — Google Search Console]');
  if (m.length >= 2) {
    const peak = m.reduce((a, b) => (b.clicks > a.clicks ? b : a));
    const lowest = m.reduce((a, b) => (b.clicks < a.clicks ? b : a));
    console.log(`  Peak clicks:  ${peak.clicks}  (${peak.month})`);
    console.log(`  Recent clicks: ${m[m.length - 1].clicks}  (${m[m.length - 1].month})`);
    console.log(`  Drop: ${peak.clicks - lowest.clicks} clicks from peak → trough (${peak.month} → ${lowest.month})`);
    // Find first sustained decline
    let dropMonth = null;
    for (let i = 1; i < m.length; i++) {
      if (m[i].clicks < m[i - 1].clicks * 0.7) { dropMonth = m[i].month; break; }
    }
    if (dropMonth) console.log(`  First ≥30% monthly decline: ${dropMonth}`);
    console.log('\n  Month           Clicks    Impr.      CTR     Avg Pos');
    for (const r of m) {
      console.log(
        '  ' + r.month + '      ' +
        String(r.clicks).padStart(7) + String(r.impressions).padStart(9) +
        pct(r.clicks, r.impressions).padStart(8) + (r.avgPosition != null ? r.avgPosition.toFixed(1).padStart(9) : '     —'.padStart(9)));
    }
  } else {
    console.log('  (no monthly data — see notes: ' + (sc.pageQuery.note || 'n/a') + ')');
  }

  // Page/query classification
  const c = sc.pageQuery.classification;
  if (c) {
    console.log('\n  Page×Query classification (16 months):');
    console.log('  Programmatic/SEO pages:  ' + c.programmaticPages.clicks + ' clicks / ' + c.programmaticPages.impressions + ' impr');
    console.log('  Question/AEO-GEO querys: ' + c.aeoGeoQueries.clicks + ' clicks / ' + c.aeoGeoQueries.impressions + ' impr');
    console.log('  Other:                   ' + c.other.clicks + ' clicks / ' + c.other.impressions + ' impr');
  }

  // URL inspection
  if (sc.urlInspection.length) {
    console.log('\n  URL Inspection (core programmatic pages):');
    for (const u of sc.urlInspection) {
      console.log('   ' + u.status.padEnd(26) + ' ' + u.url +
        (u.coverageState ? '  [' + u.coverageState + ']' : '') +
        (u.googleCanonical ? '  canonical→' + u.googleCanonical : ''));
    }
  }

  // GBP
  console.log('\n[LOCAL — Google Business Profile]');
  if (results.gbp.auth === 'ok') {
    const p = results.gbp.profile || {};
    console.log('  Location found:   ' + (results.gbp.locationName ? 'YES ' + (p.title || '') : 'NO'));
    if (p.verificationState) console.log('  Verification:     ' + p.verificationState);
    else console.log('  Verification:     ' + (p.verificationState || '(not returned — likely unverified/manager-grant pending)'));
    const rev = results.gbp.reviews;
    if (rev && rev.averageRating != null) console.log('  Rating:           ' + rev.averageRating + ' / 5  (' + rev.totalReviewCount + ' reviews)');
    else if (rev && rev.error) console.log('  Reviews/rating:   ' + rev.error);
    if (results.gbp.metrics && results.gbp.metrics.status) console.log('  Insights HTTP:    ' + results.gbp.metrics.status);
    (results.gbp.notes || []).forEach((n) => console.log('  ⚠ ' + n));
  } else {
    console.log('  GBP auth: ' + results.gbp.auth + '  (see notes)');
    (results.gbp.notes || []).forEach((n) => console.log('  ⚠ ' + n));
  }

  // Ads
  console.log('\n[PAID — Google Ads]');
  if (results.ads.auth === 'ok') {
    const a = results.ads.account;
    console.log('  Account:          ' + (a.name || '(unnamed)') + '  status=' + a.status + (a.manager ? ' (MCC)' : ''));
    console.log('  Campaigns (last 30d): ' + results.ads.campaigns.length +
      '  | policy-flagged: ' + (results.ads.policy.withPolicyFlag ?? '?') +
      '  | paused/suspended/removed: ' + (results.ads.policy.pausedOrSuspended ?? '?'));
    const p = results.ads.policy;
    console.log('');
    (p.instructions || []).forEach((l) => console.log('  ' + l));
  } else {
    console.log('  Ads auth: ' + results.ads.auth);
    (results.ads.notes || []).forEach((n) => console.log('  ⚠ ' + n));
    (results.ads.policy.instructions || []).forEach((l) => console.log('  ' + l));
  }

  // Monthly spend table
  const spend = results.ads.monthlySpend || [];
  if (spend.length) {
    console.log('\n  Ads spend/clicks/conversions (16 months):');
    console.log('  Month           Spend(£)   Clicks   Impr.    Conv');
    for (const r of spend) {
      console.log('  ' + r.month + '      ' +
        r.spend.toFixed(2).padStart(8) + String(r.clicks).padStart(9) +
        String(r.impressions).padStart(8) + String(r.conversions).padStart(8));
    }
  }

  // Conversion action inventory
  const ca = results.ads.conversionActions || [];
  if (ca.length) {
    console.log('\n  Conversion actions (name / status / type):');
    for (const a of ca) {
      console.log('   · ' + (a.name || '(unnamed)') + '  status=' + (a.status || '?') +
        '  type=' + (a.type || '?'));
    }
  }

  // Tracking & technical
  console.log('\n[TRACKING — tag health + technical SEO]');
  const t = results.tracking || {};
  if (t.homepage && t.homepage.status) {
    console.log('  Homepage HTTP:    ' + t.homepage.status + (t.homepage.redirectLoop ? '  (REDIRECT LOOP)' : '') +
      '  (' + (t.homepage.bytes || 0) + ' bytes)');
    if (t.homepage.status !== 200) console.log('  ⚠ Homepage NOT 200 OK — server-level block or redirect issue.');
  }
  const tags = t.tags || {};
  console.log('  GTM present:      ' + (tags.gtmFound ? 'YES ' + (tags.gtmContainerIds || []).join(', ') : 'NO — GTM tag MISSING'));
  console.log('  Google Ads (AW-): ' + (tags.gtagAwFound ? 'YES ' + (tags.awIds || []).join(', ') : 'NO — AW tag MISSING/STRIPPED'));
  console.log('  AW in <head>:     ' + (tags.awInHead ? 'yes' : 'no'));
  console.log('  GTM in <head>:    ' + (tags.gtmInHead ? 'yes' : 'no'));
  console.log('  Expected AW conv: ' + (tags.expectedAwId || '(env not set)'));
  if (tags.gtagAwFound && tags.expectedAwId && tags.awIds && !tags.awIds.includes(tags.expectedAwId)) {
    console.log('  ⚠ Expected conversion tag ' + tags.expectedAwId + ' NOT found in live HTML — conversion tracking likely broken.');
  }
  const rb = t.robots || {};
  console.log('  robots.txt HTTP:  ' + rb.status);
  if (rb.disallowAll !== undefined) console.log('  Disallow:/ block: ' + (rb.disallowAll ? '⚠ YES — site-wide crawl block!' : 'no (ok)'));
  if (rb.majorCrawlerBlocks && rb.majorCrawlerBlocks.length) {
    console.log('  ⚠ Crawler directives of concern:');
    rb.majorCrawlerBlocks.forEach((l) => console.log('     ' + l));
  }

  // Leads summary
  const ls = results.leadsSummary || {};
  console.log('\n[LEADS — current month (August 2026)]');
  console.log('  Ads conversions:     ' + ls.adsConversions + (ls.adsCostPerConversion != null ? '  (cost/conv £' + Number(ls.adsCostPerConversion).toFixed(2) + ')' : ''));
  console.log('  GBP calls:           ' + ls.gbpCalls);
  console.log('  GBP messages:        ' + ls.gbpMessages);
  console.log('  GBP local leads:     ' + ls.gbpLocalLeadsTotal);
  console.log('  TOTAL leads:         ' + ls.grandTotal);
  if (ls.note) console.log('  ⚠ ' + ls.note);

  // Manual action warning
  console.log('');
  manualActionWarning().forEach((l) => console.log('  ' + l));

  console.log('\n' + line);
  console.log('Full structured results: ' + OUTPUT);
  console.log(line + '\n');
}

main().catch((err) => {
  console.error('\nFATAL:', err && err.message ? err.message : err);
  process.exit(1);
});
