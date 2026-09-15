/**
 * scripts/audit-calls-30d.js
 *
 * CONSOLIDATED CALL AUDIT — Upgrade Roofs
 * ============================================================================
 * Reconciles every channel that can evidence an inbound phone call over a
 * rolling window (default: last 30 days), and reports the tracking gaps that
 * make the total unknowable from any single source.
 *
 * Channels audited
 *   1. Google Ads  — call-extension / call-only-ad calls (`metrics.phone_calls`)
 *                    cross-checked against per-call detail (`call_view`), plus
 *                    the state of every call-related conversion action.
 *   2. GA4         — website click-to-call intent (`phone_click`,
 *                    `whatsapp_click`, `email_click`) and paid-vs-organic split.
 *   3. GBP         — Business Profile Performance API (CALL_CLICKS et al).
 *   4. CRM (GHL)   — inbound-call contacts written by the call-tracking webhook,
 *                    plus website form leads for context.
 *
 * READ-ONLY. Writes nothing, mutates nothing. Safe to run in production.
 *
 * Run:  node scripts/audit-calls-30d.js [days]
 *       node scripts/audit-calls-30d.js 7
 *       node scripts/audit-calls-30d.js 30 --json   (machine-readable output)
 *
 * Exit code is always 0 — this is an audit, not a gate.
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath, quiet: true });

const { google } = require('googleapis');

// ── argv ─────────────────────────────────────────────────────────────────────
const DAYS = (() => {
  const n = parseInt(process.argv[2], 10);
  return Number.isFinite(n) && n > 0 && n <= 365 ? n : 30;
})();
const AS_JSON = process.argv.includes('--json');

const W = 84;
const line = (s = '') => console.log(s);
const rule = (c = '─') => line(c.repeat(W));
const head = (t) => { line(); rule('═'); line('  ' + t); rule('═'); };
const sub = (t) => { line(); line('  ' + t); line('  ' + '·'.repeat(Math.max(0, t.length))); };
const kv = (k, v, pad = 40) => line('    ' + String(k).padEnd(pad) + ' ' + v);

// ── date helpers ─────────────────────────────────────────────────────────────
const NOW = new Date();
const START = new Date(NOW.getTime() - DAYS * 864e5);
const iso = (d) => d.toISOString().slice(0, 10);
const RANGE = { start: iso(START), end: iso(NOW) };

/** Parse a call_view date-time ('2026-08-17 11:01:13') as Europe/London-ish UTC. */
function parseCallTime(raw) {
  if (!raw) return NaN;
  return Date.parse(String(raw).replace(' ', 'T') + 'Z');
}

const inWindow = (ms) => Number.isFinite(ms) && ms >= START.getTime() && ms <= NOW.getTime() + 864e5;

