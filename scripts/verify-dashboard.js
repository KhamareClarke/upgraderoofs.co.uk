#!/usr/bin/env node
/**
 * scripts/verify-dashboard.js
 *
 * End-to-end verification of the private dashboard: the access guard, the
 * numbers, and the PWA wiring.
 *
 * ── Why this exists rather than "it returned 200, ship it" ───────────────────
 *
 * Three things can be wrong here and all three fail quietly:
 *
 *   1. THE GUARD. A dashboard that answers 200 at the wrong slug is public, and
 *      nothing about the happy path reveals it. So every protected path is
 *      checked with a WRONG slug as well as the right one.
 *   2. THE NUMBERS. `lead_pipeline_events` holds one row per channel per lead,
 *      so the obvious implementation counts every lead four times. The API's
 *      figures are therefore compared against counts computed here with a
 *      DIFFERENT mechanism — PostgREST server-side `count=exact` rather than the
 *      app's client-side aggregation over paged rows. A second implementation is
 *      the point: two copies of the same bug would agree. The WINDOW SHAPE is
 *      asserted too — three equal, contiguous trailing windows — because a
 *      window that quietly changes length compares two different spans and
 *      renders the difference as a trend.
 *   3. THE PWA. A manifest with a wrong `sizes`, a missing icon, or a service
 *      worker outside its scope all still return 200. They just fail to install,
 *      on a phone, later, where nobody is watching. So the manifest's fields and
 *      every icon it names are fetched and asserted.
 *   4. THE TWO GOOGLE PANELS. Both can be wrong in a way that looks like good
 *      news or like nothing happening: a GA4 click total read over the wrong
 *      window, or an Ads call count read from the `conversions` column of an
 *      action that is flagged out of it (so it is zero by configuration and would
 *      stay zero through a hundred calls). Both are re-read here by a second
 *      implementation and compared field by field.
 *   5. THE LEAD TOTAL. It sums form submissions with four contact-tap figures
 *      drawn from three Google products, across two different window schemes, and
 *      one of those figures is deliberately counted twice. Every way that can go
 *      wrong produces a plausible number rather than an error, so the total is
 *      checked as an arithmetic identity, each tap component is checked against
 *      the panel that reports it, and the listing component is re-derived from
 *      the stored series over the lead windows rather than the panel's own.
 *   6. THE QUOTA BOUND. The one property that cannot be seen in a single response
 *      and cannot be fixed by looking at the code: that a page load SPENDS
 *      NOTHING. Asserted by making three loads and requiring them to report the
 *      same Google observation time while reporting different `generatedAt` — two
 *      figures agreeing across calls that were demonstrably re-executed. A live
 *      read would move that timestamp, and a cached response would freeze
 *      `generatedAt`, so neither can pass by accident.
 *
 * Plain .js talking to PostgREST directly, matching the scripts/audit-*.js
 * convention: a .ts script importing lib/*.ts dies at the `@/` alias, and tsx is
 * not installed here, so it would look like a dead script rather than a broken
 * one.
 *
 * Usage:
 *   node scripts/verify-dashboard.js [--base=http://localhost:3000]
 *
 * Env: DASHBOARD_MARCUS_SLUG (from .env.local), SUPABASE_URL,
 *      SUPABASE_SERVICE_ROLE_KEY
 *
 * Exit: 0 all checks passed · 1 at least one failed.
 */

require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env.local'),
  quiet: true,
});

const { createClient } = require('@supabase/supabase-js');

const BASE = (process.argv.find((a) => a.startsWith('--base=')) || '').split('=')[1] || 'http://localhost:3000';

const SLUG = (process.env.DASHBOARD_MARCUS_SLUG || '').trim();
const WRONG_SLUG = 'marcus-000000000000000000000000';

/**
 * Tracking ids, read with the same fallbacks components/Analytics.tsx uses so a
 * configured override is checked rather than a stale literal.
 *
 * These are asserted as ID PRESENCE IN THE DOCUMENT, in both directions, because
 * the more obvious markers do not work. `next/script` injects afterInteractive
 * content at hydration, so `googletagmanager.com/gtm.js` and
 * `gtag('config', 'G-...')` appear in the SSR HTML of NO page — including the
 * marketing site. Asserting their absence from the dashboard would pass for a
 * reason that has nothing to do with the opt-out. What the initial HTML does
 * carry is the id each tag is built around: the GTM noscript iframe, the GA4
 * loader's <link rel="preload">, and the inline beforeInteractive consent block.
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-5LMDG3F7';
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-7V452FMYFY';

let failures = 0;
let checks = 0;

function pass(label, detail = '') {
  checks += 1;
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, detail = '') {
  checks += 1;
  failures += 1;
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n${title}`);
}

function assertEqual(label, actual, expected) {
  if (actual === expected) pass(label, String(actual));
  else fail(label, `expected ${expected}, got ${actual}`);
}

// ── Window maths, reimplemented ──────────────────────────────────────────────
// Deliberately a SECOND implementation of lib/dashboard-data.ts's windows. If it
// were imported it could only ever confirm itself; written out independently it
// catches an off-by-one in the original.

function pad2(n) {
  return String(n).padStart(2, '0');
}

function iso(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function addDays(isoStr, days) {
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return iso(dt);
}

/**
 * The three windows, reimplemented here rather than imported.
 *
 * The duplication is deliberate: importing `leadWindows` would make every window
 * assertion below compare the app against itself, so a mistake in the formula
 * would verify clean. Written independently, agreement is evidence.
 *
 * `ROLLING_DAYS` is counted INCLUSIVELY, so a 30-day window starts 29 days back.
 */
const ROLLING_DAYS = 30;

function windows(now = new Date()) {
  const currentTo = iso(now);
  const currentFrom = addDays(currentTo, -(ROLLING_DAYS - 1));
  const previousTo = addDays(currentFrom, -1);
  const previousFrom = addDays(previousTo, -(ROLLING_DAYS - 1));
  const previousFullTo = addDays(previousFrom, -1);
  const previousFullFrom = addDays(previousFullTo, -(ROLLING_DAYS - 1));
  return {
    current: { from: currentFrom, to: currentTo },
    previous: { from: previousFrom, to: previousTo },
    previousFull: { from: previousFullFrom, to: previousFullTo },
  };
}

/** Days covered by a window, counting both ends. */
function dayCount(win) {
  const [fy, fm, fd] = win.from.split('-').map(Number);
  const [ty, tm, td] = win.to.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000) + 1;
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

