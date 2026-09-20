import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { GBP_LOCATION_ID } from '@/lib/contact';
import { selectMetrics, toIsoDate } from '@/lib/gbp-performance';

/**
 * lib/dashboard-data.ts
 *
 * Every number the private dashboard shows, assembled server-side.
 *
 * ── Why this is server-only ───────────────────────────────────────────────────
 *
 * `gbp_daily_metrics` and `gbp_sync_state` have RLS enabled with NO policies, so
 * only the service-role key can read them (see the gbp performance migration).
 * The anon key that ships to the browser cannot see them at all. So the
 * aggregation cannot happen in the client even if we wanted it to, and this
 * module must never be imported from a component that runs in the browser — the
 * service-role key would be bundled and published. Only
 * `app/api/dashboard/[slug]/route.ts` imports it, and that route is the only
 * thing that may serve the result.
 *
 * ── The two counting traps this module exists to avoid ───────────────────────
 *
 * 1. CHANNEL ROWS ARE NOT LEADS. One accepted submission writes a `ghl` row, a
 *    `ghl-note` row, an `email` row and an `sms` row — four rows, one customer.
 *    `getLeadPipelineHealth()` sums `ghl` + `email` successes, which is correct
 *    for its question ("did anything work?") and wrong for this one: it would
 *    report every lead twice. Here a lead is counted from the `ghl` channel
 *    ALONE, because exactly one `ghl` row is written per accepted submission
 *    (app/api/send-quote/route.ts writes it unconditionally after the filter
 *    branches, with `ok` reflecting whether the CRM upsert succeeded). So
 *    `ghl ok + ghl failed` is the count of submissions that passed the spam and
 *    validation filters, and `ghl failed` is visible rather than silently
 *    deflating the headline.
 *
 *    Rows carry no lead id, so a lead cannot be reconstructed by grouping. That
 *    is why this counts one channel rather than joining four.
 *
 * 2. A PARTIAL MONTH ALWAYS LOOKS LIKE A COLLAPSE. Comparing the 20 days of a
 *    month-in-progress against a full 30-day month guarantees a ~33% "decline"
 *    on the 1st of every month and a fake recovery by the 30th. So the headline
 *    compares MONTH-TO-DATE against the SAME NUMBER OF DAYS of the previous
 *    month (like-for-like), and the full previous month is reported separately
 *    for context. The date ranges are returned to the UI so the comparison on
 *    screen is always auditable rather than implied.
 *
 * The same two rules apply to Google Ads below, and a third applies to GBP.
 *
 * Must NOT import `next/server` — this is usable from CLI scripts too, which is
 * how the numbers get verified. All env reads are lazy.
 */

const EVENT_TABLE = 'lead_pipeline_events';

/** Rows pulled into the feed. Small on purpose: this is a glance, not a report. */
const FEED_LIMIT = 30;

/**
 * PostgREST caps a response at `db-max-rows` (1000 by default) and truncates
 * silently — fewer rows read as a smaller total, i.e. as a real decline. The
 * event-log reads page for that reason, exactly as `selectMetrics` does for GBP.
 */
const PAGE = 1000;

/**
 * GBP settling lag, in days, subtracted from the last covered day.
 *
 * `gbp_sync_state.covered_to` is the newest day a pull REQUESTED, not a day
 * Google has finished publishing. The migration is explicit that consumers must
 * subtract a settling lag before comparing: stabilisation is 48-72h, and
 * direction requests have been observed still moving at ~10 days. Comparing the
 * raw tail means comparing days that are still filling in against days that are
 * settled, which renders as a decline that did not happen.
 *
 * Five, matching `scripts/report-gbp-performance.js` — the established, verified
 * reader of this table. It is deliberately a shared convention rather than a
 * number chosen here: two readers of the same series disagreeing about which
 * days are settled would report different totals for the same month, and the
 * dashboard would be the one nobody had cross-checked.
 *
 * The window end is RETURNED to the UI and displayed, so the figure on screen is
 * never separated from the range it covers.
 */
const GBP_SETTLE_LAG_DAYS = 5;

/** Length of each GBP comparison window, in settled days. */
const GBP_WINDOW_DAYS = 30;