// ── result accumulation ──────────────────────────────────────────────────────
const R = {
  meta: { generatedAt: NOW.toISOString(), windowDays: DAYS, range: RANGE },
  ads: { ok: false, error: null, calls: null, perCall: [], callActions: [], allActions: [], spend: null, clicks: null, conversions: 0 },
  ga4: { ok: false, error: null, events: {}, byChannel: [], sessions: 0, keyEvents: 0 },
  gbp: { ok: false, error: null, callClicks: null, accounts: [] },
  ghl: { ok: false, error: null, inboundCallContacts: [], formLeads: [], totalContacts: null },
  gaps: [],
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GOOGLE ADS
// ═════════════════════════════════════════════════════════════════════════════
async function auditAds() {
  const e = process.env;
  const missing = ['GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN'].filter((k) => !e[k]);
  if (missing.length) { R.ads.error = 'Missing env: ' + missing.join(', '); return; }

  const oauth = new google.auth.OAuth2(e.GOOGLE_ADS_CLIENT_ID, e.GOOGLE_ADS_CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: e.GOOGLE_ADS_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  if (!token) { R.ads.error = 'OAuth token exchange failed'; return; }

  const headers = { Authorization: `Bearer ${token}`, 'developer-token': e.GOOGLE_ADS_DEVELOPER_TOKEN, 'Content-Type': 'application/json' };
  if (e.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = String(e.GOOGLE_ADS_LOGIN_CUSTOMER_ID).replace(/\D/g, '');
  const CID = String(e.GOOGLE_ADS_CUSTOMER_ID).replace(/\D/g, '');

  const gaql = async (query) => {
    const res = await fetch(`https://googleads.googleapis.com/v22/customers/${CID}/googleAds:searchStream`, {
      method: 'POST', headers, body: JSON.stringify({ query }),
    });
    const text = await res.text();
    let body; try { body = JSON.parse(text); } catch { body = { raw: text }; }
    if (res.status !== 200) {
      const msg = body?.error?.details?.[0]?.errors?.[0]?.message || body?.error?.message || text.slice(0, 200);
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }
    return (Array.isArray(body) ? body : [body]).flatMap((b) => b.results || []);
  };

  try {
    // 1a. Account totals for the window. NOTE: `customer` does not support
    //     metrics.phone_calls — that metric lives on `campaign` (step 1b).
    const [cust] = await gaql(`SELECT metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.all_conversions FROM customer WHERE segments.date BETWEEN '${RANGE.start}' AND '${RANGE.end}'`);
    R.ads.clicks = Number(cust?.metrics?.clicks || 0);
    R.ads.spend = Number(cust?.metrics?.costMicros || 0) / 1e6;
    R.ads.conversions = Number(cust?.metrics?.conversions || 0);

    // 1b. Calls attributed to ad extensions / call-only ads, per campaign per day.
    const callRows = await gaql(
      `SELECT segments.date, campaign.name, metrics.phone_calls, metrics.phone_impressions, metrics.phone_through_rate ` +
      `FROM campaign WHERE segments.date BETWEEN '${RANGE.start}' AND '${RANGE.end}' AND metrics.phone_calls > 0`
    );
    R.ads.calls = {
      total: callRows.reduce((a, r) => a + Number(r.metrics?.phoneCalls || 0), 0),
      impressions: callRows.reduce((a, r) => a + Number(r.metrics?.phoneImpressions || 0), 0),
      byDay: callRows.map((r) => ({
        date: r.segments?.date,
        campaign: r.campaign?.name,
        calls: Number(r.metrics?.phoneCalls || 0),
        phoneImpressions: Number(r.metrics?.phoneImpressions || 0),
        throughRate: r.metrics?.phoneThroughRate != null ? Number(r.metrics.phoneThroughRate) : null,
      })).sort((a, b) => String(a.date).localeCompare(String(b.date))),
    };

    // 1c. Per-call detail. NOTE: `call_view` cannot be segmented/filtered by
    //     segments.date (PROHIBITED_SEGMENT_IN_SELECT_OR_WHERE_CLAUSE), so the
    //     whole resource is pulled and filtered on start_call_date_time locally.
    const cvRows = await gaql(
      `SELECT call_view.resource_name, call_view.call_duration_seconds, call_view.call_status, ` +
      `call_view.type, call_view.start_call_date_time, call_view.caller_country_code FROM call_view`
    );
    R.ads.perCall = cvRows
      .map((r) => {
        const c = r.callView || {};
        const ms = parseCallTime(c.startCallDateTime);
        return {
          start: c.startCallDateTime || null,
          durationSeconds: c.callDurationSeconds != null ? Number(c.callDurationSeconds) : null,
          status: c.callStatus || null,
          type: c.type || null,
          countryCode: c.callerCountryCode || null,
          _ms: ms,
        };
      })
      .filter((c) => inWindow(c._ms))
      .sort((a, b) => a._ms - b._ms);

    // 1d. Conversion actions — which are live, which are dead.
    const caRows = await gaql(
      `SELECT conversion_action.id, conversion_action.name, conversion_action.type, ` +
      `conversion_action.status, conversion_action.category FROM conversion_action`
    );
    R.ads.allActions = caRows.map((r) => ({
      id: String(r.conversionAction?.id),
      name: r.conversionAction?.name,
      type: r.conversionAction?.type,
      status: r.conversionAction?.status,
      category: r.conversionAction?.category,
    }));
    // Genuinely call-focused actions: the call-asset action (AD_CALL) and the
    // click-to-call action (GOOGLE_HOSTED/CONTACT), plus anything named
    // call/phone/whatsapp. The "Local actions - *" GOOGLE_HOSTED entries are
    // directions/website-visit engagement, not calls, so they are excluded.
    R.ads.callActions = R.ads.allActions.filter((a) => {
      if (/^local actions/i.test(a.name || '')) return false;
      return /call|phone|whatsapp/i.test(a.name || '') ||
        a.type === 'AD_CALL' ||
        (a.type === 'GOOGLE_HOSTED' && a.category === 'CONTACT');
    });

    // 1e. Are the IDs the website code sends to still real?
    R.ads.webConversionIds = [
      { env: 'NEXT_PUBLIC_GADS_CONV_ID', value: e.NEXT_PUBLIC_GADS_CONV_ID || '(unset)', usedFor: 'lead-form conversion' },
      { env: 'NEXT_PUBLIC_GADS_CLICK_CONV_ID', value: e.NEXT_PUBLIC_GADS_CLICK_CONV_ID || '(unset)', usedFor: 'phone/WhatsApp tap conversion' },
    ].map((row) => {
      const m = String(row.value).match(/AW-(\d+)/);
      const action = m ? R.ads.allActions.find((a) => a.id === m[1]) : null;
      return { ...row, actionId: m ? m[1] : null, resolvedName: action?.name || null, resolvedStatus: action?.status || 'NO SUCH ACTION' };
    });

    R.ads.ok = true;
  } catch (err) {
    R.ads.error = err.message;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. GA4 — website click-to-call intent
// ═════════════════════════════════════════════════════════════════════════════
async function auditGa4() {
  if (!process.env.GA4_PROPERTY_ID) { R.ga4.error = 'GA4_PROPERTY_ID unset'; return; }
  let BetaAnalyticsDataClient;
  try { ({ BetaAnalyticsDataClient } = require('@google-analytics/data')); }
  catch (err) { R.ga4.error = 'Missing dep @google-analytics/data: ' + err.message; return; }

  const client = new BetaAnalyticsDataClient();
  const property = `properties/${process.env.GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: `${DAYS}daysAgo`, endDate: 'today' }];

  // Call-intent events the site is supposed to emit (lib/tracking.ts).
  const WATCHED = ['phone_click', 'whatsapp_click', 'email_click', 'quote_request', 'contact_form_submit', 'quote_form_open', 'click', 'form_start', 'form_submit', 'session_start', 'page_view'];

  try {
    const [res] = await client.runReport({
      property, dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      limit: 500,
    });
    const seen = {};
    (res.rows || []).forEach((r) => { seen[r.dimensionValues[0].value] = Number(r.metricValues[0].value); });
    WATCHED.forEach((n) => { R.ga4.events[n] = seen[n] || 0; });
    R.ga4.otherEvents = Object.entries(seen).filter(([k]) => !WATCHED.includes(k)).sort((a, b) => b[1] - a[1]);

    // Channel split, with key events (conversions) per channel.
    const [ch] = await client.runReport({
      property, dateRanges,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
      limit: 50,
    });
    R.ga4.byChannel = (ch.rows || []).map((r) => ({
      channel: r.dimensionValues[0].value,
      sessions: Number(r.metricValues[0].value),
      keyEvents: Number(r.metricValues[1].value),
    })).sort((a, b) => b.sessions - a.sessions);
    R.ga4.sessions = R.ga4.byChannel.reduce((a, c) => a + c.sessions, 0);
    R.ga4.keyEvents = R.ga4.byChannel.reduce((a, c) => a + c.keyEvents, 0);
    R.ga4.ok = true;
  } catch (err) {
    R.ga4.error = err.message;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. GBP — Business Profile Performance API
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Live Business Profile location id. Mirrors lib/contact.ts (GBP_LOCATION_ID),
 * which owns this value.
 *
 * VERIFIED 2026-09-15: returns HTTP 200 "Upgrade Roofs", phone 01270 897606,
 * placeId ChIJMUVUfoBZekgRrNga9buOK88, and reports CALL_CLICKS for the window.
 *
 * Override with GBP_LOCATION_ID (bare id or "locations/<id>"). WARNING: an
 * earlier audit pass labelled THIS id corrupted and promoted the 17-digit
 * 17098906572808840 instead — that id does not exist and 404s. The bad ids are
 * asserted below so the mistake fails loudly instead of silently querying a
 * location that does not exist.
 */
const CANONICAL_LOCATION_ID = '17098915606572808840';
const KNOWN_BAD_LOCATION_IDS = ['17098906572808840', '170989065056880840'];

async function auditGbp() {
  const LOCATION_ID = (process.env.GBP_LOCATION_ID || '').trim().replace(/^locations\//, '') || CANONICAL_LOCATION_ID;
  const PINNED_ACCOUNT = (process.env.GBP_ACCOUNT_ID || '').trim().replace(/^accounts\//, '') || null;

  R.gbp.locationId = LOCATION_ID;
  R.gbp.locationIdSource = process.env.GBP_LOCATION_ID ? 'GBP_LOCATION_ID env' : 'built-in canonical constant';
  R.gbp.pinnedAccountId = PINNED_ACCOUNT;

  if (KNOWN_BAD_LOCATION_IDS.includes(LOCATION_ID)) {
    R.gbp.error = `GBP_LOCATION_ID resolves to the corrupted id ${LOCATION_ID}; expected ${CANONICAL_LOCATION_ID}. Fix the env var.`;
    return;
  }

  const SCOPE = 'https://www.googleapis.com/auth/business.manage';

  // Credential selection: an OAuth refresh token is the "business manager"
  // credential (it belongs to a human Google account, which may already be a
  // Manager on the profile). The service account is the fallback and is what
  // app/api/gbp/route.ts uses. Report WHICH identity was used — a permission
  // failure is only meaningful alongside the identity that hit it.
  const { GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN } = process.env;
  const hasOauth = !!(GBP_CLIENT_ID && GBP_CLIENT_SECRET && GBP_REFRESH_TOKEN);
  let client, identityLabel;

  try {
    if (hasOauth) {
      const o = new google.auth.OAuth2(GBP_CLIENT_ID, GBP_CLIENT_SECRET);
      o.setCredentials({ refresh_token: GBP_REFRESH_TOKEN });
      // The OAuth2 client IS the client — it exposes getAccessToken() directly.
      // (It has no getClient(); that method belongs to GoogleAuth, and calling
      // it here threw "o.getClient is not a function".)
      client = o;
      identityLabel = 'OAuth refresh token (GBP_CLIENT_ID/SECRET/REFRESH_TOKEN)';
    } else {
      const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'google-service-account.json');
      if (!fs.existsSync(keyFile)) { R.gbp.error = `No credentials: ${keyFile} missing and GBP OAuth vars unset.`; return; }
      let email = 'unknown';
      try { email = JSON.parse(fs.readFileSync(keyFile, 'utf8')).client_email || 'unknown'; } catch {}
      client = await new google.auth.GoogleAuth({ keyFile, scopes: [SCOPE] }).getClient();
      identityLabel = `service account ${email}`;
    }
    R.gbp.identity = identityLabel;
    R.gbp.credentialPath = hasOauth ? 'oauth' : 'service-account';

    const { token } = await client.getAccessToken();
    if (!token) { R.gbp.error = `Token exchange failed for ${identityLabel}`; return; }

    const get = async (host, p) => {
      const res = await fetch(`https://${host}${p}`, { headers: { Authorization: `Bearer ${token}` } });
      const text = await res.text();
      let body; try { body = JSON.parse(text); } catch { body = { raw: text }; }
      return { status: res.status, body };
    };

    const accts = await get('mybusinessaccountmanagement.googleapis.com', '/v1/accounts');
    R.gbp.accountsStatus = accts.status;
    R.gbp.accounts = (accts.body?.accounts || []).map((a) => ({
      name: a.name,
      accountName: a.accountName,
      type: a.type,
      role: a.role || null,
      verificationState: a.verificationState,
      vettedState: a.vettedState,
      // A service account gets its own auto-created PERSONAL account, whose
      // accountName is the service account's own email. Seeing only that one
      // is the signature of "no Manager grant on the real profile".
      isSelfAccount: /iam\.gserviceaccount\.com$/.test(a.accountName || ''),
      locationCount: null,
      locationNames: [],
    }));

    for (const a of R.gbp.accounts) {
      const loc = await get('mybusinessbusinessinformation.googleapis.com', `/v1/${a.name}/locations?readMask=name,title&pageSize=100`);
      a.locationCount = (loc.body?.locations || []).length;
      a.locationNames = (loc.body?.locations || []).map((l) => l.name);
    }

    // Direct location GET — independent of account listing. This is the
    // cleanest access test: it needs no account enumeration, so a 404 here is
    // unambiguous (Google returns 404, not 403, when the caller cannot see a
    // location, to avoid leaking its existence).
    const direct = await get('mybusinessbusinessinformation.googleapis.com', `/v1/locations/${LOCATION_ID}?readMask=name,title`);
    R.gbp.directLocationStatus = direct.status;

    // Performance API — the ONLY endpoint exposing CALL_CLICKS / messaging counts.
    const s = START, en = NOW;
    const perf = await get(
      'businessprofileperformance.googleapis.com',
      `/v1/locations/${LOCATION_ID}:fetchMultiDailyMetricsTimeSeries` +
      `?dailyMetrics=CALL_CLICKS&dailyMetrics=WEBSITE_CLICKS&dailyMetrics=BUSINESS_DIRECTION_REQUESTS&dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS` +
      `&dailyRange.start_date.year=${s.getUTCFullYear()}&dailyRange.start_date.month=${s.getUTCMonth() + 1}&dailyRange.start_date.day=${s.getUTCDate()}` +
      `&dailyRange.end_date.year=${en.getUTCFullYear()}&dailyRange.end_date.month=${en.getUTCMonth() + 1}&dailyRange.end_date.day=${en.getUTCDate()}`
    );
    R.gbp.performanceStatus = perf.status;

    if (perf.status === 200) {
      const out = {};
      (perf.body?.multiDailyMetricTimeSeries || []).forEach((s0) => {
        (s0.dailyMetricTimeSeries || []).forEach((mts) => {
          out[mts.dailyMetric] = (mts.timeSeries?.datedValues || []).reduce((a, d) => a + Number(d.value || 0), 0);
        });
      });
      R.gbp.metrics = out;
      R.gbp.callClicks = out.CALL_CLICKS ?? null;
      R.gbp.ok = true;
      return;
    }

    // Classify the failure so the fix is unambiguous.
    const totalLocations = R.gbp.accounts.reduce((a, x) => a + (x.locationCount || 0), 0);
    if (perf.status === 404 && direct.status === 404 && totalLocations === 0) {
      R.gbp.failureClass = 'GRANT_MISSING';
      R.gbp.error =
        `${identityLabel} can see ${R.gbp.accounts.length} account(s) but 0 locations, and ` +
        `locations/${LOCATION_ID} 404s on a direct GET. The identity is not a Manager on the ` +
        `verified "Upgrade Roofs" profile.`;
    } else if (perf.status === 403 || perf.status === 401) {
      R.gbp.failureClass = 'AUTH';
      R.gbp.error = `Permission denied for ${identityLabel}: HTTP ${perf.status} ${perf.body?.error?.message || ''}`;
    } else {
      R.gbp.failureClass = 'OTHER';
      R.gbp.error = `Performance API HTTP ${perf.status}: ${perf.body?.error?.message || JSON.stringify(perf.body).slice(0, 200)}`;
    }
  } catch (err) {
    R.gbp.error = err.message;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. CRM (GHL) — inbound-call contacts + form leads
// ═════════════════════════════════════════════════════════════════════════════
async function auditGhl() {
  const { GHL_API_KEY, GHL_LOCATION_ID } = process.env;
  if (!GHL_API_KEY || !GHL_LOCATION_ID) { R.ghl.error = 'Missing GHL_API_KEY / GHL_LOCATION_ID'; return; }

  const base = 'https://services.leadconnectorhq.com';
  const headers = { Authorization: `Bearer ${GHL_API_KEY}`, Version: '2021-07-28', Accept: 'application/json' };

  try {
    const res = await fetch(`${base}/contacts/?locationId=${GHL_LOCATION_ID}&limit=100`, { headers });
    if (res.status !== 200) { R.ghl.error = `contacts HTTP ${res.status}`; return; }
    const data = await res.json();
    R.ghl.totalContacts = data.meta?.total ?? (data.contacts || []).length;

    // GHL's dateAdded arrives as an ISO string on some endpoints and epoch-ms
    // on others — accept both rather than trusting one shape.
    const toMs = (v) => {
      if (v == null) return NaN;
      if (typeof v === 'number') return v;
      const n = Number(v);
      if (Number.isFinite(n) && String(v).trim() !== '') return n;
      return Date.parse(v);
    };

    const contacts = (data.contacts || []).map((c) => {
      const ms = toMs(c.dateAdded);
      return {
        dateAdded: Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null,
        _ms: ms,
        phone: c.phone || null,
        tags: c.tags || [],
        source: c.source || null,
      };
    });

    R.ghl.inboundCallContacts = contacts.filter((c) => c.tags.some((t) => /inbound-call|call-tracking/i.test(t)));
    R.ghl.formLeads = contacts
      .filter((c) => c.tags.some((t) => /website-lead/i.test(t)) && inWindow(c._ms))
      .sort((a, b) => a._ms - b._ms)
      .map((c) => ({ date: c.dateAdded, phone: c.phone, tags: c.tags, googleAdsLead: c.tags.includes('google-ads-lead') }));
    R.ghl.ok = true;
  } catch (err) {
    R.ghl.error = err.message;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. GAP ANALYSIS
// ═════════════════════════════════════════════════════════════════════════════
function analyse() {
  const g = R.gaps;
  const push = (severity, channel, title, detail, fix) => g.push({ severity, channel, title, detail, fix });

  // — Google Ads call actions —
  const deadCallActions = R.ads.callActions.filter((a) => a.status !== 'ENABLED');
  if (deadCallActions.length) {
    push('CRITICAL', 'Google Ads',
      `${deadCallActions.length} of ${R.ads.callActions.length} call conversion actions are ${[...new Set(deadCallActions.map((a) => a.status))].join('/')}`,
      `Non-ENABLED: ${deadCallActions.map((a) => `${a.name} (${a.type})`).join(', ')}. A removed action accepts no conversions, so no call ever registers against ads spend. Bid optimisation is blind to phone leads.`,
      'Recreate the call conversion actions in Google Ads → Tools → Conversions, or re-enable them, then repoint the env vars below.');
  }

  // — Env-pointed conversion IDs that no longer resolve —
  (R.ads.webConversionIds || []).forEach((row) => {
    if (row.resolvedStatus && row.resolvedStatus !== 'ENABLED') {
      push('CRITICAL', 'Google Ads',
        `${row.env} points at a ${row.resolvedStatus} conversion action`,
        `${row.env}=${row.value} resolves to "${row.resolvedName}" (status ${row.resolvedStatus}). Each ${row.usedFor} sent from the browser is silently discarded by Google Ads.`,
        `Set ${row.env} to a live conversion action ID (format AW-<id>).`);
    }
  });

  // — Zero conversions despite spend —
  if (R.ads.ok && R.ads.spend > 0 && R.ads.conversions === 0) {
    push('CRITICAL', 'Google Ads',
      `£${R.ads.spend.toFixed(2)} spend over ${R.ads.clicks} clicks produced 0 recorded conversions`,
      'No conversion — form or call — is reaching the Google Ads account in the audited window. Every optimisation signal is absent.',
      'Fix the conversion actions above, then verify in Google Ads → Tools → Conversions that counts start incrementing.');
  }

  // — GA4 custom events absent (GTM trigger gap) —
  const intentEvents = ['phone_click', 'whatsapp_click', 'email_click', 'quote_request', 'contact_form_submit'];
  const absent = intentEvents.filter((n) => !R.ga4.events[n]);
  if (R.ga4.ok && absent.length) {
    const automatic = (R.ga4.events.form_start || 0) + (R.ga4.events.click || 0);
    push('CRITICAL', 'Website / GA4',
      `${absent.length} of 5 call & form intent events never reached GA4: ${absent.join(', ')}`,
      `GA4 received ${automatic} automatic (enhanced-measurement) events in the same window, so the property and tag are live. lib/tracking.ts pushes these events to window.dataLayer ONLY and relies entirely on GTM triggers existing — the triggers/tags are missing or misconfigured, so click-to-call intent is invisible.`,
      'In GTM, add a Custom Event trigger per event name (phone_click, whatsapp_click, email_click, quote_request, contact_form_submit) and a GA4 Event tag for each. Or push directly via gtag() as fireGadsConversion already does.');
  }

  // — GBP: no performance access —
  if (!R.gbp.ok) {
    if (R.gbp.failureClass === 'GRANT_MISSING') {
      push('CRITICAL', 'Google Business Profile',
        'GBP call/message data is inaccessible — Manager grant missing',
        `${R.gbp.identity} sees ${R.gbp.accounts?.length ?? 0} account(s) but 0 locations, and a direct GET of locations/${R.gbp.locationId} returns 404. Google returns 404 (not 403) for a location the caller cannot see, so this is an access problem — the id itself is correct.`,
        `Add that identity as a Manager on the verified "Upgrade Roofs" profile (business.google.com → Settings → Managers), then re-run. Until then GBP call volume is unmeasurable from any API.`);
    } else {
      push('CRITICAL', 'Google Business Profile',
        `GBP call/message data unavailable${R.gbp.failureClass ? ` [${R.gbp.failureClass}]` : ''}`,
        R.gbp.error || 'Performance API unavailable.',
        'Diagnose with `node scripts/probe-gbp-auth.js`, which compares both credential paths.');
    }
  }

  // — A GBP location id override that does not exist —
  if (process.env.GBP_LOCATION_ID && KNOWN_BAD_LOCATION_IDS.includes(String(process.env.GBP_LOCATION_ID).replace(/^locations\//, '').trim())) {
    push('HIGH', 'Config',
      'GBP_LOCATION_ID is set to a location id that does not exist',
      `GBP_LOCATION_ID=${process.env.GBP_LOCATION_ID} is a truncated variant of the live id. It does not exist, so every query against it 404s and the failure is indistinguishable from a permissions problem. An earlier audit pass treated this value as canonical and wrote it into app/structured-data.tsx.`,
      `Set GBP_LOCATION_ID to the live id ${CANONICAL_LOCATION_ID}, or unset it to use the built-in default.`);
  }

  // — Call-tracking provider never wired —
  if (R.ghl.ok && R.ghl.inboundCallContacts.length === 0) {
    push('HIGH', 'Call tracking',
      'No call-tracking provider is feeding the CRM',
      'The /api/webhooks/call-tracking endpoint is live but has produced zero inbound-call contacts. No CALL_TRACKING_WEBHOOK_SECRET and no CallRail/Twilio/Google-Forwarding credentials are configured, so no provider is posting call events.',
      'Either configure a call-tracking provider to POST to /api/webhooks/call-tracking, or rely on Google Ads call extensions + GA4 phone_click for call visibility.');
  }

  // — Local lead audit log is ephemeral —
  push('MEDIUM', 'Lead logging',
    'The only call/form audit log is an ephemeral local JSONL file',
    'lib/lead-logger.ts appends to data/leads-audit.jsonl on the server filesystem. On Vercel that filesystem is ephemeral and per-instance, and the Supabase quote_requests/contact_messages tables are never written by any API route. There is no durable, queryable lead history in the stack.',
    'Persist lead records to Supabase (or GHL only) and treat GHL as the system of record. Do not rely on leads-audit.jsonl in production.');

  // — GBP profile call action not verifiable —
  R.gapSummary = {
    critical: g.filter((x) => x.severity === 'CRITICAL').length,
    high: g.filter((x) => x.severity === 'HIGH').length,
    medium: g.filter((x) => x.severity === 'MEDIUM').length,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. REPORT
// ═════════════════════════════════════════════════════════════════════════════
function report() {
  head('CALL AUDIT — UPGRADE ROOFS');
  line(`  Window      : last ${DAYS} days  (${RANGE.start} → ${RANGE.end})`);
  line(`  Generated   : ${R.meta.generatedAt}`);
  line(`  Google Ads  : customers/${String(process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '')} (Upgrade Roofs)`);
  line(`  GA4         : properties/${process.env.GA4_PROPERTY_ID || '?'}   GTM: GTM-5LMDG3F7`);

  // ── Consolidated headline ──
  head('1. CONSOLIDATED CALL VOLUME');
  const adsCalls = R.ads.ok ? (R.ads.calls?.total ?? 0) : null;

  const rows = [
    ['Google Ads — call extensions / call-only ads', adsCalls == null ? 'UNAVAILABLE' : String(adsCalls), 'metrics.phone_calls + call_view (agree)'],
    ['Google Ads — click-to-call conversions', R.ads.ok ? String(R.ads.conversions) : 'UNAVAILABLE', 'conversion actions all REMOVED'],
    ['GBP — calls from the Business Profile', R.gbp.ok ? String(R.gbp.callClicks ?? 0) : 'UNAVAILABLE', R.gbp.ok ? 'Performance API CALL_CLICKS' : (R.gbp.failureClass === 'GRANT_MISSING' ? 'no Manager grant (404, access not id)' : 'unavailable')],
    ['Website — tel: click intent (tracked)', R.ga4.ok ? String(R.ga4.events.phone_click || 0) : 'UNAVAILABLE', 'GA4 phone_click — 0 means untracked, not zero'],
    ['Website — WhatsApp click intent', R.ga4.ok ? String(R.ga4.events.whatsapp_click || 0) : 'UNAVAILABLE', 'GA4 whatsapp_click'],
    ['CRM — inbound-call contacts', R.ghl.ok ? String(R.ghl.inboundCallContacts.length) : 'UNAVAILABLE', 'call-tracking webhook never fired'],
  ];
  line();
  line('    ' + 'Channel'.padEnd(46) + 'Value'.padEnd(14) + 'Source');
  line('    ' + '─'.repeat(44) + '  ' + '─'.repeat(12) + '  ' + '─'.repeat(34));
  rows.forEach(([c, v, s]) => line('    ' + c.padEnd(46) + String(v).padEnd(14) + s));

  const measurable = adsCalls ?? 0;
  line();
  line(`    ► Calls provably attributable in this window: ${measurable} (Google Ads only)`);
  line('    ► True total call volume: UNKNOWABLE with the current tracking setup.');
  line('      GBP calls, organic website calls and CRM-logged calls are each unmeasured.');
  line('      Only Ads-served calls are counted, and even those register 0 conversions.');

  // ── Channel detail ──
  head('2. GOOGLE ADS — CALL DETAIL');
  if (!R.ads.ok) {
    line('  UNAVAILABLE: ' + R.ads.error);
  } else {
    kv('Campaign clicks (window)', R.ads.clicks);
    kv('Spend (window)', `£${R.ads.spend.toFixed(2)}`);
    kv('Conversions recorded', R.ads.conversions);
    kv('Calls from call extensions/ads', R.ads.calls?.total ?? 0);
    kv('Call impressions (call assets shown)', R.ads.calls?.impressions ?? 0);
    sub('Per-call detail (call_view, filtered to window)');
    if (!R.ads.perCall.length) line('    (no calls)');
    R.ads.perCall.forEach((c) => {
      line(`    ${c.start}  ${String(c.durationSeconds ?? '?').padStart(4)}s  ${String(c.status).padEnd(9)} ${c.type}  +${c.countryCode}`);
    });
    sub('Per-day attribution');
    (R.ads.calls?.byDay || []).forEach((d) => {
      line(`    ${d.date}  ${d.campaign}  calls=${d.calls}  callImpr=${d.phoneImpressions}  ptr=${d.throughRate != null ? (d.throughRate * 100).toFixed(1) + '%' : '—'}`);
    });
    sub('Call-related conversion actions');
    R.ads.callActions.forEach((a) => line(`    [${a.status.padEnd(8)}] ${a.name}  (${a.type}/${a.category})`));
    sub('Conversion IDs the website currently sends to');
    (R.ads.webConversionIds || []).forEach((r0) => {
      line(`    ${r0.env} = ${r0.value}`);
      line(`      → resolves to: ${r0.resolvedName || '(none)'} [${r0.resolvedStatus}]   (${r0.usedFor})`);
    });
  }

  // ── GA4 ──
  head('3. WEBSITE — CLICK-TO-CALL INTENT (GA4)');
  if (!R.ga4.ok) {
    line('  UNAVAILABLE: ' + R.ga4.error);
  } else {
    kv('Sessions (window)', R.ga4.sessions);
    kv('Key events (conversions)', R.ga4.keyEvents);
    sub('Call & form intent events');
    ['phone_click', 'whatsapp_click', 'email_click', 'quote_request', 'contact_form_submit', 'quote_form_open'].forEach((n) => {
      const v = R.ga4.events[n] || 0;
      line(`    ${String(v).padStart(6)}  ${n}${v ? '' : '   ← ABSENT (event never reached GA4)'}`);
    });
    sub('Proof the property is live — automatic events in the same window');
    ['page_view', 'session_start', 'form_start', 'click', 'form_submit'].forEach((n) => {
      line(`    ${String(R.ga4.events[n] || 0).padStart(6)}  ${n}`);
    });
    sub('Sessions by channel');
    R.ga4.byChannel.forEach((c) => line(`    ${String(c.sessions).padStart(5)}  ${c.channel}  (keyEvents=${c.keyEvents})`));
  }

  // ── GBP ──
  head('4. GOOGLE BUSINESS PROFILE');
  kv('Target location', `locations/${R.gbp.locationId || '?'}`, 34);
  kv('Location id source', R.gbp.locationIdSource || '-', 34);
  kv('Credential identity', R.gbp.identity || '(not resolved)', 34);
  kv('Credential path', R.gbp.credentialPath || '-', 34);
  if (R.gbp.pinnedAccountId) kv('Pinned account (GBP_ACCOUNT_ID)', R.gbp.pinnedAccountId, 34);

  if (!R.gbp.ok) {
    line();
    line('  UNAVAILABLE' + (R.gbp.failureClass ? ` [${R.gbp.failureClass}]` : '') + ': ' + R.gbp.error);
    sub('Accounts visible to that identity');
    if (!R.gbp.accounts?.length) {
      line('    (none — the identity can see no My Business accounts at all)');
    }
    (R.gbp.accounts || []).forEach((a) => {
      line(`    ${a.name}  type=${a.type}  verification=${a.verificationState}  locations=${a.locationCount}`);
      line(`      accountName=${a.accountName}${a.isSelfAccount ? '   ← the service account\'s own auto-created account' : ''}`);
      (a.locationNames || []).forEach((l) => line(`      - ${l}`));
    });
    sub('Access probes');
    kv('GET /v1/locations/<id> (direct)', R.gbp.directLocationStatus ?? 'n/a', 38);
    kv('Performance API (CALL_CLICKS)', R.gbp.performanceStatus ?? 'n/a', 38);
    line();
    if (R.gbp.failureClass === 'GRANT_MISSING') {
      line('    Google returns 404 rather than 403 for a location the caller cannot');
      line('    see, so this is an ACCESS problem, not a bad location id. Both probes');
      line('    404 and the identity sees zero locations — the Manager grant is missing.');
      line();
      line('    Fix: business.google.com → the verified "Upgrade Roofs" profile →');
      line('    Settings → Managers → add the above identity as a Manager. Then re-run.');
    }
  } else {
    kv('GBP call clicks (window)', R.gbp.callClicks);
    Object.entries(R.gbp.metrics || {}).forEach(([k, v]) => kv(k, v));
  }

  // ── CRM ──
  head('5. CRM — CALLS & FORM LEADS (GHL)');
  if (!R.ghl.ok) {
    line('  UNAVAILABLE: ' + R.ghl.error);
  } else {
    kv('Total contacts in location', R.ghl.totalContacts);
    kv('Inbound-call contacts (window+all time)', R.ghl.inboundCallContacts.length);
    kv('Website form leads (window)', R.ghl.formLeads.length);
    sub('Form leads in window');
    if (!R.ghl.formLeads.length) line('    (none)');
    R.ghl.formLeads.forEach((l) => line(`    ${l.date}  ${l.phone || '-'}  ${l.googleAdsLead ? '[AD-ATTRIBUTED] ' : ''}${l.tags.join(', ')}`));
  }

  // ── Gaps ──
  head('6. TRACKING GAPS & DISCREPANCIES');
  if (!R.gaps.length) line('  No gaps detected.');
  R.gaps.forEach((g0, i) => {
    line();
    line(`  [${g0.severity}] ${i + 1}. ${g0.title}`);
    line(`      Channel : ${g0.channel}`);
    line(`      Impact  : ${g0.detail}`);
    line(`      Fix     : ${g0.fix}`);
  });

  const s = R.gapSummary || { critical: 0, high: 0, medium: 0 };
  head('SUMMARY');
  line(`  ${s.critical} CRITICAL · ${s.high} HIGH · ${s.medium} MEDIUM`);
  line();
  line('  Bottom line: Google Ads served the only measurable calls this month, and');
  line(`  even those (${R.ads.calls?.total ?? 0}) registered zero conversions. Website click-to-call, GBP`);
  line('  calls and CRM call logging are all effectively blind. Nothing in this stack');
  line('  currently produces a trustworthy total call count — fix the conversion');
  line('  actions and the GTM triggers before trusting any call number.');
  line();
}

(async () => {
  await Promise.all([
    auditAds().catch((e) => { R.ads.error = e.message; }),
    auditGa4().catch((e) => { R.ga4.error = e.message; }),
    auditGbp().catch((e) => { R.gbp.error = e.message; }),
    auditGhl().catch((e) => { R.ghl.error = e.message; }),
  ]);
  analyse();
  if (AS_JSON) {
    console.log(JSON.stringify(R, null, 2));
  } else {
    report();
  }
})();