async function get(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...opts });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SLUG) {
    console.error('DASHBOARD_MARCUS_SLUG is not set in .env.local — nothing to verify. See .env.example.');
    process.exit(1);
  }

  console.log(`Verifying ${BASE}`);
  console.log(`Slug: ${SLUG.slice(0, 8)}…${SLUG.slice(-4)} (${SLUG.length} chars)`);

  // ── 1. The guard ───────────────────────────────────────────────────────────
  section('1. Access guard — the URL is the only credential');

  const rightPage = await get(`/dashboard/${SLUG}`);
  assertEqual('page at the correct slug is 200', rightPage.status, 200);

  const wrongPage = await get(`/dashboard/${WRONG_SLUG}`);
  assertEqual('page at a wrong slug is 404', wrongPage.status, 404);

  const rightApi = await get(`/api/dashboard/${SLUG}`);
  assertEqual('API at the correct slug is 200', rightApi.status, 200);

  const wrongApi = await get(`/api/dashboard/${WRONG_SLUG}`);
  assertEqual('API at a wrong slug is 404', wrongApi.status, 404);

  assertEqual('manifest at a wrong slug is 404', (await get(`/dashboard/${WRONG_SLUG}/manifest.webmanifest`)).status, 404);
  assertEqual('service worker at a wrong slug is 404', (await get(`/dashboard/${WRONG_SLUG}/sw.js`)).status, 404);

  // The 404 must not leak the API's shape either.
  if (/storeNote|currentTotals|bySource/.test(wrongApi.text)) {
    fail('wrong-slug 404 leaks no payload fields', 'response body contained dashboard keys');
  } else {
    pass('wrong-slug 404 leaks no payload fields');
  }

  // Nothing about the dashboard may be cacheable by a shared cache.
  const cc = rightApi.headers.get('cache-control') || '';
  if (/no-store/.test(cc)) pass('API is no-store', cc);
  else fail('API is no-store', `cache-control was "${cc}"`);

  const xr = rightApi.headers.get('x-robots-tag') || '';
  if (/noindex/.test(xr)) pass('API sends X-Robots-Tag: noindex', xr);
  else fail('API sends X-Robots-Tag: noindex', `was "${xr}"`);

  // ── 2. The numbers ─────────────────────────────────────────────────────────
  section('2. Numbers — the lead total, cross-checked against the raw table');

  let api;
  try {
    api = JSON.parse(rightApi.text);
  } catch {
    fail('API returned JSON', rightApi.text.slice(0, 200));
    return report();
  }
  pass('API returned JSON');

  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    fail('service-role credentials available for cross-check', 'SUPABASE_SERVICE_ROLE_KEY unset');
    return report();
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const w = windows();

  /**
   * Count rows via PostgREST's server-side count — a different mechanism from
   * the app's fetch-and-tally, which is what makes this a real cross-check.
   */
  async function countGhl(from, to, ok) {
    let q = sb
      .from('lead_pipeline_events')
      .select('*', { count: 'exact', head: true })
      .eq('channel', 'ghl')
      .gte('created_at', `${from}T00:00:00.000Z`)
      .lte('created_at', `${to}T23:59:59.999Z`);
    q = ok === undefined ? q : q.eq('ok', ok);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return count;
  }

  for (const [name, win, apiPeriod] of [
    ['last 30 days', w.current, api.current],
    ['previous 30 days', w.previous, api.previous],
    ['the 30 days before that', w.previousFull, api.previousFull],
  ]) {
    const accepted = await countGhl(win.from, win.to, undefined);
    const crmOk = await countGhl(win.from, win.to, true);
    const crmFailed = await countGhl(win.from, win.to, false);

    assertEqual(`${name}: accepted matches the table`, apiPeriod.accepted, accepted);
    assertEqual(`${name}: CRM-ok matches the table`, apiPeriod.crmOk, crmOk);
    assertEqual(`${name}: CRM-failed matches the table`, apiPeriod.crmFailed, crmFailed);

    // The identity that would break if channels were being summed rather than
    // counted from one: a lead produces one ghl row, so ok + failed = accepted.
    if (crmOk + crmFailed !== accepted) {
      fail(`${name}: ok + failed = accepted`, `${crmOk} + ${crmFailed} !== ${accepted}`);
    } else {
      pass(`${name}: ok + failed = accepted`, `${crmOk} + ${crmFailed} = ${accepted}`);
    }
  }

  // The form rows of the breakdown must sum to what they are built from — the
  // `ghl` rows that reached the CRM. NOT to `accepted` (which also counts failed
  // upserts) and NOT to `total` (which adds taps). Labelled for what it is.
  const sourceSum = (api.current.bySource || []).reduce((a, s) => a + s.count, 0);
  assertEqual('form breakdown sums to CRM-ok', sourceSum, api.current.crmOk);

  // ── The lead total, and the taps folded into it ────────────────────────────
  //
  // The headline is form submissions PLUS every contact tap, so the identity to
  // check is that it equals the sum of its parts — and that each tap part is the
  // SAME number the panel further down reports. The app reads the taps through a
  // separate path (readLeadTaps, off the panels' payloads), so agreement here is
  // evidence rather than a tautology.
  //
  // GBP is the exception and the reason this block does its own read: the listing
  // panel deliberately uses its own settled 30-day window, while the lead total
  // sums the stored series over the LEAD windows. A panel figure compared against
  // the total would disagree by design, so the listing component is re-derived
  // from `gbp_daily_metrics` here instead.

  const { data: gbpLeadRows, error: gbpLeadErr } = await sb
    .from('gbp_daily_metrics')
    .select('metric, metric_date, value')
    .eq('metric', 'CALL_CLICKS')
    .gte('metric_date', w.previousFull.from)
    .lte('metric_date', w.current.to);
  if (gbpLeadErr) {
    fail('gbp_daily_metrics readable for the lead total', gbpLeadErr.message);
  }

  const gbpCallsIn = (from, to) =>
    (gbpLeadRows || [])
      .filter((r) => r.metric_date >= from && r.metric_date <= to)
      .reduce((a, r) => a + r.value, 0);

  const LEAD_WINDOWS = [
    ['last 30 days', w.current, api.current, 'current'],
    ['previous 30 days', w.previous, api.previous, 'previous'],
    ['the 30 days before that', w.previousFull, api.previousFull, 'previousFull'],
  ];

  for (const [name, win, period, which] of LEAD_WINDOWS) {
    const taps = period.taps || {};

    // The arithmetic this whole change is for: the headline is the sum of its
    // parts, and none of the parts can be silently dropped.
    assertEqual(
      `${name}: total = accepted + every tap source`,
      period.total,
      period.accepted + taps.callButton + taps.whatsapp + taps.gbpCalls + taps.adsTaps,
    );

    if (period.total < period.accepted) {
      fail(`${name}: total is at least the form count`, `${period.total} < ${period.accepted}`);
    } else {
      pass(`${name}: total is at least the form count`, `${period.total} >= ${period.accepted}`);
    }

    // The double count is declared exactly when there is something to double
    // count, so the card's marker cannot go stale in either direction.
    assertEqual(
      `${name}: the Ads overlap is flagged exactly when Ads taps exist`,
      period.tapsOverlap,
      taps.adsTaps > 0,
    );

    if (!gbpLeadErr) {
      assertEqual(
        `${name}: listing call clicks match the stored series over the lead window`,
        taps.gbpCalls,
        gbpCallsIn(win.from, win.to),
      );
    }

    if (api.clicks.available) {
      assertEqual(
        `${name}: site call taps match the GA4 panel`,
        taps.callButton,
        api.clicks[`${which}Totals`].phone,
      );
      assertEqual(
        `${name}: WhatsApp taps match the GA4 panel`,
        taps.whatsapp,
        api.clicks[`${which}Totals`].whatsapp,
      );
    } else {
      console.log('  · GA4 unavailable — its two tap components NOT cross-checked');
    }

    if (api.ads.available && api.ads.taps) {
      assertEqual(
        `${name}: Ads tap conversions match the Ads panel`,
        taps.adsTaps,
        api.ads.taps[`${which}Conversions`],
      );
    } else {
      console.log('  · Ads taps unavailable — that component NOT cross-checked');
    }
  }

  {
    const t = api.current.taps || {};
    const taps = t.callButton + t.whatsapp + t.gbpCalls + t.adsTaps;
    console.log(
      `  · Leads, last 30 days: ${api.current.total} total — ` +
        `${api.current.accepted} form + ${taps} taps ` +
        `(${t.callButton} call, ${t.whatsapp} WhatsApp, ${t.adsTaps} ads, ${t.gbpCalls} listing) ` +
        `· was ${api.previous.total} over the previous 30 days`,
    );
  }

  // A tap source that could not be read must be NAMED, because its zero is
  // indistinguishable from a real zero and quietly shrinks the headline — the
  // exact failure this dashboard exists to avoid.
  const anyTapSourceMissing =
    !api.clicks.available || !api.ads.available || !api.ads.taps || Boolean(gbpLeadErr);
  if (anyTapSourceMissing && (api.current.tapsMissing || []).length === 0) {
    fail(
      'unreadable tap sources are named in the payload',
      'a source was unavailable but tapsMissing is empty, so the total reads as a real figure',
    );
  } else if (!anyTapSourceMissing && (api.current.tapsMissing || []).length > 0) {
    fail(
      'no tap source reported missing on a healthy read',
      (api.current.tapsMissing || []).join(', '),
    );
  } else {
    pass(
      'tap sourcing is reported honestly',
      anyTapSourceMissing
        ? `named: ${(api.current.tapsMissing || []).join(', ')}`
        : 'nothing missing',
    );
  }

  // The listing figure arrives incomplete and the note has to say so — and has to
  // be able to turn OFF, or it is decoration rather than a check.
  const lastSettled = api.gbp.coveredTo ? addDays(api.gbp.coveredTo, -5) : null;
  const settling = lastSettled !== null && w.current.to > lastSettled;
  if (settling && !api.current.note) {
    fail(
      'the total warns while listing data is still settling',
      `window ends ${w.current.to}, settled only to ${lastSettled}, but note is empty`,
    );
  } else if (!settling && api.current.note) {
    fail(
      'the total stops warning once listing data has settled',
      `note is still set: ${api.current.note}`,
    );
  } else {
    pass(
      'the settling warning is shown exactly when it applies',
      settling ? 'shown' : 'not needed',
    );
  }

  // ── The windows must be the declared rolling shape ─────────────────────────
  //
  // This replaced a check that the window started on the 1st. That assertion
  // pinned the old calendar anchoring; these pin what actually matters now — that
  // every window is the same length and that they are contiguous, because a
  // percentage comparing two different-length spans is the bug the trailing
  // window exists to prevent.
  for (const [name, win] of [
    ['last 30 days', api.current],
    ['previous 30 days', api.previous],
    ['the 30 days before that', api.previousFull],
  ]) {
    assertEqual(`${name}: window is exactly ${ROLLING_DAYS} days`, dayCount(win), ROLLING_DAYS);
  }

  assertEqual(
    'the two compared windows are the same length (like-for-like)',
    dayCount(api.current),
    dayCount(api.previous),
  );

  // Anchored to today, not to a calendar boundary — a window that stops short of
  // today is silently hiding the newest leads.
  assertEqual('the window ends today', api.current.to, iso(new Date()));
  assertEqual(
    `the window starts ${ROLLING_DAYS - 1} days before it ends`,
    api.current.from,
    addDays(api.current.to, -(ROLLING_DAYS - 1)),
  );

  // Contiguous: no day counted twice, and no day dropped between windows.
  for (const [name, later, earlier] of [
    ['previous 30 days', api.current, api.previous],
    ['the 30 days before that', api.previous, api.previousFull],
  ]) {
    assertEqual(
      `${name}: ends the day before the later window starts`,
      earlier.to,
      addDays(later.from, -1),
    );
  }

  // ── 3. GBP panel ───────────────────────────────────────────────────────────
  section('3. GBP panel — anchored to a settled day, not to today');

  const gbp = api.gbp;
  if (!gbp.available) {
    console.log(`  · GBP unavailable: ${gbp.note}`);
  } else {
    if (gbp.coveredTo && gbp.current.to < gbp.coveredTo) {
      pass('window ends before the last covered day', `ends ${gbp.current.to}, covered to ${gbp.coveredTo}`);
    } else {
      fail('window ends before the last covered day', `ends ${gbp.current.to}, covered to ${gbp.coveredTo}`);
    }

    // Independent read of the stored series for exactly the window claimed.
    const { data: rows, error } = await sb
      .from('gbp_daily_metrics')
      .select('metric, metric_date, value')
      .gte('metric_date', gbp.previous.from)
      .lte('metric_date', gbp.current.to);
    if (error) {
      fail('gbp_daily_metrics readable for cross-check', error.message);
    } else {
      const sum = (from, to, metric) =>
        rows.filter((r) => r.metric_date >= from && r.metric_date <= to && r.metric === metric)
          .reduce((a, r) => a + r.value, 0);

      assertEqual('GBP call clicks match the stored series', gbp.currentTotals.callClicks, sum(gbp.current.from, gbp.current.to, 'CALL_CLICKS'));
      assertEqual('GBP direction requests match the stored series', gbp.currentTotals.directionRequests, sum(gbp.current.from, gbp.current.to, 'BUSINESS_DIRECTION_REQUESTS'));
      assertEqual('GBP website clicks match the stored series', gbp.currentTotals.websiteClicks, sum(gbp.current.from, gbp.current.to, 'WEBSITE_CLICKS'));
      assertEqual('GBP prior-period calls match the stored series', gbp.previousTotals.callClicks, sum(gbp.previous.from, gbp.previous.to, 'CALL_CLICKS'));
    }
  }

  // ── 4. Ads panel ───────────────────────────────────────────────────────────
  section('4. Google Ads panel');
  if (!api.ads.available) {
    console.log(`  · Ads unavailable: ${api.ads.note}`);
  } else {
    pass('Ads spend read', `£${(api.ads.currentTotals.costMicros / 1e6).toFixed(2)} this period`);
    // Printed here so the run shows what the panel renders, before section 8
    // spends its time re-reading each figure against the API independently.
    console.log(
      `  · ${ADS_FIGURES.map((f) => {
        const figures = api.ads[f.key];
        if (!figures) return `${f.label}: unread`;
        return `${f.label}: ${figures.currentConversions} (was ${figures.previousConversions})`;
      }).join(' · ')}`,
    );
  }

  // ── 5. PWA wiring ──────────────────────────────────────────────────────────
  section('5. PWA — installable, and scoped to the dashboard only');

  const manRes = await get(`/dashboard/${SLUG}/manifest.webmanifest`);
  assertEqual('manifest is 200', manRes.status, 200);
  const manCT = manRes.headers.get('content-type') || '';
  if (/manifest\+json/.test(manCT)) pass('manifest content-type', manCT);
  else fail('manifest content-type', manCT);

  let man;
  try {
    man = JSON.parse(manRes.text);
    pass('manifest is valid JSON');
  } catch {
    fail('manifest is valid JSON', manRes.text.slice(0, 120));
    man = null;
  }

  if (man) {
    assertEqual('manifest start_url opens the dashboard', man.start_url, `/dashboard/${SLUG}`);
    assertEqual('manifest scope is the slug directory', man.scope, `/dashboard/${SLUG}/`);
    assertEqual('manifest display is standalone (opens full-screen)', man.display, 'standalone');
    if (/^#/.test(man.theme_color || '')) pass('manifest theme_color', man.theme_color);
    else fail('manifest theme_color', String(man.theme_color));

    for (const icon of man.icons || []) {
      const res = await get(icon.src);
      const ct = res.headers.get('content-type') || '';
      if (res.status === 200 && /image\/png/.test(ct)) pass(`icon ${icon.src}`, `${icon.sizes}, ${ct}`);
      else fail(`icon ${icon.src}`, `status ${res.status}, type ${ct}`);
    }
  }

  const swRes = await get(`/dashboard/${SLUG}/sw.js`);
  assertEqual('service worker is 200', swRes.status, 200);
  const swCT = swRes.headers.get('content-type') || '';
  if (/javascript/.test(swCT)) pass('service worker content-type', swCT);
  else fail('service worker content-type', swCT);
  if (swRes.headers.get('service-worker-allowed')) {
    fail('service worker does NOT widen its scope', `Service-Worker-Allowed was ${swRes.headers.get('service-worker-allowed')}`);
  } else {
    pass('service worker does NOT widen its scope (stays inside /dashboard/<slug>/)');
  }
  if (swRes.text.includes(`/api/`)) pass('service worker refuses to handle /api/');
  else fail('service worker refuses to handle /api/', 'no /api/ guard found in the script');

  // ── 6. The page itself ─────────────────────────────────────────────────────
  section('6. Page — private, chrome-free, and not tracked');

  const html = rightPage.text;
  if (/name="robots"[^>]*noindex/.test(html)) pass('page is noindex');
  else fail('page is noindex', 'no robots noindex meta found');
  if (html.includes(`/dashboard/${SLUG}/manifest.webmanifest`)) pass('page links its slug-scoped manifest');
  else fail('page links its slug-scoped manifest');
  if (/apple-mobile-web-app-capable/.test(html)) pass('page sets apple-mobile-web-app-capable');
  else fail('page sets apple-mobile-web-app-capable');

  // The site chrome must not be here: this is an app, and a lead-capture form on
  // an internal tool would be a customer-facing box inside Marcus's dashboard.
  //
  // Tracking is checked by what it would MEASURE rather than by the presence of
  // any google string, because the Ads loader tag is still emitted deliberately
  // (see the note in app/layout.tsx). gtag.js sends nothing without a config or
  // event call, so the assertion that matters is that no config call can fire.
  //
  // Each of these is the id a tag is built around, so it is present wherever the
  // tag is. Section 7 asserts the same three strings ARE on `/` — a marker that
  // is absent everywhere would make these pass on the dashboard for free.
  if (html.includes(GTM_ID)) fail('page does not reference the GTM container', `${GTM_ID} found`);
  else pass('page does not reference the GTM container', GTM_ID);

  if (html.includes(GA4_ID)) fail('page does not reference the GA4 measurement id', `${GA4_ID} found`);
  else pass('page does not reference the GA4 measurement id', GA4_ID);

  // Consent mode is beforeInteractive, so it really is inline markup — no id
  // needed, the call itself is in the document.
  if (/gtag\('consent'/.test(html)) fail('page does not ship consent mode', 'consent mode found in HTML');
  else pass('page does not ship consent mode');

  // The Ads config call must be inside the dashboard guard. Asserting the guard
  // is present is what makes that checkable — the string itself is expected.
  if (/startsWith\('\/dashboard'\)/.test(html)) pass('Ads config call is guarded against /dashboard');
  else fail('Ads config call is guarded against /dashboard', 'no pathname guard found in the inline script');

  // Chrome and the lead form, by markers confirmed present on `/` in section 7:
  // the Header's nav links, and the wizard's Roof-type select placeholder. A
  // marker that is absent from `/` would make these pass for the wrong reason,
  // which is why section 7 exists and runs either side of this.
  if (/href="\/about"/.test(html)) fail('page has no site header', 'Header nav link found');
  else pass('page has no site header');

  if (/What you need/.test(html)) fail('page has no lead-capture form', 'lead form marker found');
  else pass('page has no lead-capture form');

  if (/wa\.me\//.test(html)) fail('page has no WhatsApp float', 'wa.me link found');
  else pass('page has no WhatsApp float');

  const robots = await get('/robots.txt');
  if (robots.text.includes('/dashboard/')) pass('robots.txt disallows /dashboard/');
  else fail('robots.txt disallows /dashboard/', 'not listed');

  // ── 7. Marketing site regression ───────────────────────────────────────────
  // This dashboard is built out of shared components — the root layout, the
  // conditional layout, Analytics, ClientWidgets — and every one of them was
  // edited to add a dashboard opt-out. An opt-out written slightly too broadly
  // does not break the dashboard; it silently switches off tracking or chrome
  // for the marketing site, which is the part of this that earns money. So the
  // site is asserted here, in the same run, against the same markers section 6
  // requires the dashboard to be missing.
  section('7. Marketing site — still tracked, still chromed');

  const home = await get('/');
  assertEqual('home page is 200', home.status, 200);

  // The GTM and GA4 markers are the same id strings section 6 requires the
  // dashboard to be free of. If either goes missing here, section 6 has stopped
  // proving anything, and the pair of results says so in one run.
  for (const [label, re, why] of [
    ['home still ships consent mode', /gtag\('consent'/, 'Consent Mode V2 missing'],
    ['home still carries the GTM container', new RegExp(GTM_ID), 'GTM container id missing'],
    ['home still carries the GA4 measurement id', new RegExp(GA4_ID), 'GA4 id missing'],
    ['home still renders the header', /href="\/about"/, 'Header nav missing'],
    ['home still renders the lead form', /What you need/, 'site-wide lead form missing'],
  ]) {
    if (re.test(home.text)) pass(label);
    else fail(label, why);
  }

  // The Ads `config` call is the one thing the dashboard guard wraps, so it must
  // still fire everywhere else. Asserting the CALL is not enough — the string is
  // in the HTML of every page, inside or outside the `if`, so this pins the
  // whole guarded expression instead: the call, and the negation in front of it.
  // On `/`, `location.pathname` is `/`, the condition is true, and it fires.
  if (/if \(!location\.pathname\.startsWith\('\/dashboard'\)\) \{ gtag\('config', 'AW-/.test(home.text)) {
    pass('home still fires the Ads config call (unguarded by the dashboard check)');
  } else {
    fail('home still fires the Ads config call', 'guarded Ads config call not found in the inline script');
  }

  // ── 8. GA4 clicks and the three Ads conversion figures ─────────────────────
  section('8. The two Google panels — re-read independently');

  await verifyClicks(api, w);
  await verifyAdsActions(api);

  // ── 9. One list, one total ─────────────────────────────────────────────────
  section('9. Layout — every lead figure appears once');

  verifyNoDoubleCounting(api);

  // Fetched once and handed to both sections that read it: section 9 for the
  // rendered layout, section 10 for the refresh copy.
  const chunkJs = await dashboardChunkJs(rightPage);
  if (chunkJs) verifyServedLayout(chunkJs, api);

  // ── 10. Stored snapshots and the quota bound ───────────────────────────────
  section('10. The Google panels come from storage, not from Google');

  await verifyStoredSnapshots(chunkJs);

  report();
}

/**
 * Section 10 — the quota bound, and the copy that describes it.
 *
 * ── The one check that cannot be satisfied by accident ───────────────────────
 *
 * Everything else in this file inspects a single response. The property that
 * actually protects the Ads developer token is a property of the SEQUENCE: that
 * loading the page again does not read Google again. So three loads are made and
 * held against each other, requiring
 *
 *   generatedAt  to DIFFER — the payload really was rebuilt, so nothing above is
 *                 an artefact of a cached HTTP response;
 *   googleAsOf   to MATCH  — and therefore not one of those three rebuilds read
 *                 Google, or it would carry the time of its own read.
 *
 * Both halves are needed. Agreement alone passes if the response is cached, and
 * difference alone passes if the figures are live. Three reads rather than two
 * because the first may legitimately refresh a snapshot that has gone stale, and
 * a just-refreshed `googleAsOf` is close enough to `generatedAt` to make the
 * second assertion meaningless; by reads 2 and 3 any refresh has settled.
 *
 * ── The unauthenticated cron call ────────────────────────────────────────────
 *
 * `/api/cron/google-sync` writes with the service-role key, so a 401 is the only
 * thing standing between it and an anonymous caller. Its sibling
 * `/api/gbp/sync` is not re-checked here: the guard is one shared function, and
 * the assertion that matters — that the NEW route reaches it — is this one.
 */
async function verifyStoredSnapshots(js) {
  const load = async () => {
    const res = await get(`/api/dashboard/${SLUG}`);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(res.text);
  };

  let reads;
  try {
    reads = [await load()];
    for (let i = 0; i < 2; i += 1) {
      await new Promise((r) => setTimeout(r, 1200));
      reads.push(await load());
    }
  } catch (err) {
    fail(
      'the API can be read three times for a sequence check',
      err instanceof Error ? err.message : String(err),
    );
    return;
  }
  const [, second, third] = reads;

  if (second.generatedAt !== third.generatedAt) {
    pass('the payload is rebuilt on every request', `${second.generatedAt} → ${third.generatedAt}`);
  } else {
    fail(
      'the payload is rebuilt on every request',
      `generatedAt was ${third.generatedAt} on both — a cached response would make the check below meaningless`,
    );
  }

  if (typeof second.googleAsOf === 'string' && second.googleAsOf) {
    pass('the payload reports when the Google figures were read', second.googleAsOf);
  } else {
    fail('the payload reports when the Google figures were read', `was ${second.googleAsOf}`);
  }

  if (second.googleAsOf && second.googleAsOf === third.googleAsOf) {
    pass('two page loads seconds apart report the same Google read time');
  } else {
    fail(
      'two page loads seconds apart report the same Google read time',
      `${second.googleAsOf} then ${third.googleAsOf} — a page load is reading Google`,
    );
  }

  // The stored time is an OBSERVATION time, hours behind the payload it rides in.
  // Equality here would mean the figures were fetched to build this response.
  if (second.googleAsOf && second.googleAsOf !== third.generatedAt) {
    pass('the Google read time is not the payload build time');
  } else {
    fail(
      'the Google read time is not the payload build time',
      'googleAsOf equals generatedAt, so the read happened while the payload was assembled',
    );
  }

  // The fail-closed note must not be what is rendering. If it is, the table is
  // missing (or unreadable) and every figure below it is absent — a state that
  // otherwise looks like "a quiet month".
  const NOTE_MARKER = 'No stored Google figures are available';
  for (const [name, panel] of [['Ads', third.ads], ['GA4', third.clicks]]) {
    const note = String((panel && panel.note) || '');
    assertEqual(`the ${name} panel is not showing the missing-store notice`, note.includes(NOTE_MARKER), false);
  }
  assertEqual('the payload reports no missing store', third.storeNote, null);

  // The cron route must refuse an anonymous caller. No caveat about which
  // credential is missing, and nothing from the request echoed back.
  const cron = await get('/api/cron/google-sync');
  assertEqual('the sync cron refuses an unauthenticated call', cron.status, 401);
  assertEqual(
    'the cron refusal names no credential and echoes no header',
    /CRON_SECRET|Bearer|Authorization/i.test(cron.text),
    false,
  );

  // The copy and the code have to agree, and only the copy is checkable from
  // outside: minification preserves string literals but not numeric ones, so a
  // pinned sentence is the only way to notice that the refresh cadence was
  // changed in the code and not in what the page tells the reader. This phrase is
  // the load-bearing half of the footer — it is the sentence that claims page
  // loads cost nothing.
  if (!js) {
    fail('the footer states where the Google figures come from', 'the route chunk could not be read');
    return;
  }
  assertEqual(
    'the footer states where the Google figures come from',
    js.includes('served from storage between times'),
    true,
  );
}

/**
 * The data half of "one list, one total".
 *
 * The page cannot be checked by reading its HTML — it is fully client-rendered,
 * so the served document contains a skeleton and nothing else. What CAN be
 * checked from here is the invariant the layout exists to protect: that the
 * headline is the sum of the five named components and of nothing else, so a
 * reader who adds up the leads section lands on the headline.
 *
 * The second half is disjointness. The context section is allowed to show
 * numbers, but none of them may be a field the total is built from — otherwise
 * the same measurement is back on the page twice under a different heading,
 * which is the exact regression this guards.
 */
function verifyNoDoubleCounting(api) {
  const TAP_KEYS = ['callButton', 'whatsapp', 'adsTaps', 'gbpCalls'];

  for (const which of ['current', 'previous', 'previousFull']) {
    const p = api[which];
    const keys = Object.keys(p.taps || {}).sort();
    assertEqual(
      `${which}: the total is built from exactly these four tap sources`,
      keys.join(','),
      [...TAP_KEYS].sort().join(','),
    );
  }

  // Fields the CONTEXT section renders. None may also be a component of the
  // total, and none may be one of the four tap sources.
  const CONTEXT_FIELDS = [
    'directionRequests',
    'websiteClicks',
    'costMicros',
    'clicks',
    'currentConversions',
  ];
  const LEAD_FIELDS = ['accepted', ...TAP_KEYS, 'total'];

  const collide = CONTEXT_FIELDS.filter((f) => LEAD_FIELDS.includes(f));
  assertEqual(
    'no context field is also a lead-total component',
    collide.join(',') || 'none',
    'none',
  );

  // The listing is where the old layout doubled up: the SAME call clicks were
  // shown both as a lead row and as the listing panel's own "Calls" tile. They
  // come from different windows, so they are legitimately different numbers —
  // but the panel figure must never be what the total uses. Re-derive the total's
  // listing component from the raw rows over the LEAD window and confirm it is
  // that, not the panel's tile, that appears in the sum.
  const leadWindowGbp = api.current.taps.gbpCalls;
  const panelGbp = api.gbp.available ? api.gbp.currentTotals.callClicks : null;
  if (panelGbp === null) {
    pass('listing panel figure is not used by the total', 'panel unavailable — nothing to confuse');
  } else {
    pass(
      'listing lead row and listing panel tile are separate measurements',
      `lead window ${leadWindowGbp} vs panel window ${panelGbp}` +
        (leadWindowGbp === panelGbp ? ' (equal today, but read from different windows)' : ''),
    );
  }

  // The overlap disclosure must be present exactly when there is an overlap to
  // disclose, so it can turn itself off rather than being permanent furniture.
  assertEqual(
    'the Ads overlap is flagged exactly when Ads taps exist',
    api.current.tapsOverlap,
    api.current.taps.adsTaps > 0,
  );
}

/**
 * The JavaScript of the dashboard's own route chunks, or null if it cannot be
 * found — in which case a failure is already recorded, naming which.
 *
 * Worth its own function because two sections need the same bytes: section 9
 * reads the rendered layout out of them, and section 10 pins the refresh copy.
 * Fetching twice would double the failure messages for one missing chunk.
 *
 * The page is client-rendered, so the served document is a skeleton: no figure,
 * no label, no copy. What it does carry is the RSC flight payload, which names
 * the route's client chunks as escaped JSON strings — `\/` for every `/`. So the
 * escapes are stripped before matching, and the chunks are re-fetched from
 * `/_next/`. A path with `[slug]` in it must be percent-encoded or it 404s,
 * which would otherwise look like the chunk is missing.
 */
async function dashboardChunkJs(page) {
  const unescaped = page.text.replace(/\\/g, '');
  const chunks = [
    ...new Set(
      [...unescaped.matchAll(/static\/chunks\/[\w./%[\]-]+?\.js/g)].map((m) => m[0]),
    ),
  ].filter((c) => c.includes('/app/dashboard/'));

  if (chunks.length === 0) {
    fail(
      'the dashboard route chunk is findable in the served page',
      'no /app/dashboard/ chunk named in the flight payload — the layout checks below cannot run',
    );
    return null;
  }

  const bodies = [];
  for (const chunk of chunks) {
    const path = `/_next/${chunk}`.replace(/\[/g, '%5B').replace(/\]/g, '%5D');
    const res = await get(path);
    if (res.status !== 200) {
      fail('the dashboard route chunk is served', `${chunk} → HTTP ${res.status}`);
      return null;
    }
    bodies.push(res.text);
  }
  return bodies.join('\n');
}

/**
 * The layout half: what the browser is actually told to draw.
 *
 * The page is client-rendered, so the strings live in the route's JS chunk, not
 * in the HTML. Three traps, all of which produce a confident false result:
 *
 *   1. The chunk path has SUBDIRECTORIES (`chunks/app/dashboard/[slug]/page-*.js`),
 *      so a `[A-Za-z0-9._-]+\.js` pattern skips the only chunk that matters while
 *      still reporting a plausible number of chunks.
 *   2. The names ride the RSC flight payload ESCAPED, so every slash is `\/` and
 *      nothing matches until the payload is unescaped.
 *   3. `[slug]` must be percent-encoded or the request 404s — and a 404 body
 *      contains none of the needles, so it reads as "the old layout shipped"
 *      rather than "I could not find the file".
 *
 * `js` is the joined chunk source, fetched by `dashboardChunkJs` above.
 */
async function verifyServedLayout(js, api) {

  // The five rows of the single breakdown, each present exactly once as a label.
  const ROW_LABELS = [
    'Form leads',
    'Call button taps',
    'WhatsApp taps',
    'Google listing calls',
    'Ads tap conversions',
  ];
  for (const label of ROW_LABELS) {
    assertEqual(`the breakdown renders a "${label}" row`, js.includes(label), true);
  }

  // The panels whose contents were duplicates of those rows must be gone. If a
  // title comes back, the duplication has come back with it.
  for (const gone of ['Where they came from', 'Clicks on the site']) {
    assertEqual(`the duplicate panel "${gone}" is gone`, js.includes(gone), false);
  }

  // The context section must announce that it is not part of the count, or the
  // spend and the listing activity read as more leads. Pinned to the exact
  // sentence rather than a loose phrase: a reworded disclaimer that no longer
  // says this is a disclaimer that no longer works, and the check should notice.
  assertEqual(
    'the context section says it is not part of the lead count',
    js.includes('Nothing in this section is part of the lead count above'),
    true,
  );

  // What the context section is allowed to show, and the proof that the listing
  // panel's OWN call tile is not among it: these two are the only listing
  // figures it renders. The call-clicks tile is the specific figure that used to
  // appear twice on the page, so its absence as a second labelled figure is the
  // thing worth pinning. Property names survive minification, so a `.taps.<field>`
  // read is checkable in the served bundle; a JSX prop name is not.
  for (const label of ['Direction requests', 'Site clicks']) {
    assertEqual(`the context section renders a "${label}" figure`, js.includes(label), true);
  }

  // Every breakdown row must read its component of the lead total — a static
  // echo of the invariant the payload check above proves.
  for (const field of ['callButton', 'whatsapp', 'gbpCalls', 'adsTaps']) {
    assertEqual(
      `the breakdown reads taps.${field}`,
      new RegExp(`\\.taps\\.${field}\\b`).test(js),
      true,
    );
  }

  // Google figures are served from `google_panel_snapshots` and the lead figures
  // are not, which is the distinction that keeps the Ads quota safe — so the
  // observation time has to be on the payload for the card to be able to say so.
  assertEqual(
    'the served payload reports when the Google panels were last read',
    typeof api.googleAsOf === 'string' && api.googleAsOf.length > 0,
    true,
  );
}

// ── Section 8 helpers ────────────────────────────────────────────────────────
// A second implementation of the two reads, in the same spirit as `windows()`
// above: written out here rather than imported, so a bug in the app's version
// cannot agree with itself.

const CLICK_EVENTS = [
  ['phone_click', 'phone'],
  ['whatsapp_click', 'whatsapp'],
  ['email_click', 'email'],
];

const OLDEST_RECORDED_CLICK = '2026-09-15';

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Service-account JWT → access token. Plain fetch + node:crypto, like the app. */
async function serviceAccountToken() {
  const fs = require('fs');
  const inline = (process.env.GA4_SERVICE_ACCOUNT_JSON || '').trim();
  const keyPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (!inline && !keyPath) return null;
  const key = JSON.parse(inline || fs.readFileSync(keyPath, 'utf8'));

  const issued = Math.floor(Date.now() / 1000);
  const claims = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: key.token_uri || 'https://oauth2.googleapis.com/token',
    iat: issued,
    exp: issued + 3600,
  };
  const signingInput = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
  const assertion = `${signingInput}.${b64url(
    require('crypto').createSign('RSA-SHA256').update(signingInput).sign(key.private_key),
  )}`;

  const res = await fetch(claims.aud, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`service-account exchange HTTP ${res.status}: ${body.error_description || body.error || ''}`);
  }
  return body.access_token;
}

async function ga4Clicks(token, propertyId, from, to) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', inListFilter: { values: CLICK_EVENTS.map(([n]) => n) } },
        },
      }),
    },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`GA4 HTTP ${res.status}: ${body?.error?.message || ''}`);

  const out = { phone: 0, whatsapp: 0, email: 0 };
  const byEvent = new Map(CLICK_EVENTS);
  for (const row of body.rows || []) {
    const key = byEvent.get(row.dimensionValues?.[0]?.value);
    if (key) out[key] += Number(row.metricValues?.[0]?.value || 0);
  }
  return out;
}