/** Network timeouts; a hung OAuth exchange must not hold a route open. */
const TOKEN_TIMEOUT_MS = 15_000;
const ADS_TIMEOUT_MS = 30_000;

/** Matches scripts/audit-ads-performance.ts, which is proven against the live API. */
const ADS_API_VERSION = 'v22';
const ADS_HOST = 'https://googleads.googleapis.com';

// ── Date helpers ─────────────────────────────────────────────────────────────
// UTC throughout, matching lib/gbp-performance.ts. The site serves
// Europe/London, which is UTC+1 for most of the year: local-time arithmetic
// would shift every window by a day at the boundary.

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `YYYY-MM-DD` for the first day of `d`'s UTC month. */
function monthStart(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-01`;
}

/** Day-of-month in UTC. */
function dayOfMonth(d: Date): number {
  return d.getUTCDate();
}

/** Add days to a `YYYY-MM-DD` string. */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toIsoDate(dt);
}

/** The last day of the month containing `iso`. */
function monthEnd(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  // Day 0 of the next month is the last day of this one.
  return toIsoDate(new Date(Date.UTC(y, m - 1 + 1, 0)));
}

/** The first day of the month before the one containing `iso`. */
function previousMonthStart(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return toIsoDate(new Date(Date.UTC(y, m - 1 - 1, 1)));
}

export interface ComparisonWindow {
  from: string;
  to: string;
}

export interface LeadWindows {
  /** Month-to-date: 1st of this month through today. */
  current: ComparisonWindow;
  /** The SAME day-span of last month, so the comparison is like-for-like. */
  previous: ComparisonWindow;
  /** All of last month, for context — never used for the percentage. */
  previousFull: ComparisonWindow;
}

/**
 * Build the three windows described in trap 2 above.
 *
 * `previous.to` is clamped to the end of the previous month so the 31st of a
 * month does not produce a "previous month" window running into the current one.
 */
export function leadWindows(now = new Date()): LeadWindows {
  const currentFrom = monthStart(now);
  const currentTo = toIsoDate(now);
  const prevFrom = previousMonthStart(currentTo);
  const prevEnd = monthEnd(prevFrom);
  const wantTo = addDays(prevFrom, dayOfMonth(now) - 1);
  return {
    current: { from: currentFrom, to: currentTo },
    previous: { from: prevFrom, to: wantTo > prevEnd ? prevEnd : wantTo },
    previousFull: { from: prevFrom, to: prevEnd },
  };
}

// ── Store ────────────────────────────────────────────────────────────────────

let cachedStore: SupabaseClient | null | undefined;
let storeWarned = false;

/**
 * Service-role Supabase client, or null when unconfigured.
 *
 * Requires the service-role key specifically. The anon key is deliberately not
 * accepted as a fallback: it can read `lead_pipeline_events` but NOT the GBP
 * tables, so falling back would produce a dashboard that looks half-working —
 * leads present, GBP silently all zeros — which reads as "nobody called us"
 * rather than "this is misconfigured". Null is the honest answer.
 */
export function getDashboardStore(): SupabaseClient | null {
  if (cachedStore !== undefined) return cachedStore;

  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !key) {
    cachedStore = null;
    if (!storeWarned) {
      storeWarned = true;
      console.warn(
        '[dashboard] no service-role Supabase credentials — the private dashboard will ' +
          'report every figure as unavailable. Set SUPABASE_URL (or ' +
          'NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY. The anon key is not ' +
          'used: it cannot read the gbp_* tables at all, so it would render GBP as a ' +
          'confident zero.',
      );
    }
    return cachedStore;
  }

  cachedStore = createClient(url, key, { auth: { persistSession: false } });
  return cachedStore;
}

/** Test seam. */
export function resetDashboardStore(): void {
  cachedStore = undefined;
}

// ── Lead pipeline ────────────────────────────────────────────────────────────

interface EventRow {
  id: number | string;
  created_at: string;
  source: string;
  channel: string;
  ok: boolean;
  detail: string | null;
}

/** Page through `lead_pipeline_events` for a window. See the PAGE note above. */
async function readEvents(
  store: SupabaseClient,
  fromIso: string,
  toIso: string,
): Promise<EventRow[]> {
  const out: EventRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await store
      .from(EVENT_TABLE)
      .select('id, created_at, source, channel, ok, detail')
      .gte('created_at', `${fromIso}T00:00:00.000Z`)
      .lte('created_at', `${toIso}T23:59:59.999Z`)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data || []) as EventRow[];
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

export interface SourceCount {
  source: string;
  count: number;
}

export interface LeadPeriod {
  from: string;
  to: string;
  /** Submissions that passed the spam/validation filters. See trap 1. */
  accepted: number;
  /** Of those, how many reached the CRM. */
  crmOk: number;
  /** Of those, how many reached the inbox. */
  emailOk: number;
  /** Accepted submissions whose CRM upsert failed. */
  crmFailed: number;
  /** Rejected before any sink — the silent-drop channel. */
  filtered: number;
  bySource: SourceCount[];
}

/**
 * Aggregate one window from raw event rows.
 *
 * `accepted` is derived from the `ghl` channel alone — see trap 1 in the module
 * header. `bySource` is built from the same rows so the breakdown always sums to
 * the headline; building it from a second query would let the two drift.
 *
 * ROWS MUST BE FILTERED TO THE WINDOW HERE. The caller fetches one span covering
 * all three periods (previousFull → current) to save two queries, so every row
 * passed in belongs to at least one period — but not to this one. Without the
 * bounds check below every period reports the same total, which looks entirely
 * plausible on screen and was caught only by cross-checking against a
 * server-side count of the raw table.
 *
 * The comparison is on parsed timestamps rather than string prefixes: PostgREST
 * returns `created_at` with an offset, and slicing characters out of that would
 * silently misjudge any row not written in UTC.
 */
function summarisePeriod(
  rows: EventRow[],
  window: ComparisonWindow,
): LeadPeriod {
  const windowStart = Date.parse(`${window.from}T00:00:00.000Z`);
  const windowEnd = Date.parse(`${window.to}T23:59:59.999Z`);

  let accepted = 0;
  let crmOk = 0;
  let crmFailed = 0;
  let emailOk = 0;
  let filtered = 0;
  const sourceTally = new Map<string, number>();

  for (const row of rows) {
    const at = Date.parse(row.created_at);
    if (!(at >= windowStart && at <= windowEnd)) continue;

    if (row.channel === 'ghl') {
      accepted += 1;
      if (row.ok) {
        crmOk += 1;
        sourceTally.set(row.source, (sourceTally.get(row.source) || 0) + 1);
      } else {
        crmFailed += 1;
      }
    } else if (row.channel === 'email') {
      if (row.ok) emailOk += 1;
    } else if (row.channel === 'filter') {
      filtered += 1;
    }
  }

  const bySource: SourceCount[] = [];
  sourceTally.forEach((count, source) => bySource.push({ source, count }));
  bySource.sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));

  return {
    from: window.from,
    to: window.to,
    accepted,
    crmOk,
    emailOk,
    crmFailed,
    filtered,
    bySource,
  };
}

export interface FeedEvent {
  id: string;
  createdAt: string;
  source: string;
  channel: string;
  ok: boolean;
  detail: string | null;
}

// ── GBP performance ──────────────────────────────────────────────────────────

export interface GbpActionTotals {
  callClicks: number;
  directionRequests: number;
  websiteClicks: number;
}

export interface GbpPanel {
  available: boolean;
  /** Set when `available` is false, or when the pull has stalled. */
  note: string | null;
  /** Newest day the last successful pull COVERED — not the newest with activity. */
  coveredTo: string | null;
  lastOkAt: string | null;
  /** The most recent failed pull's reason, if any. */
  lastError: string | null;
  current: ComparisonWindow;
  previous: ComparisonWindow;
  currentTotals: GbpActionTotals;
  previousTotals: GbpActionTotals;
}

async function readGbpPanel(store: SupabaseClient, now: Date): Promise<GbpPanel> {
  const empty: GbpActionTotals = { callClicks: 0, directionRequests: 0, websiteClicks: 0 };
  const windowEnd = toIsoDate(now);

  const base: GbpPanel = {
    available: false,
    note: null,
    coveredTo: null,
    lastOkAt: null,
    lastError: null,
    current: { from: windowEnd, to: windowEnd },
    previous: { from: windowEnd, to: windowEnd },
    currentTotals: empty,
    previousTotals: { ...empty },
  };

  const { data, error } = await store
    .from('gbp_sync_state')
    .select('covered_to, last_ok_at, last_error')
    .eq('location_id', GBP_LOCATION_ID)
    .maybeSingle();

  if (error) {
    return { ...base, note: `Could not read gbp_sync_state: ${error.message}` };
  }
  if (!data || !data.covered_to) {
    return {
      ...base,
      note:
        'No GBP pull has completed yet, so there is nothing to compare. Run the ' +
        'gbp-sync job (POST /api/gbp/sync) to backfill it.',
    };
  }

  const coveredTo = String(data.covered_to);
  // Anchor to the last covered day minus the settling lag, then step back one
  // window. Never `now` — see GBP_SETTLE_LAG_DAYS.
  const currentTo = addDays(coveredTo, -GBP_SETTLE_LAG_DAYS);
  const currentFrom = addDays(currentTo, -(GBP_WINDOW_DAYS - 1));
  const previousTo = addDays(currentFrom, -1);
  const previousFrom = addDays(previousTo, -(GBP_WINDOW_DAYS - 1));

  const windows = {
    current: { from: currentFrom, to: currentTo },
    previous: { from: previousFrom, to: previousTo },
  };

  let rows;
  try {
    // The established read path for this table, already cross-checked against an
    // independent audit. It does not filter by location_id — correct today, as
    // there is exactly one listing (GBP_LOCATION_ID). If a second location is
    // ever added, this must gain an explicit filter or the totals will silently
    // sum two businesses.
    rows = await selectMetrics(store, previousFrom, currentTo);
  } catch (err) {
    return {
      ...base,
      ...windows,
      coveredTo,
      lastOkAt: data.last_ok_at ? String(data.last_ok_at) : null,
      note: `Could not read gbp_daily_metrics: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const totalsFor = (from: string, to: string): GbpActionTotals => {
    const out: GbpActionTotals = { callClicks: 0, directionRequests: 0, websiteClicks: 0 };
    for (const r of rows) {
      if (r.metric_date < from || r.metric_date > to) continue;
      if (r.metric === 'CALL_CLICKS') out.callClicks += r.value;
      else if (r.metric === 'BUSINESS_DIRECTION_REQUESTS') out.directionRequests += r.value;
      else if (r.metric === 'WEBSITE_CLICKS') out.websiteClicks += r.value;
    }
    return out;
  };

  const lastError = data.last_error ? String(data.last_error) : null;
  // A stalled pull is the failure this panel is most likely to hide: the stored
  // numbers stay plausible-looking forever while the sync quietly stops. Say so
  // rather than presenting a settled-looking figure.
  const staleNote = lastError
    ? `The most recent GBP pull FAILED — these figures are from ${coveredTo} and may be ` +
      `incomplete. Reason: ${lastError}`
    : null;

  return {
    available: true,
    note: staleNote,
    coveredTo,
    lastOkAt: data.last_ok_at ? String(data.last_ok_at) : null,
    lastError,
    ...windows,
    currentTotals: totalsFor(windows.current.from, windows.current.to),
    previousTotals: totalsFor(windows.previous.from, windows.previous.to),
  };
}

