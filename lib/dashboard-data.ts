import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { GBP_LOCATION_ID } from '@/lib/contact';
import { selectMetrics, toIsoDate, type StoredMetricRow } from '@/lib/gbp-performance';

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
 * 2. A WINDOW THAT CHANGES LENGTH CANNOT BE COMPARED. A calendar month is a
 *    different number of days every day of the month, so comparing the 2 days of
 *    a month-in-progress against a full 30-day month guarantees a collapse on the
 *    day the month rolls over and a fake recovery by the 30th. So every window is
 *    a TRAILING 30 DAYS (`ROLLING_DAYS`), and the three of them are contiguous and
 *    equal in length, so a percentage means the same thing on every day of the
 *    month. The date ranges are returned to the UI so the comparison on screen is
 *    always auditable rather than implied.
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
 * days are settled would report different totals for the same days, and the
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

/**
 * GA4 Data API, read with the Search Console service account.
 *
 * NOT with the Ads refresh token, which would have been the cheaper reuse: the
 * scopes on a refresh token are fixed when consent is granted, `analytics.readonly`
 * was never among them, and re-exchanging it fails with `invalid_scope` (tried).
 * The service account is already a Viewer on the GA4 property, and is the same
 * identity `lib/google-search-console.ts` authenticates with.
 */
const GA4_HOST = 'https://analyticsdata.googleapis.com/v1beta';
const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const GA4_TIMEOUT_MS = 20_000;

/**
 * The day custom events started reaching GA4.
 *
 * `lib/tracking.ts` used to push to `window.dataLayer` and rely on GTM triggers to
 * forward the event to GA4. Those triggers were never built, so phone_click,
 * whatsapp_click and email_click reached the data layer and stopped there. Commit
 * 7d1ee08 (2026-09-15) added a direct gtag forward behind `GA4_DIRECT_EVENTS`, and
 * the first phone_click GA4 has ever recorded is 2026-09-16.
 *
 * Written down rather than derived from the data, deliberately. The earliest date
 * carrying any of the three events is 2026-08-07 — a single whatsapp_click that
 * predates the forward and does not mean the series began then. Deriving the date
 * from the response would produce a caption that is measured and misleading at the
 * same time, which is worse than one that is honest and hand-maintained.
 *
 * Change this if the wiring changes.
 */
const GA4_CLICKS_RECORDING_FROM = '2026-09-15';

/**
 * The date the website conversion actions were last recreated.
 *
 * The lead-form and tap-click actions were removed and recreated on this date and
 * came back with new ids, so conversions recorded before it belong to actions
 * that no longer exist and are not returned for the current ids. The previous
 * comparison window therefore reads zero BY CONSTRUCTION rather than because
 * nothing happened — and "0 vs 0" renders identically to "this never worked".
 *
 * Written down rather than derived, for the same reason as the GA4 date above:
 * the API will happily report a zero without saying why. Corroborated by the
 * data — neither action id returns a row dated before this.
 *
 * Only the two WEBPAGE figures use this. The website-call action's own creation
 * date is less firmly established, and its panel already carries a zero-state
 * explanation of its own, so no claim is made about it.
 *
 * Change this if the wiring changes.
 */
const ADS_WEBPAGE_CONVERSIONS_RECORDING_FROM = '2026-09-15';

// ── Date helpers ─────────────────────────────────────────────────────────────
// UTC throughout, matching lib/gbp-performance.ts. The site serves
// Europe/London, which is UTC+1 for most of the year: local-time arithmetic
// would shift every window by a day at the boundary.

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * `2026-09-15` → `15 Sep 2026`, in UTC.
 *
 * Hand-rolled rather than `Intl`: this module runs on the server, where the
 * locale is whatever the deployment happens to have, and a date in a note that
 * shifts by a day depending on the host is worse than a slightly plain one. The
 * client formats its own dates.
 */
function readableDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const name = MONTH_NAMES[m - 1];
  return name ? `${d} ${name} ${y}` : iso;
}

/** Add days to a `YYYY-MM-DD` string. */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toIsoDate(dt);
}

/**
 * Length of each lead window, in days, counted INCLUSIVELY.
 *
 * Thirty, and a trailing window rather than a calendar month, because a
 * month-to-date window is a different length every day: on the 2nd it compares
 * two days against twenty and renders as a collapse, which is the problem this
 * replaced rather than worked around.
 *
 * The same convention as `GBP_WINDOW_DAYS` above — `addDays(to, -(N - 1))`, so
 * `from` and `to` are both counted. Two trailing windows on one dashboard that
 * disagreed about whether a day is inclusive would be a bug nobody could see.
 */
const ROLLING_DAYS = 30;

export interface ComparisonWindow {
  from: string;
  to: string;
}

export interface LeadWindows {
  /** The trailing 30 days, ending today. */
  current: ComparisonWindow;
  /** The 30 days immediately before `current`, so the comparison is like-for-like. */
  previous: ComparisonWindow;
  /** The 30 days before that, for context — never used for the percentage. */
  previousFull: ComparisonWindow;
}

/**
 * Build the three windows described in trap 2 above.
 *
 * Every window is exactly `ROLLING_DAYS` long and ends the day before the next
 * one starts, so the three are contiguous and the percentage compares two equal
 * spans on every day of the month. The calendar-month version this replaced
 * needed clamping to stop a short month's window running into the current one;
 * fixed offsets from today cannot do that, so there is nothing to clamp.
 */