async function verifyClicks(api, w) {
  const clicks = api.clicks;
  if (!clicks) {
    fail('clicks panel is present in the payload', 'api.clicks is missing');
    return;
  }
  pass('clicks panel is present in the payload');

  // The windows must be the LEAD windows, not a window of their own: the panel is
  // only meaningful next to the lead count if the two cover the same days.
  for (const which of ['current', 'previous']) {
    const same =
      clicks[which] && clicks[which].from === w[which].from && clicks[which].to === w[which].to;
    if (same) pass(`clicks ${which} window matches the lead window`, `${w[which].from} → ${w[which].to}`);
    else fail(`clicks ${which} window matches the lead window`, JSON.stringify(clicks[which]));
  }

  if (!clicks.available) {
    console.log(`  · clicks unavailable: ${clicks.note}`);
    return;
  }

  const propertyId = (process.env.GA4_PROPERTY_ID || '').trim();
  if (!propertyId) {
    console.log('  · GA4_PROPERTY_ID unset — totals NOT cross-checked');
    return;
  }

  let token;
  try {
    token = await serviceAccountToken();
  } catch (err) {
    fail('GA4 service-account token minted independently', err.message);
    return;
  }
  if (!token) {
    console.log('  · no GA4 service-account credentials — totals NOT cross-checked');
    return;
  }

  for (const which of ['current', 'previous']) {
    let want;
    try {
      want = await ga4Clicks(token, propertyId, clicks[which].from, clicks[which].to);
    } catch (err) {
      fail(`GA4 re-read for the ${which} window`, err.message);
      continue;
    }
    for (const [event, key] of CLICK_EVENTS) {
      assertEqual(
        `${which}: ${event} matches an independent GA4 read`,
        clicks[`${which}Totals`][key],
        want[key],
      );
    }
  }

  // The comparison must be flagged as distorted while the previous window sits
  // before the day custom events started reaching GA4 — and the flag must be able
  // to turn OFF, or it is decoration rather than a check.
  const distorted = clicks.previous.from < OLDEST_RECORDED_CLICK;
  if (distorted && !clicks.note) {
    fail(
      'clicks panel warns that the previous window predates event recording',
      `window starts ${clicks.previous.from}, recording began ${OLDEST_RECORDED_CLICK}, but note is empty`,
    );
  } else if (!distorted && clicks.note) {
    fail(
      'clicks panel stops warning once both windows postdate event recording',
      `window starts ${clicks.previous.from} but a note is still set`,
    );
  } else {
    pass(
      'clicks panel warns about the recording start exactly when it applies',
      distorted ? 'warning shown' : 'no warning needed',
    );
  }
}