// ── Google Ads ───────────────────────────────────────────────────────────────

export interface AdsTotals {
  costMicros: number;
  clicks: number;
  impressions: number;
}

export interface AdsPanel {
  available: boolean;
  note: string | null;
  current: ComparisonWindow;
  previous: ComparisonWindow;
  currentTotals: AdsTotals;
  previousTotals: AdsTotals;
}

const ZERO_ADS: AdsTotals = { costMicros: 0, clicks: 0, impressions: 0 };

/** Which Ads env vars are missing, named individually. */
function missingAdsVars(): string[] {
  return [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
  ].filter((name) => !(process.env[name] || '').trim());
}

/**
 * Mint a Google Ads access token from the long-lived refresh token.
 *
 * Plain `fetch`, deliberately. `googleapis` is a devDependency in this project
 * and `google-ads-api` is not installed at all — importing either from a
 * production route means a deploy that omits devDependencies breaks at runtime,
 * and pulls a large client into a cold start for one HTTP POST. Same reasoning
 * as lib/gbp-performance.ts.
 */
async function mintAdsToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: (process.env.GOOGLE_ADS_CLIENT_ID || '').trim(),
    client_secret: (process.env.GOOGLE_ADS_CLIENT_SECRET || '').trim(),
    refresh_token: (process.env.GOOGLE_ADS_REFRESH_TOKEN || '').trim(),
    grant_type: 'refresh_token',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  let parsed: { access_token?: string; error?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {};
  }

  if (!res.ok || !parsed.access_token) {
    throw new Error(
      `Google Ads token exchange failed (HTTP ${res.status}${parsed.error ? `, ${parsed.error}` : ''}).`,
    );
  }
  return parsed.access_token;
}