export function leadWindows(now = new Date()): LeadWindows {
  const currentTo = toIsoDate(now);
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

/**
 * Contact taps folded into the lead count, from the three Google sources that
 * measure them.
 *
 * ── Why these are not pipeline rows ──────────────────────────────────────────
 *
 * `accepted` counts `ghl` rows in `lead_pipeline_events`: a submission that
 * actually reached the CRM. A tap writes nothing there. It is a browser-side
 * event that fires whether or not anything follows it, nothing correlates a tap
 * to a form, and there is no lead id to group by (see trap 1 in the module
 * header). So these are contact signals, not customers — the headline sums them
 * by request, and the card says what is being mixed.
 *
 * ── The Ads figure overlaps the two GA4 figures ──────────────────────────────
 *
 * One tap calls BOTH `trackPhoneClick` / `trackWhatsAppClick` in lib/tracking.ts,
 * which pushes the GA4 event and fires the Ads conversion from the same click. So
 * `adsTaps` is a SUBSET of `callButton + whatsapp`, and summing all four counts
 * every ad-originated tap twice. That is deliberate — all four were asked for as
 * separate lines — and `LeadPeriod.tapsOverlap` carries the fact so the card can
 * mark the row and the verifier can assert it rather than trusting a sentence.
 *
 * ── Every figure here is a lower bound ───────────────────────────────────────
 *
 * `ad_storage` is denied by default, so a visitor who declines cookies and then
 * taps is invisible to Google and to every number below. GBP's figures are
 * additionally revised for about five days after the fact, so the CURRENT
 * window's `gbpCalls` is incomplete and will rise on its own — see
 * `LeadPeriod.note`.
 */
export interface LeadTapSources {
  /** GA4 `phone_click` — taps on a tel: link anywhere on the site. */
  callButton: number;
  /** GA4 `whatsapp_click` — taps on a WhatsApp link or button. */
  whatsapp: number;
  /** GBP `CALL_CLICKS` — taps on the call button in the Google listing. */
  gbpCalls: number;
  /** Ads "Phone/WhatsApp Click (Website)". Already inside the two GA4 figures. */
  adsTaps: number;
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
  /**
   * Form submissions by route. Built from `ghl` rows where `ok` is true, so it
   * sums to `crmOk` — NOT to `accepted`, and not to `total`. Taps are not in
   * here: they are not pipeline rows, and the card renders them as their own
   * block. See `LeadTapSources`.
   */
  bySource: SourceCount[];
  /** Contact taps folded in from GA4, GBP and Ads. */
  taps: LeadTapSources;
  /**
   * Tap sources that could not be read, by display name. Non-empty means `total`
   * is an UNDERCOUNT rather than a measurement — the distinction this file exists
   * to keep.
   */
  tapsMissing: string[];
  /**
   * `accepted` + every tap source. NOT interchangeable with `accepted`, which is
   * CRM deliveries only — the two answer different questions and differ by the
   * whole tap volume.
   */
  total: number;
  /** `taps.adsTaps` is inside `total` and is also inside the GA4 tap figures. */
  tapsOverlap: boolean;
  /** The caveats that apply to `total`, or null when none do. */
  note: string | null;
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
  taps: LeadTapSources,
  tapsMissing: string[],
  note: string | null,
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

  const total =
    accepted + taps.callButton + taps.whatsapp + taps.gbpCalls + taps.adsTaps;

  return {
    from: window.from,
    to: window.to,
    accepted,
    crmOk,
    emailOk,
    crmFailed,
    filtered,
    bySource,
    taps,
    tapsMissing,
    total,
    // Structural, not data-dependent: the Ads action counts taps the two GA4
    // events already counted, so it is always inside the total. Carried as a
    // flag so the card marks the row and the verifier can check it.
    tapsOverlap: taps.adsTaps > 0,
    note,
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

/**
 * One conversion action's figures — shared by all three the panel reports:
 * submitted lead forms, phone/WhatsApp tap clicks, and completed calls.
 *
 * ── Why the count is `all_conversions`, not `conversions` ────────────────────
 *
 * Ads reports two columns. `metrics.conversions` only includes actions flagged
 * `include_in_conversions_metric` — the ones Ads' own "Conversions" column shows
 * and Smart Bidding optimises toward. `metrics.all_conversions` includes every
 * recorded conversion.
 *
 * ALL THREE of this account's website actions are flagged
 * `includeInConversionsMetric: false` — Secondary, read from the API rather than
 * assumed. So `metrics.conversions` for any of them is zero BY CONFIGURATION and
 * would stay zero after a hundred conversions. Reading that column would produce
 * a panel that is confidently, permanently wrong, which is the failure mode this
 * whole file is written against. The honest count of what Google recorded is
 * `all_conversions`, and `inConversionsColumn` below carries the other figure so
 * the difference is visible rather than hidden.
 *
 * ── What these numbers do NOT mean ───────────────────────────────────────────
 *
 * They are Google's count, not the business's. A form conversion is a
 * browser-side event on ad traffic only, and it is gated on `ad_storage`
 * consent, so it is a LOWER BOUND on ad-originated forms and is unrelated to the
 * lead count at the top of this dashboard, which is server-side and counts CRM
 * delivery from every source. Neither is wrong; they answer different questions.
 * The panel shows both rather than implying one is authoritative.
 */
export interface AdsConversionFigures {
  actionId: string;
  actionName: string;
  /** Conversions Google recorded (`all_conversions`) in each window. */
  currentConversions: number;
  previousConversions: number;
  /**
   * Conversions across the third window (the 30 days before `previous`), or null
   * when this figure did not ask for it — see `AdsActionSpec.needsPreviousFull`.
   * Read only for the tap figure, which the lead total sums.
   */
  previousFullConversions: number | null;
  /** How many of those appear in Ads' own Conversions column — zero while Secondary. */
  currentInConversionsColumn: number;
  previousInConversionsColumn: number;
  /** `include_in_conversions_metric`, read from the API rather than assumed. */
  secondary: boolean;
  /** How the action was found. 'type' is the single-candidate fallback, calls only. */
  via: 'label' | 'type';
  /**
   * Set when the figures need explaining: a Secondary action, a fallback match,
   * or a previous window that reads zero by construction rather than by fact.
   */
  note: string | null;
}

/** The website-call figure — the shared shape plus the duration gate. */
export interface AdsCalls extends AdsConversionFigures {
  /** Seconds a call must last to be recorded. Read from the API, not assumed. */
  minimumSeconds: number | null;
}

export interface AdsPanel {
  available: boolean;
  note: string | null;
  current: ComparisonWindow;
  previous: ComparisonWindow;
  currentTotals: AdsTotals;
  previousTotals: AdsTotals;
  /** Completed calls past the action's duration threshold. Resolved by label. */
  calls: AdsCalls | null;
  /**
   * Why `calls` is null. Shown in place of the figure: a missing calls count
   * rendered as 0 would read as "nobody called", which is the opposite of what
   * an unread number means.
   */
  callsError: string | null;
  /** Submitted lead forms, as Google recorded them. Resolved by label. */
  leadForm: AdsConversionFigures | null;
  leadFormError: string | null;
  /** Phone/WhatsApp button taps, as Google recorded them. Resolved by label. */
  taps: AdsConversionFigures | null;
  tapsError: string | null;
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

/**
 * The conversion label inside a configured Ads target, or '' if there is none.
 *
 * Callers pass `AW-17763560213/EypcCP6jnf8cEJXWqZZC`; only the part after the
 * slash identifies the conversion action.
 */
function adsConversionLabel(target: string): string {
  const [, label = ''] = target.trim().split('/');
  return label.trim();
}

/**
 * Which conversion action a figure reports, and how to talk about it.
 *
 * `envName` is the variable holding the `AW-<account>/<label>` value the browser
 * actually fires with, so resolving through it means a repoint in Ads moves the
 * panel with it. See the doc comment on `chooseAdsAction` for why that matters.
 */
interface AdsActionSpec {
  envName: string;
  /** The `conversion_action.type` to search. Interpolated into GAQL from this constant. */
  type: string;
  /** What the figure counts, plural and lower case, for the explanatory notes. */
  noun: string;
  /** Website calls carry a duration gate; nothing else does. */
  selectDuration: boolean;
  /** Whether an unlabelled single candidate may be used. Calls only — see below. */
  allowTypeFallback: boolean;
  /** Whether a zero previous window is an artifact of when the action was created. */
  caveatRecordingStart: boolean;
  /**
   * Whether to also count the third window (the 30 days before `previous`).
   *
   * Only the tap figure needs it, and only because the LEAD TOTAL's "30 days
   * before that" line has to be the same measurement as its other two. Nothing on the
   * Ads panel draws a previousFull figure, so asking for one on the calls and
   * lead-form figures would buy an API call and a failure mode for a number no
   * one reads.
   */
  needsPreviousFull: boolean;
}

/**
 * The three figures the Ads panel reports, in the order they are rendered.
 *
 * The two WEBPAGE entries differ only in which label they claim, so they share
 * one candidate query — see the cache in `readAdsPanel`.
 */
const ADS_ACTION_SPECS = {
  calls: {
    envName: 'NEXT_PUBLIC_GADS_CALL_CONV_ID',
    type: 'WEBSITE_CALL',
    noun: 'calls',
    selectDuration: true,
    allowTypeFallback: true,
    caveatRecordingStart: false,
    needsPreviousFull: false,
  },
  leadForm: {
    envName: 'NEXT_PUBLIC_GADS_CONV_ID',
    type: 'WEBPAGE',
    noun: 'form conversions',
    selectDuration: false,
    allowTypeFallback: false,
    caveatRecordingStart: true,
    needsPreviousFull: false,
  },
  taps: {
    envName: 'NEXT_PUBLIC_GADS_CLICK_CONV_ID',
    type: 'WEBPAGE',
    noun: 'button taps',
    selectDuration: false,
    allowTypeFallback: false,
    caveatRecordingStart: true,
    // The only figure the lead total reads.
    needsPreviousFull: true,
  },
} as const satisfies Record<string, AdsActionSpec>;

interface AdsResolvedAction {
  id: string;
  name: string;
  inConversionsColumn: boolean;
  /** How the action was found — surfaced when it was not the configured label. */
  via: 'label' | 'type';
  /** The raw API row, so a caller can pull a type-specific field. */
  raw: any;
}

/**
 * Every ENABLED conversion action of one type, with the snippet needed to match
 * a label against it.
 *
 * `tag_snippets` is a large field, hence the filter to a single type rather than
 * listing every action on the account. `selectDuration` is set only for the
 * website-call spec: `phone_call_duration_seconds` means nothing for the others,
 * and there is no reason to carry it.
 */
async function adsActionCandidates(
  token: string,
  type: string,
  selectDuration: boolean,
): Promise<any[]> {
  const rows = await adsGaql(
    token,
    'SELECT conversion_action.id, conversion_action.name, conversion_action.type, ' +
      'conversion_action.status, conversion_action.include_in_conversions_metric, ' +
      'conversion_action.tag_snippets' +
      (selectDuration ? ', conversion_action.phone_call_duration_seconds' : '') +
      ' FROM conversion_action ' +
      `WHERE conversion_action.type = '${type}' AND conversion_action.status = 'ENABLED'`,
  );

  return rows.map((r) => r.conversionAction).filter((a: any) => a && a.id) as any[];
}

/**
 * Pick the action a figure reports, out of the candidates of its type.
 *
 * ── Why by label and not by id ───────────────────────────────────────────────
 *
 * The conversion actions on this account were removed and recreated on
 * 2026-09-15, and the ids are not stable across that. An id typed in here would
 * one day point at a deleted action and report a confident zero forever. The
 * label is the value the browser fires with, so resolving through it means a
 * repoint in Ads moves the panel with it.
 *
 * ── Why only calls may fall back to position ─────────────────────────────────
 *
 * With exactly one candidate and no usable label, picking it is unambiguous, and
 * that is allowed for the website-call action. It is deliberately WITHHELD from
 * the two WEBPAGE figures: this account carries several actions of that type, so
 * choosing one by position would report its conversions under another action's
 * name — a wrong number that looks entirely right. An unmatched label there
 * throws, and surfaces as that figure's error rather than as a figure.
 *
 * An empty label is rejected before matching rather than after: `includes('')`
 * is true for every candidate, which would bind the figure to whichever action
 * the API happened to return first.
 */
function chooseAdsAction(candidates: any[], spec: AdsActionSpec): AdsResolvedAction {
  const wantLabel = adsConversionLabel(process.env[spec.envName] || '');

  const matchesLabel = (a: any): boolean =>
    !!wantLabel &&
    (a.tagSnippets || []).some((s: any) =>
      `${s.eventSnippet || ''}${s.globalSiteTag || ''}`.includes(wantLabel),
    );

  const match = wantLabel ? candidates.find(matchesLabel) : undefined;
  const fallback =
    spec.allowTypeFallback && candidates.length === 1 ? candidates[0] : undefined;
  const chosen = match || fallback;

  if (!chosen) {
    if (candidates.length === 0) {
      throw new Error(
        `no ENABLED ${spec.type} conversion action exists on this account, so nothing ` +
          `can record ${spec.noun} — create one and set ${spec.envName} to its label.`,
      );
    }
    const labelNote = wantLabel
      ? `none carries the configured label (${wantLabel})`
      : `${spec.envName} is unset or carries no label part`;
    throw new Error(
      spec.allowTypeFallback
        ? `${candidates.length} ENABLED ${spec.type} conversion actions exist and ${labelNote}, ` +
            'so there is no way to tell which one this panel should report.'
        : `${candidates.length} ENABLED ${spec.type} conversion actions exist and ${labelNote}. ` +
            'This figure is matched by label alone, because choosing between several actions ' +
            "of this type by position would report one action's conversions under another's name.",
    );
  }

  return {
    id: String(chosen.id),
    name: String(chosen.name || chosen.id),
    inConversionsColumn: chosen.includeInConversionsMetric === true,
    via: match ? 'label' : 'type',
    raw: chosen,
  };
}

/**
 * Count what one action recorded in one window.
 *
 * `segments.conversion_action` is in the SELECT as well as the WHERE: filtering
 * on a segment without selecting it is rejected with
 * `EXPECTED_REFERENCED_FIELD_IN_SELECT_CLAUSE`. Selecting it also means each row
 * names the action it belongs to, so a mis-scoped filter is visible in the data
 * rather than only in the total.
 */
async function adsActionCounts(
  token: string,
  actionId: string,
  from: string,
  to: string,
): Promise<{ conversions: number; inConversionsColumn: number }> {
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
  const rows = await adsGaql(
    token,
    'SELECT segments.conversion_action, segments.conversion_action_name, ' +
      'metrics.conversions, metrics.all_conversions FROM customer ' +
      `WHERE segments.conversion_action = 'customers/${customerId}/conversionActions/${actionId}' ` +
      `AND segments.date BETWEEN '${from}' AND '${to}'`,
  );

  let conversions = 0;
  let inConversionsColumn = 0;
  for (const row of rows) {
    const m = row.metrics || {};
    // Ads returns int64 metrics as strings.
    conversions += Number(m.allConversions || 0);
    inConversionsColumn += Number(m.conversions || 0);
  }
  return { conversions, inConversionsColumn };
}

/**
 * Caveats specific to one figure, or null when there are none.
 *
 * A note is set from facts read off the API and off the window boundaries — not
 * from a flag someone has to remember to clear — so each one stops appearing by
 * itself once it stops being true.
 *
 * The Secondary fact is deliberately NOT in here. It is carried by the `secondary`
 * flag instead, because a flag is what the verifier can check against its own
 * independent read, and because all three actions on this account are Secondary:
 * as three per-figure sentences it said the same thing three times, which reads
 * as noise rather than as a warning. The panel states it once.
 */
function adsFiguresNote(
  action: AdsResolvedAction,
  spec: AdsActionSpec,
  previousFrom: string,
): string | null {
  const notes: string[] = [];

  if (action.via === 'type') {
    notes.push(
      `Matched by type, not by label — ${spec.envName} does not identify ` +
        `"${action.name}", so this is the account's only enabled ${spec.type} action.`,
    );
  }

  // Zero in the earlier window can be an artifact of when the action was created
  // rather than a fact about demand, and the two render identically. Said only
  // while it is true, and it stops on its own once the windows move past the date.
  if (spec.caveatRecordingStart && previousFrom < ADS_WEBPAGE_CONVERSIONS_RECORDING_FROM) {
    notes.push(
      `This action was recreated on ${readableDate(ADS_WEBPAGE_CONVERSIONS_RECORDING_FROM)}, ` +
        'so the previous window reads zero because nothing was recorded then, not because ' +
        'none happened — the change shown is not a real rise.',
    );
  }

  return notes.length ? notes.join(' ') : null;
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
    calls: null,
    callsError: null,
    leadForm: null,
    leadFormError: null,
    taps: null,
    tapsError: null,
  };

  const missing = missingAdsVars();
  if (missing.length > 0) {
    return { ...base, note: `Google Ads is not configured — missing ${missing.join(', ')}.` };
  }

  // Spend, clicks and impressions only. `metrics.conversions` is deliberately
  // NOT queried at account level: an account-wide "conversions" figure would mix
  // the three website actions below with the offline uploads and the removed
  // actions, and would not mean what it looks like it means. Each conversion
  // figure is read separately against ITS OWN action id — see the
  // AdsConversionFigures doc comment on why those counts come from
  // `all_conversions`.
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
    // Minted once and reused for every window — two exchanges for one page view
    // is a needless round trip, and a credential problem should surface as one
    // error rather than two.
    const token = await mintAdsToken();

    // The two WEBPAGE figures look in the same candidate set and differ only in
    // which label they claim, so that query is made once and shared. Keyed by
    // type as well as the duration flag so a future spec of another type cannot
    // collide with this one.
    const candidateCache = new Map<string, Promise<any[]>>();
    const candidatesFor = (spec: AdsActionSpec): Promise<any[]> => {
      const key = `${spec.type}:${spec.selectDuration}`;
      let pending = candidateCache.get(key);
      if (!pending) {
        pending = adsActionCandidates(token, spec.type, spec.selectDuration);
        candidateCache.set(key, pending);
      }
      return pending;
    };

    // One figure, resolved and counted. Throws rather than returning a partial;
    // the caller turns that into that figure's error.
    const readFigure = async (
      spec: AdsActionSpec,
    ): Promise<{ action: AdsResolvedAction; figures: AdsConversionFigures }> => {
      const action = chooseAdsAction(await candidatesFor(spec), spec);
      const [cur, prev, prevFull] = await Promise.all([
        adsActionCounts(token, action.id, windows.current.from, windows.current.to),
        adsActionCounts(token, action.id, windows.previous.from, windows.previous.to),
        spec.needsPreviousFull
          ? adsActionCounts(
              token,
              action.id,
              windows.previousFull.from,
              windows.previousFull.to,
            )
          : Promise.resolve(null),
      ]);
      return {
        action,
        figures: {
          actionId: action.id,
          actionName: action.name,
          currentConversions: cur.conversions,
          previousConversions: prev.conversions,
          previousFullConversions: prevFull ? prevFull.conversions : null,
          currentInConversionsColumn: cur.inConversionsColumn,
          previousInConversionsColumn: prev.inConversionsColumn,
          secondary: !action.inConversionsColumn,
          via: action.via,
          note: adsFiguresNote(action, spec, windows.previous.from),
        },
      };
    };

    // Each figure is read in its own try: a rejected GAQL query or a missing
    // action must blank only that figure — never the spend totals beside it,
    // which come from a different resource and are almost always fine, and never
    // the other figures, which are separate actions. Whatever goes wrong is
    // carried in that figure's own *Error and rendered, never swallowed.
    const slot = async <T>(
      label: string,
      read: () => Promise<T>,
    ): Promise<{ value: T | null; error: string | null }> => {
      try {
        return { value: await read(), error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[dashboard] Google Ads ${label} read failed: ${message}`);
        return { value: null, error: message };
      }
    };

    const [callSlot, leadFormSlot, tapsSlot] = await Promise.all([
      slot('call', async (): Promise<AdsCalls> => {
        const { action, figures } = await readFigure(ADS_ACTION_SPECS.calls);
        const seconds = Number(action.raw.phoneCallDurationSeconds);
        // Read from the action rather than assumed, so the "60s+" in the label
        // cannot drift from what Google is actually enforcing.
        const minimumSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : null;
        return { ...figures, minimumSeconds };
      }),
      slot('lead-form', async () => (await readFigure(ADS_ACTION_SPECS.leadForm)).figures),
      slot('tap-click', async () => (await readFigure(ADS_ACTION_SPECS.taps)).figures),
    ]);

    return {
      ...base,
      available: true,
      currentTotals: await totalsFor(token, windows.current.from, windows.current.to),
      previousTotals: await totalsFor(token, windows.previous.from, windows.previous.to),
      calls: callSlot.value,
      callsError: callSlot.error,
      leadForm: leadFormSlot.value,
      leadFormError: leadFormSlot.error,
      taps: tapsSlot.value,
      tapsError: tapsSlot.error,
    };
  } catch (err) {
    console.error(`[dashboard] Google Ads read failed: ${err instanceof Error ? err.message : String(err)}`);
    return {
      ...base,
      note: `Could not read Google Ads: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── GA4 click events ─────────────────────────────────────────────────────────

export interface ClickTotals {
  phone: number;
  whatsapp: number;
  email: number;
}

export interface ClicksPanel {
  available: boolean;
  /** Set when GA4 is unreadable, or when the comparison itself is distorted. */
  note: string | null;
  current: ComparisonWindow;
  previous: ComparisonWindow;
  currentTotals: ClickTotals;
  previousTotals: ClickTotals;
  /**
   * The third window (the 30 days before `previous`), and its totals.
   *
   * Read for the LEAD TOTAL's "30 days before that" line rather than for anything
   * this panel draws — that line compares three windows and they have to be the
   * same measurement. This window is not rendered here.
   */
  previousFull: ComparisonWindow;
  previousFullTotals: ClickTotals;
}

const ZERO_CLICKS: ClickTotals = { phone: 0, whatsapp: 0, email: 0 };

/**
 * GA4 event name → the figure it fills.
 *
 * The names are `lib/tracking.ts`'s, checked against the functions that send them
 * (`trackPhoneClick`, `trackWhatsAppClick`, `trackEmailClick`). They are matched
 * with an `inListFilter`, not a `CONTAINS '_click'` pattern, so an event added
 * later under a similar name cannot quietly join these totals.
 */
const CLICK_EVENTS: Array<[string, keyof ClickTotals]> = [
  ['phone_click', 'phone'],
  ['whatsapp_click', 'whatsapp'],
  ['email_click', 'email'],
];

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/**
 * The service-account key, from an inline env var or a key file.
 *
 * Inline first, and that ordering is the whole point: a Vercel deployment is
 * built from git, the key file is gitignored, and so it is never uploaded.
 * `GOOGLE_APPLICATION_CREDENTIALS` is a path and therefore works only locally —
 * which is enough for the dry runs, and is how lib/google-search-console.ts
 * reads it, but it cannot work in production. `GA4_SERVICE_ACCOUNT_JSON` carries
 * the same JSON as a single value.
 */
function readServiceAccountKey(): ServiceAccountKey | null {
  const inline = (process.env.GA4_SERVICE_ACCOUNT_JSON || '').trim();
  const keyPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();

  let raw = inline;
  if (!raw && keyPath) {
    try {
      raw = readFileSync(keyPath, 'utf8');
    } catch (err) {
      throw new Error(
        `could not read the service-account key at GOOGLE_APPLICATION_CREDENTIALS ` +
          `(${keyPath}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (!raw) return null;

  let parsed: Partial<ServiceAccountKey>;
  try {
    parsed = JSON.parse(raw) as Partial<ServiceAccountKey>;
  } catch {
    throw new Error('the service-account key is not valid JSON (GA4_SERVICE_ACCOUNT_JSON)');
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('the service-account key has no client_email and/or private_key');
  }
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
    token_uri: parsed.token_uri,
  };
}

/** Names the missing GA4 configuration, or null when a read is possible. */
function ga4ConfigProblem(): string | null {
  const missing: string[] = [];
  if (!(process.env.GA4_PROPERTY_ID || '').trim()) missing.push('GA4_PROPERTY_ID');
  const hasKey =
    !!(process.env.GA4_SERVICE_ACCOUNT_JSON || '').trim() ||
    !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (!hasKey) missing.push('GA4_SERVICE_ACCOUNT_JSON');
  return missing.length
    ? `GA4 click data is not configured — missing ${missing.join(', ')}.`
    : null;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Mint an access token by signing a JWT with the service-account key.
 *
 * `googleapis` does this in three lines, and is deliberately not used: it is a
 * devDependency in this project, so importing it from a route means a production
 * deploy that omits devDependencies dies at runtime. The signing below is the
 * whole of what the library would have done. Same reasoning as mintAdsToken.
 */
async function mintServiceAccountToken(key: ServiceAccountKey): Promise<string> {
  const issued = Math.floor(Date.now() / 1000);
  const claims = {
    iss: key.client_email,
    scope: GA4_SCOPE,
    aud: key.token_uri || 'https://oauth2.googleapis.com/token',
    iat: issued,
    exp: issued + 3600,
  };

  const signingInput =
    `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.` +
    base64Url(JSON.stringify(claims));
  const signature = createSign('RSA-SHA256').update(signingInput).sign(key.private_key);
  const assertion = `${signingInput}.${base64Url(signature)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(claims.aud, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  let parsed: { access_token?: string; error?: string; error_description?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {};
  }

  if (!res.ok || !parsed.access_token) {
    throw new Error(
      `service-account token exchange failed (HTTP ${res.status}` +
        `${parsed.error ? `, ${parsed.error}` : ''}` +
        `${parsed.error_description ? `: ${parsed.error_description}` : ''}).`,
    );
  }
  return parsed.access_token;
}

/**
 * One GA4 report: how many times each click event fired in a window.
 *
 * Google's own message is surfaced on failure — it names the property or the
 * permission that is wrong, which is the only thing that makes a 403 actionable.
 */
async function ga4ClickCounts(
  token: string,
  propertyId: string,
  from: string,
  to: string,
): Promise<ClickTotals> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GA4_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${GA4_HOST}/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: CLICK_EVENTS.map(([name]) => name) },
          },
        },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
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
    throw new Error(
      `GA4 HTTP ${res.status}: ${parsed?.error?.message || JSON.stringify(parsed).slice(0, 300)}`,
    );
  }

  const out: ClickTotals = { ...ZERO_CLICKS };
  const byEvent = new Map(CLICK_EVENTS);
  for (const row of parsed.rows || []) {
    const name = row.dimensionValues?.[0]?.value;
    const key = byEvent.get(name);
    // An event with no rows in the window simply does not appear — absent means
    // zero, which is the correct reading for "it never fired".
    if (!key) continue;
    out[key] += Number(row.metricValues?.[0]?.value || 0);
  }
  return out;
}

async function readClicksPanel(now: Date): Promise<ClicksPanel> {
  // Same windows as the lead panel, on purpose: "3 calls tapped and 5 forms
  // filled" is only a comparison if the two cover the same days. GBP uses its own
  // settled window because Google revises listing data for a week or more; GA4
  // does not need that, and matching the leads is worth more here.
  const windows = leadWindows(now);
  const base: ClicksPanel = {
    available: false,
    note: null,
    current: windows.current,
    previous: windows.previous,
    currentTotals: { ...ZERO_CLICKS },
    previousTotals: { ...ZERO_CLICKS },
    previousFull: windows.previousFull,
    previousFullTotals: { ...ZERO_CLICKS },
  };

  const problem = ga4ConfigProblem();
  if (problem) return { ...base, note: problem };

  try {
    const key = readServiceAccountKey();
    if (!key) return { ...base, note: 'GA4 click data is not configured — no service-account key.' };
    const propertyId = (process.env.GA4_PROPERTY_ID || '').trim();

    const token = await mintServiceAccountToken(key);
    // Three windows, not two: the third is only for the lead total's "30 days
    // before that" line, and is not drawn anywhere in this panel.
    const [currentTotals, previousTotals, previousFullTotals] = await Promise.all([
      ga4ClickCounts(token, propertyId, windows.current.from, windows.current.to),
      ga4ClickCounts(token, propertyId, windows.previous.from, windows.previous.to),
      ga4ClickCounts(token, propertyId, windows.previousFull.from, windows.previousFull.to),
    ]);

    // The comparison is only meaningful once both windows fall inside the period
    // GA4 was actually recording. Before that the earlier window is zero because
    // nothing was forwarded, not because nothing was clicked — which renders as
    // spectacular growth. Say so while it is true, and stop saying it by itself
    // once the windows have moved past the date.
    const distorted = windows.previous.from < GA4_CLICKS_RECORDING_FROM;

    return {
      ...base,
      available: true,
      note: distorted
        ? `Custom events only started reaching GA4 on ${readableDate(GA4_CLICKS_RECORDING_FROM)} — ` +
          'before that they were pushed to the data layer and no tag forwarded them. ' +
          'The previous window reads as zero because nothing was recorded, not because ' +
          'nothing was clicked, so the change below is not a real rise.'
        : null,
      currentTotals,
      previousTotals,
      previousFullTotals,
    };
  } catch (err) {
    console.error(
      `[dashboard] GA4 click read failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return {
      ...base,
      note: `Could not read GA4: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Lead taps ────────────────────────────────────────────────────────────────

const ZERO_TAPS: LeadTapSources = { callButton: 0, whatsapp: 0, gbpCalls: 0, adsTaps: 0 };

interface LeadTapSet {
  current: LeadTapSources;
  previous: LeadTapSources;
  previousFull: LeadTapSources;
  /** Display names of sources that could not be read. Empty is the healthy case. */
  missing: string[];
  /**
   * Set when the CURRENT window's listing-call figure is still inside Google's
   * revision period. Applies to that window only — the two earlier ones are long
   * settled.
   */
  settlingNote: string | null;
}

/**
 * Gather the four tap sources for the three lead windows.
 *
 * ── Why GBP is read again, over different days ───────────────────────────────
 *
 * The listing panel deliberately uses its own window: a trailing 30 days ending
 * `coveredTo - GBP_SETTLE_LAG_DAYS`, so that it only ever shows days Google has
 * stopped revising. Both windows are 30 days long now, but they are still not the
 * same 30 days — the panel's ends about five days before the lead window does, so
 * summing it into the lead total would drop the newest days and count five older
 * ones instead. So the lead total reads `gbp_daily_metrics` over the LEAD windows
 * instead, and pays for it by being incomplete at the recent end — which
 * `settlingNote` discloses rather than hides.
 *
 * ── Why a missing source is named rather than zeroed ─────────────────────────
 *
 * GA4, Ads and GBP fail independently. Any one of them failing would silently
 * shrink `total`, and a smaller number that looks like a measurement is the
 * failure this whole file is written against — the same reason `callsError`
 * exists rather than a `calls: 0`. Each source that could not be read is named in
 * `missing`, and the card says the total is an undercount.
 *
 * The GA4 and Ads components are NOT re-fetched: those two panels already read
 * the lead windows, so their figures are reused as-is. Only GBP needs its own
 * read, and one range covers all three windows.
 */
async function readLeadTaps(
  store: SupabaseClient,
  windows: LeadWindows,
  clicks: ClicksPanel,
  ads: AdsPanel,
  gbp: GbpPanel,
): Promise<LeadTapSet> {
  const missing: string[] = [];

  const ga4 = clicks.available ? clicks : null;
  if (!ga4) missing.push('site call and WhatsApp taps (GA4)');

  // Two different failures put a zero in the Ads component of the total: the
  // whole panel not loading (a quota or a credential error) and the panel
  // loading but its tap figure not resolving. They are indistinguishable once
  // the arithmetic is done, and both shrink the headline, so both are named.
  // The GA4 branch above only ever has the first case, which is why it can test
  // the panel alone; here testing `adsTaps` covers both, because it is null
  // exactly when either has happened.
  const adsTaps = ads.available ? ads.taps : null;
  if (!adsTaps) missing.push('Google Ads tap conversions');
  // The tap spec always asks for this window, so a null here means the read was
  // skipped rather than that the figure is genuinely unknown. Zeroing it would
  // quietly shrink the third line, so name it instead.
  if (adsTaps && adsTaps.previousFullConversions === null) {
    missing.push('Google Ads tap conversions for the 30 days before that');
  }

  // One read for all three windows: previousFull is the earliest, current the
  // latest, and every row in between belongs to at least one of them.
  let gbpRows: StoredMetricRow[] = [];
  let gbpOk = true;
  try {
    gbpRows = await selectMetrics(store, windows.previousFull.from, windows.current.to);
  } catch (err) {
    gbpOk = false;
    missing.push('Google listing call clicks (GBP)');
    console.error(
      `[dashboard] lead-tap GBP read failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const gbpCallsIn = (w: ComparisonWindow): number => {
    if (!gbpOk) return 0;
    let sum = 0;
    for (const r of gbpRows) {
      if (r.metric !== 'CALL_CLICKS') continue;
      if (r.metric_date < w.from || r.metric_date > w.to) continue;
      sum += r.value;
    }
    return sum;
  };

  const forWindow = (which: keyof LeadWindows): LeadTapSources => ({
    callButton: ga4 ? ga4[`${which}Totals`].phone : 0,
    whatsapp: ga4 ? ga4[`${which}Totals`].whatsapp : 0,
    gbpCalls: gbpCallsIn(windows[which]),
    adsTaps: adsTaps ? (adsTaps[`${which}Conversions`] ?? 0) : 0,
  });

  const current = forWindow('current');

  // The listing figure is the one that arrives incomplete. Google revises these
  // for about five days, so a window running past the last settled day is short
  // by an unknown amount — and at zero it is indistinguishable from "nobody
  // rang from the listing", which is exactly when saying so matters most.
  const lastSettled = gbp.coveredTo
    ? addDays(gbp.coveredTo, -GBP_SETTLE_LAG_DAYS)
    : null;
  const stillSettling = gbpOk && lastSettled !== null && windows.current.to > lastSettled;

  return {
    current,
    previous: forWindow('previous'),
    previousFull: forWindow('previousFull'),
    missing,
    settlingNote: stillSettling
      ? `Google listing call clicks are incomplete for this window: Google revises ` +
        `listing data for about ${GBP_SETTLE_LAG_DAYS} days after the fact, so the newest ` +
        `days have not settled yet and this figure will rise on its own.`
      : null,
  };
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
  /** GA4 call/WhatsApp/email taps. Independent of Supabase — it reads Google. */
  clicks: ClicksPanel;
  /** Set when the durable store is missing — every figure below is then absent. */
  storeNote: string | null;
}

/**
 * Assemble everything the dashboard renders.
 *
 * Reads are sequential rather than `Promise.all` on purpose: three of the four
 * fan out to Google, and firing an Ads GAQL query concurrently with a GBP read
 * and a GA4 report for a page one person refreshes buys nothing while making a
 * cold start's failure mode harder to read in the logs. The parallelism that
 * does exist is INSIDE a panel — the two windows of one source go together —
 * where the requests share a token and a failure mode.
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
    taps: { ...ZERO_TAPS },
    tapsMissing: [],
    total: 0,
    tapsOverlap: false,
    note: null,
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
        calls: null,
        callsError: null,
        leadForm: null,
        leadFormError: null,
        taps: null,
        tapsError: null,
      },
      // Reported unavailable rather than read, even though GA4 needs no Supabase
      // credentials. Same reason the Ads panel is skipped here: a deployment that
      // can read one panel and not the others presents a partially-populated
      // dashboard whose gaps look like real zeros. See the module header.
      clicks: {
        available: false,
        note: null,
        current: windows.current,
        previous: windows.previous,
        currentTotals: { ...ZERO_CLICKS },
        previousTotals: { ...ZERO_CLICKS },
        previousFull: windows.previousFull,
        previousFullTotals: { ...ZERO_CLICKS },
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

  const gbp = await readGbpPanel(store, now);
  const ads = await readAdsPanel(now);
  const clicks = await readClicksPanel(now);

  // The lead total sums figures the three panels already read, so it has to come
  // after them. This is the one place the lead count depends on Google, and the
  // only reason `getDashboardData` cannot answer from the store alone.
  const tapSet = await readLeadTaps(store, windows, clicks, ads, gbp);

  return {
    generatedAt,
    windows,
    current: summarisePeriod(
      rows,
      windows.current,
      tapSet.current,
      tapSet.missing,
      tapSet.settlingNote,
    ),
    previous: summarisePeriod(rows, windows.previous, tapSet.previous, tapSet.missing, null),
    previousFull: summarisePeriod(
      rows,
      windows.previousFull,
      tapSet.previousFull,
      tapSet.missing,
      null,
    ),
    feed,
    gbp,
    ads,
    clicks,
    storeNote,
  };
}