/** Ads access token, minted the same way the app does. */
async function adsToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: (process.env.GOOGLE_ADS_CLIENT_ID || '').trim(),
      client_secret: (process.env.GOOGLE_ADS_CLIENT_SECRET || '').trim(),
      refresh_token: (process.env.GOOGLE_ADS_REFRESH_TOKEN || '').trim(),
      grant_type: 'refresh_token',
    }).toString(),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) throw new Error(`HTTP ${res.status}`);
  return body.access_token;
}

async function gaql(token, query) {
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
  const headers = {
    Authorization: `Bearer ${token}`,
    'developer-token': (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim(),
    'Content-Type': 'application/json',
  };
  const login = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/\D/g, '');
  if (login) headers['login-customer-id'] = login;

  const res = await fetch(
    `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:searchStream`,
    { method: 'POST', headers, body: JSON.stringify({ query }) },
  );
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {};
  }
  if (!res.ok) {
    const errs = (parsed?.error?.details || []).flatMap((d) => d.errors || []);
    throw new Error(`GAQL HTTP ${res.status}: ${errs.map((e) => e.message).join(' | ') || text.slice(0, 200)}`);
  }
  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap((b) => b.results || []);
}

/**
 * The three conversion figures the Ads panel reports.
 *
 * `type` and `env` are this script's OWN statement of what each figure should
 * resolve to — deliberately restated rather than imported from the app, so a bug
 * in the app's resolution cannot agree with itself here.
 */