/**
 * Run a GAQL query via REST searchStream, returning the flattened result rows.
 *
 * Error text is Google's own, trimmed — it names the offending field, which is
 * the only thing that makes a rejected query fixable.
 */
async function adsGaql(token: string, query: string): Promise<any[]> {
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'developer-token': (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim(),
    'Content-Type': 'application/json',
  };
  // Present only for a manager (MCC) account, where requests must name both.
  const login = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/\D/g, '');
  if (login) headers['login-customer-id'] = login;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ADS_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(
      `${ADS_HOST}/${ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
        signal: controller.signal,
        cache: 'no-store',
      },
    );
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 300) };
  }

  if (!res.ok) {
    const errs =
      (parsed?.details ? parsed.details.flatMap((d: any) => d.errors || []) : null) ||
      (parsed?.error?.details ? parsed.error.details.flatMap((d: any) => d.errors || []) : []);
    const detail = errs.length
      ? errs.map((e: any) => e.message).join(' | ')
      : JSON.stringify(parsed).slice(0, 300);
    throw new Error(`GAQL HTTP ${res.status}: ${detail}`);
  }

  const batches = Array.isArray(parsed) ? parsed : [parsed];
  return batches.flatMap((b: any) => b.results || []);
}

async function readAdsPanel(now: Date): Promise<AdsPanel> {
  const windows = leadWindows(now);
  const base: AdsPanel = {
    available: false,
    note: null,
    current: windows.current,
    previous: windows.previous,
    currentTotals: { ...ZERO_ADS },
    previousTotals: { ...ZERO_ADS },
  };

  const missing = missingAdsVars();
  if (missing.length > 0) {
    return { ...base, note: `Google Ads is not configured — missing ${missing.join(', ')}.` };
  }

  // Spend, clicks and impressions only. `metrics.conversions` is deliberately
  // NOT queried: the conversion actions on this account were removed and
  // recreated on 2026-09-15, and the browser-side ones recorded zero conversions
  // across ~£954 of spend. Surfacing that column here would put a number on
  // screen that is known not to mean what it says. Spend is unaffected and is
  // what "for context" actually needs.
  const totalsFor = async (token: string, from: string, to: string): Promise<AdsTotals> => {
    const rows = await adsGaql(
      token,
      'SELECT metrics.cost_micros, metrics.clicks, metrics.impressions ' +
        `FROM customer WHERE segments.date BETWEEN '${from}' AND '${to}'`,
    );
    const out: AdsTotals = { ...ZERO_ADS };
    for (const row of rows) {
      const m = row.metrics || {};
      out.costMicros += Number(m.costMicros || 0);
      out.clicks += Number(m.clicks || 0);
      out.impressions += Number(m.impressions || 0);
    }
    return out;
  };

  try {
    // Minted once and reused for both windows — two exchanges for one page view
    // is a needless round trip, and a credential problem should surface as one
    // error rather than two.
    const token = await mintAdsToken();
    return {
      ...base,
      available: true,
      currentTotals: await totalsFor(token, windows.current.from, windows.current.to),
      previousTotals: await totalsFor(token, windows.previous.from, windows.previous.to),
    };
  } catch (err) {
    console.error(`[dashboard] Google Ads read failed: ${err instanceof Error ? err.message : String(err)}`);
    return {
      ...base,
      note: `Could not read Google Ads: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Assembly ─────────────────────────────────────────────────────────────────

export interface DashboardData {
  generatedAt: string;
  windows: LeadWindows;
  current: LeadPeriod;
  previous: LeadPeriod;
  previousFull: LeadPeriod;
  feed: FeedEvent[];
  gbp: GbpPanel;
  ads: AdsPanel;
  /** Set when the durable store is missing — every figure below is then absent. */
  storeNote: string | null;
}

/**
 * Assemble everything the dashboard renders.
 *
 * Reads are sequential rather than `Promise.all` on purpose: two of the three
 * fan out to Google, and firing an Ads GAQL query concurrently with a GBP read
 * for a page one person refreshes buys nothing while making a cold start's
 * failure mode harder to read in the logs.
 */
export async function getDashboardData(now = new Date()): Promise<DashboardData> {
  const generatedAt = new Date().toISOString();
  const windows = leadWindows(now);
  const emptyPeriod = (w: ComparisonWindow): LeadPeriod => ({
    from: w.from,
    to: w.to,
    accepted: 0,
    crmOk: 0,
    emailOk: 0,
    crmFailed: 0,
    filtered: 0,
    bySource: [],
  });

  const store = getDashboardStore();
  if (!store) {
    return {
      generatedAt,
      windows,
      current: emptyPeriod(windows.current),
      previous: emptyPeriod(windows.previous),
      previousFull: emptyPeriod(windows.previousFull),
      feed: [],
      gbp: {
        available: false,
        note: 'No service-role Supabase credentials — nothing can be read.',
        coveredTo: null,
        lastOkAt: null,
        lastError: null,
        current: windows.current,
        previous: windows.previous,
        currentTotals: { callClicks: 0, directionRequests: 0, websiteClicks: 0 },
        previousTotals: { callClicks: 0, directionRequests: 0, websiteClicks: 0 },
      },
      ads: {
        available: false,
        note: null,
        current: windows.current,
        previous: windows.previous,
        currentTotals: { ...ZERO_ADS },
        previousTotals: { ...ZERO_ADS },
      },
      storeNote:
        'No service-role Supabase credentials are configured, so no figures can be read. ' +
        'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy — a Vercel env var ' +
        'has no effect until the deployment is rebuilt.',
    };
  }

  // One fetch covers all three lead windows: previousFull starts the same day as
  // previous, so [previousFull.from, current.to] spans every row needed.
  let rows: EventRow[] = [];
  let leadReadError: string | null = null;
  try {
    rows = await readEvents(store, windows.previousFull.from, windows.current.to);
  } catch (err) {
    leadReadError = err instanceof Error ? err.message : String(err);
    console.error(`[dashboard] lead event read failed: ${leadReadError}`);
  }

  let feed: FeedEvent[] = [];
  try {
    const { data, error } = await store
      .from(EVENT_TABLE)
      .select('id, created_at, source, channel, ok, detail')
      .neq('channel', 'gbp') // a GBP pull outcome is not a lead event
      .neq('channel', 'ghl-note') // one per lead; it would crowd out the leads
      .order('created_at', { ascending: false })
      .limit(FEED_LIMIT);
    if (error) throw new Error(error.message);
    feed = ((data || []) as EventRow[]).map((r) => ({
      id: String(r.id),
      createdAt: r.created_at,
      source: r.source,
      channel: r.channel,
      ok: r.ok,
      detail: r.detail,
    }));
  } catch (err) {
    console.error(`[dashboard] feed read failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const storeNote = leadReadError
    ? `Could not read ${EVENT_TABLE}: ${leadReadError}. If the table is missing, run the ` +
      'lead_pipeline_events migration.'
    : null;

  return {
    generatedAt,
    windows,
    current: summarisePeriod(rows, windows.current),
    previous: summarisePeriod(rows, windows.previous),
    previousFull: summarisePeriod(rows, windows.previousFull),
    feed,
    gbp: await readGbpPanel(store, now),
    ads: await readAdsPanel(now),
    storeNote,
  };
}
