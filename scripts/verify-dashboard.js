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
 *      the point: two copies of the same bug would agree.
 *   3. THE PWA. A manifest with a wrong `sizes`, a missing icon, or a service
 *      worker outside its scope all still return 200. They just fail to install,
 *      on a phone, later, where nobody is watching. So the manifest's fields and
 *      every icon it names are fetched and asserted.
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

function windows(now = new Date()) {
  const currentFrom = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-01`;
  const currentTo = iso(now);
  const [cy, cm] = currentFrom.split('-').map(Number);
  const prevFrom = iso(new Date(Date.UTC(cy, cm - 2, 1)));
  const prevEnd = iso(new Date(Date.UTC(cy, cm - 1, 0)));
  const wantTo = addDays(prevFrom, now.getUTCDate() - 1);
  return {
    current: { from: currentFrom, to: currentTo },
    previous: { from: prevFrom, to: wantTo > prevEnd ? prevEnd : wantTo },
    previousFull: { from: prevFrom, to: prevEnd },
  };
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
  section('2. Numbers — cross-checked against the raw table');

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
    ['this month', w.current, api.current],
    ['same span last month', w.previous, api.previous],
    ['all of last month', w.previousFull, api.previousFull],
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

  // The breakdown must sum to the headline, or the two disagree on screen.
  const sourceSum = (api.current.bySource || []).reduce((a, s) => a + s.count, 0);
  assertEqual('source breakdown sums to the headline', sourceSum, api.current.crmOk);

  // Windows must be the declared, non-overlapping shape.
  assertEqual('current window starts on the 1st', api.current.from.endsWith('-01'), true);
  if (api.previous.to >= api.current.from) {
    fail('previous window does not overlap the current one', `${api.previous.to} >= ${api.current.from}`);
  } else {
    pass('previous window does not overlap the current one', `${api.previous.from} → ${api.previous.to}`);
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

  report();
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