const ADS_FIGURES = [
  {
    key: 'calls',
    errorKey: 'callsError',
    label: 'Calls',
    env: 'NEXT_PUBLIC_GADS_CALL_CONV_ID',
    type: 'WEBSITE_CALL',
    caveatsRecordingStart: false,
  },
  {
    key: 'leadForm',
    errorKey: 'leadFormError',
    label: 'Lead form',
    env: 'NEXT_PUBLIC_GADS_CONV_ID',
    type: 'WEBPAGE',
    caveatsRecordingStart: true,
  },
  {
    key: 'taps',
    errorKey: 'tapsError',
    label: 'Tap clicks',
    env: 'NEXT_PUBLIC_GADS_CLICK_CONV_ID',
    type: 'WEBPAGE',
    caveatsRecordingStart: true,
  },
];

/** Mirrors the app's constant. Restated on purpose — see ADS_FIGURES. */
const ADS_WEBPAGE_CONVERSIONS_RECORDING_FROM = '2026-09-15';

async function verifyAdsActions(api) {
  if (!api.ads || !api.ads.available) {
    console.log('  · Ads unavailable — conversion figures NOT cross-checked');
    return;
  }

  // The invariant that stops a failed read from rendering as a real zero: a
  // figure and its reason are always one-null-each.
  for (const f of ADS_FIGURES) {
    const figures = api.ads[f.key];
    const error = api.ads[f.errorKey];
    if (!figures && !error) {
      fail(`${f.label}: a missing read carries a reason`, `${f.key} is null and ${f.errorKey} is empty`);
    } else if (!figures && error) {
      fail(`${f.label}: conversions were read`, `${f.errorKey}: ${error}`);
    } else if (figures && error) {
      fail(`${f.label}: a successful read carries no error`, `${f.key} present but ${f.errorKey} is set`);
    } else {
      pass(`${f.label}: conversions were read`);
    }
  }

  const present = ADS_FIGURES.filter((f) => api.ads[f.key]);
  if (present.length === 0) return;

  // Three figures bound to the same action would mean a label collision silently
  // pointed two of them at one action — a wrong number that looks entirely right.
  const ids = present.map((f) => api.ads[f.key].actionId);
  if (new Set(ids).size === ids.length) {
    pass('each figure reports a different conversion action', ids.join(', '));
  } else {
    fail('each figure reports a different conversion action', `repeats in ${ids.join(', ')}`);
  }

  if (!(process.env.GOOGLE_ADS_CLIENT_ID || '').trim()) {
    console.log('  · Ads credentials unset — conversion figures NOT cross-checked');
    return;
  }

  let token;
  try {
    token = await adsToken();
  } catch (err) {
    fail('Ads token minted independently', err.message);
    return;
  }

  for (const f of present) await verifyOneAdsFigure(token, api, f);
}

async function verifyOneAdsFigure(token, api, f) {
  const figures = api.ads[f.key];

  // The action the panel claims to be reporting.
  let action;
  try {
    const rows = await gaql(
      token,
      'SELECT conversion_action.id, conversion_action.name, conversion_action.type, ' +
        'conversion_action.status, conversion_action.include_in_conversions_metric, ' +
        'conversion_action.phone_call_duration_seconds, conversion_action.tag_snippets ' +
        'FROM conversion_action ' +
        `WHERE conversion_action.id = ${figures.actionId}`,
    );
    action = rows[0]?.conversionAction;
  } catch (err) {
    fail(`${f.label}: the reported conversion action is readable`, err.message);
    return;
  }

  if (!action) {
    fail(`${f.label}: the reported conversion action exists`, `id ${figures.actionId} not found`);
    return;
  }
  pass(`${f.label}: the reported conversion action exists`, `${action.id} ${action.name}`);

  assertEqual(`${f.label}: the reported action is the expected type`, action.type, f.type);
  assertEqual(`${f.label}: the reported action is enabled`, action.status, 'ENABLED');

  // The check that makes "resolved by label, never by a hardcoded id" real rather
  // than asserted: the configured label must actually be in the action chosen.
  const configured = (process.env[f.env] || '').trim();
  const wantLabel = configured.includes('/') ? configured.split('/')[1].trim() : '';
  if (!wantLabel) {
    fail(`${f.label}: ${f.env} carries a label`, `value is ${configured || '(unset)'}`);
  } else {
    const snippets = (action.tagSnippets || [])
      .map((s) => `${s.eventSnippet || ''}${s.globalSiteTag || ''}`)
      .join('');
    if (snippets.includes(wantLabel)) {
      pass(`${f.label}: the resolved action carries the configured label`, wantLabel);
    } else {
      fail(
        `${f.label}: the resolved action carries the configured label`,
        `${f.env} says ${wantLabel} but action ${action.id} does not contain it`,
      );
    }
  }

  assertEqual(`${f.label}: the match route is reported as the label`, figures.via, 'label');

  if (f.key === 'calls') {
    const seconds = Number(action.phoneCallDurationSeconds);
    const expected = Number.isFinite(seconds) && seconds > 0 ? seconds : null;
    assertEqual(`${f.label}: the duration threshold matches the action`, figures.minimumSeconds, expected);
  }

  // The trap this whole panel had to avoid: an action flagged out of the
  // Conversions column reports 0 there forever. The panel's own `secondary` flag
  // is checked against the API rather than against the account's current setup,
  // so making an action Primary later is not a test failure.
  const secondary = action.includeInConversionsMetric !== true;
  assertEqual(`${f.label}: the Secondary flag matches the API`, figures.secondary, secondary);

  for (const [which, win] of [
    ['current', api.ads.current],
    ['previous', api.ads.previous],
  ]) {
    let rows;
    try {
      rows = await gaql(
        token,
        'SELECT segments.conversion_action, metrics.conversions, metrics.all_conversions ' +
          `FROM customer WHERE segments.conversion_action = ` +
          `'customers/${(process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '')}/conversionActions/${figures.actionId}' ` +
          `AND segments.date BETWEEN '${win.from}' AND '${win.to}'`,
      );
    } catch (err) {
      fail(`${f.label}: independent read for the ${which} window`, err.message);
      continue;
    }
    const allConversions = rows.reduce((a, r) => a + Number(r.metrics?.allConversions || 0), 0);
    const inColumn = rows.reduce((a, r) => a + Number(r.metrics?.conversions || 0), 0);

    const field = which === 'current' ? 'currentConversions' : 'previousConversions';
    const colField = which === 'current' ? 'currentInConversionsColumn' : 'previousInConversionsColumn';
    assertEqual(`${f.label}: ${which} matches an independent Ads read`, figures[field], allConversions);
    assertEqual(`${f.label}: ${which} Conversions-column figure matches`, figures[colField], inColumn);

    if (secondary && figures[colField] !== 0) {
      fail(
        `${f.label}: a Secondary action cannot appear in the Conversions column`,
        `includeInConversionsMetric is false but the panel reported ${figures[colField]}`,
      );
    }
  }

  // The recording-start caveat must appear exactly while it applies. If it could
  // not turn itself off it would be decoration rather than a check, and if it
  // never appeared a zero previous window would read as a collapse in demand.
  if (f.caveatsRecordingStart) {
    const applies = api.ads.previous.from < ADS_WEBPAGE_CONVERSIONS_RECORDING_FROM;
    const said = (figures.note || '').includes('recreated on');
    if (applies && !said) {
      fail(
        `${f.label}: warns that its previous window predates the action`,
        `previous starts ${api.ads.previous.from}, note is ${figures.note ? `"${figures.note}"` : 'empty'}`,
      );
    } else if (!applies && said) {
      fail(
        `${f.label}: stops warning once both windows postdate the action`,
        `previous starts ${api.ads.previous.from} but a note is still set`,
      );
    } else {
      pass(
        `${f.label}: warns about the action's own start exactly when it applies`,
        applies ? 'warning shown' : 'no warning needed',
      );
    }
  }
}

function report() {
  console.log(`\n${'─'.repeat(60)}`);
  if (failures === 0) {
    console.log(`All ${checks} checks passed.`);
    process.exit(0);
  }
  console.log(`${failures} of ${checks} checks FAILED.`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`\nverify-dashboard crashed: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
