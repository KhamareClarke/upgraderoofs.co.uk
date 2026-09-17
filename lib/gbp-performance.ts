import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { GBP_LOCATION_ID } from '@/lib/contact';
import { recordPipelineEvent } from '@/lib/lead-health';

/**
 * lib/gbp-performance.ts
 *
 * Pulls the Google Business Profile **Performance API** for Marcus's listing and
 * stores it, so calls / direction requests / website clicks that happen on the
 * Google listing itself become a trackable channel rather than an invisible one.
 *
 * ── Why this is not just "fetch it when you need it" ─────────────────────────
 *
 * Measured against the live API on 2026-09-16, not taken from docs:
 *
 *   * The series LAGS. The newest day carrying data was 2026-09-11 — four days
 *     behind. Google publishes no freshness guarantee; community reports put
 *     stabilisation at 48-72h, with direction requests sometimes ~10 days.
 *   * It REVISES. Those numbers keep changing after first publication.
 *
 * So a live read compared against a stored one is systematically wrong: the
 * recent window is incomplete while the older one is settled, which renders as
 * a decline that never happened. Persisting a re-pulled series is what makes
 * period-over-period honest.
 *
 * ── Which credential, and why not the obvious one ────────────────────────────
 *
 * `app/api/gbp/route.ts` authenticates with the SERVICE ACCOUNT and cannot see
 * this location at all — it has no Manager grant, so it 404s. Verified by
 * `scripts/probe-gbp-performance.js`, which tries both paths: the OAuth refresh
 * token (`GBP_CLIENT_ID` / `GBP_CLIENT_SECRET` / `GBP_REFRESH_TOKEN`) resolves
 * the location and returns data; the service account does not. This module uses
 * the OAuth path for that reason and not as a preference.
 *
 * ── Deliberate omissions ─────────────────────────────────────────────────────
 *
 *   * `googleapis` is NOT imported. It is a devDependency here, so a production
 *     install that omits devDependencies would break at runtime, and it is a
 *     large cold-start cost for what is one form POST. `fetch` is used instead.
 *   * `BUSINESS_CONVERSATIONS` is NOT collected. Google retired Business Profile
 *     messaging on 2024-07-31, so the metric is permanently zero and would read
 *     as "no messages came in" forever. See the migration comment.
 *   * Diagnostics use console.error/console.warn only. `next.config.js` sets
 *     `removeConsole: { exclude: ['error','warn'] }`, so a console.log here is
 *     compiled out of production and invisible exactly when it is needed.
 *
 * This module must NOT import `next/server`, so CLI scripts and route handlers
 * can both use it. All env reads are lazy — scripts load dotenv after imports.
 */

const PERF_HOST = 'https://businessprofileperformance.googleapis.com';
const INFO_HOST = 'https://mybusinessbusinessinformation.googleapis.com';
const ACCT_HOST = 'https://mybusinessaccountmanagement.googleapis.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const TABLE = 'gbp_daily_metrics';
const STATE_TABLE = 'gbp_sync_state';

/** Network timeouts. A hung refresh must not hold a cron invocation open. */
const TOKEN_TIMEOUT_MS = 15_000;
const API_TIMEOUT_MS = 30_000;

/**
 * The exact metrics collected. An allowlist rather than "whatever the API
 * returns", so a future Google enum addition cannot silently start entering the
 * table, and so the business-date/rounding assumptions stay reviewable in one
 * place.
 */
export const GBP_METRICS = [
  'CALL_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'WEBSITE_CLICKS',
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
] as const;

export type GbpMetric = (typeof GBP_METRICS)[number];

/** The three that represent a customer actually doing something. */
export const GBP_ACTION_METRICS: GbpMetric[] = [
  'CALL_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'WEBSITE_CLICKS',
];

const METRIC_ALLOWLIST: Record<string, true> = (() => {
  const out: Record<string, true> = {};
  for (const m of GBP_METRICS) out[m] = true;
  return out;
})();

/** Default trailing window. See resolveWindow() for why it is not smaller. */
const DEFAULT_LOOKBACK_DAYS = 14;
const MIN_LOOKBACK_DAYS = 7;

/** Default first-run backfill. 365 is what was verified reachable. */
const DEFAULT_BACKFILL_DAYS = 365;

/** Google caps a single daily-range request; longer backfills are chunked. */
const BACKFILL_CHUNK_DAYS = 90;

/** PostgREST writes in chunks rather than one very large statement. */
const UPSERT_CHUNK = 500;

/** Raised when the OAuth credential triple is incomplete or unusable. */
export class GbpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GbpConfigError';
  }
}

// ── Date helpers ─────────────────────────────────────────────────────────────
// UTC everywhere. The site runs on Europe/London, which is UTC+1 for most of
// the year: any local-time date arithmetic shifts the requested window by a day,
// which silently drops the oldest day and requests a day Google cannot have.

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `YYYY-MM-DD` in UTC. */
export function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Midnight UTC, `days` before today. */
export function utcDaysAgo(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/** Add days to a `YYYY-MM-DD` string, returning the same format. */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toIsoDate(dt);
}

/** Inclusive day count between two `YYYY-MM-DD` strings. */
export function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000,
  );
}

// ── Credentials ──────────────────────────────────────────────────────────────

const CREDENTIAL_ENV_VARS = ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN'];

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Which credential env vars are missing. Named individually so the error says
 * exactly what to add; a generic "credentials invalid" here costs an hour.
 */
export function missingCredentialVars(): string[] {
  return CREDENTIAL_ENV_VARS.filter((name) => !(process.env[name] || '').trim());
}

/**
 * Mint an access token from the long-lived refresh token.
 *
 * The message deliberately never includes a token, a refresh token, a client
 * secret, a length, or a fragment of any of them — only which vars are missing
 * or Google's own error code.
 */
export async function mintAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const missing = missingCredentialVars();
  if (missing.length > 0) {
    throw new GbpConfigError(
      `GBP Performance is not configured — missing ${missing.join(', ')}. ` +
        'The refresh token cannot be exchanged without the client id and secret. ' +
        '(Note: neither existed in Vercel as of 2026-09-16 — only GBP_REFRESH_TOKEN did.) ' +
        'Set them in Vercel and redeploy; a Vercel env var has no effect until redeploy.',
    );
  }

  const body = new URLSearchParams({
    client_id: (process.env.GBP_CLIENT_ID || '').trim(),
    client_secret: (process.env.GBP_CLIENT_SECRET || '').trim(),
    refresh_token: (process.env.GBP_REFRESH_TOKEN || '').trim(),
    grant_type: 'refresh_token',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (err) {
    throw new GbpConfigError(
      `Could not reach Google's token endpoint: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  let parsed: { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {};
  }

  if (!res.ok || !parsed.access_token) {
    // invalid_grant is the single most likely way this whole feature dies, and
    // it has several unrelated causes, so it gets its own actionable message.
    if (parsed.error === 'invalid_grant') {
      throw new GbpConfigError(
        'Google rejected the GBP refresh token (invalid_grant). Common causes, in order ' +
          'of likelihood: the OAuth consent screen is still in "Testing" publishing ' +
          'status, where Google expires refresh tokens every 7 days; the token has been ' +
          'unused for 6 months; the client secret was rotated; or access was revoked. ' +
          'Re-mint with `node scripts/generate-gbp-token.js` and update GBP_REFRESH_TOKEN.',
      );
    }
    throw new GbpConfigError(
      `GBP token exchange failed (HTTP ${res.status}` +
        `${parsed.error ? `, ${parsed.error}` : ''}).`,
    );
  }

  const expiresIn = Number(parsed.expires_in) || 3600;
  cachedToken = {
    token: parsed.access_token,
    // Refresh a minute early so a token cannot expire mid-request.
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
  };
  return cachedToken.token;
}

/** Test seam / script use: forget the cached token. */
export function resetTokenCache(): void {
  cachedToken = null;
}

// ── Store ────────────────────────────────────────────────────────────────────

let cachedStore: SupabaseClient | null | undefined;
let storeWarned = false;

/**
 * Supabase client for the GBP tables.
 *
 * NOT `getStore()` from lib/lead-health.ts, deliberately. That helper falls back
 * to the anon key, and these tables grant anon nothing — so a fallback there
 * would surface as `permission denied for table gbp_daily_metrics` on every
 * write, which reads as a code bug rather than as "not configured". This
 * requires the service-role key specifically and returns null without it.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` is Production-only in Vercel, so this is null in
 * Preview by design.
 */
export function getGbpStore(): SupabaseClient | null {
  if (cachedStore !== undefined) return cachedStore;

  // A URL is not a secret, so the public name is an acceptable fallback for it.
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !key) {
    cachedStore = null;
    if (!storeWarned) {
      storeWarned = true;
      console.warn(
        '[gbp] no service-role Supabase credentials — GBP performance data is NOT being ' +
          'stored. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and ' +
          'SUPABASE_SERVICE_ROLE_KEY, and run the gbp performance migration. The anon key ' +
          'is deliberately not used: these tables grant it nothing.',
      );
    }
    return cachedStore;
  }

  cachedStore = createClient(url, key, { auth: { persistSession: false } });
  return cachedStore;
}

// ── API access ───────────────────────────────────────────────────────────────

/** GET a GBP API path, returning parsed JSON. Throws with the HTTP status attached. */
async function gbpGet(url: string, accessToken: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
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
    parsed = { raw: text.slice(0, 400) };
  }

  if (!res.ok) {
    const err = new Error(
      `GBP API HTTP ${res.status}: ${JSON.stringify(parsed).slice(0, 400)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return parsed;
}

/** `dailyRange.start_date.year=…&…` — the dotted snake_case form Google documents. */
function dailyRangeQuery(startIso: string, endIso: string): string {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  return [
    `dailyRange.start_date.year=${sy}`,
    `dailyRange.start_date.month=${sm}`,
    `dailyRange.start_date.day=${sd}`,
    `dailyRange.end_date.year=${ey}`,
    `dailyRange.end_date.month=${em}`,
    `dailyRange.end_date.day=${ed}`,
  ].join('&');
}

let cachedLocationName: string | null = null;

/**
 * Resolve `locations/{id}` for the target listing.
 *
 * The Performance API's documented resource is the bare `locations/{locationId}`,
 * not a path nested under an account, so the happy path is zero discovery calls.
 * The account walk is kept purely as a fallback and logs loudly when it fires,
 * because that means the direct form stopped working.
 *
 * The resolved id is asserted against GBP_LOCATION_ID. A wrong location id and a
 * missing permission both return 404, and this repo has already been burned once
 * by a plausible-looking wrong id being promoted to canonical (see lib/contact.ts).
 */
async function resolveLocationName(accessToken: string): Promise<string> {
  if (cachedLocationName) return cachedLocationName;

  const target = `locations/${GBP_LOCATION_ID}`;
  try {
    await gbpGet(
      `${PERF_HOST}/v1/${target}:fetchMultiDailyMetricsTimeSeries?dailyMetrics=CALL_CLICKS` +
        `&${dailyRangeQuery(addDays(toIsoDate(new Date()), -3), addDays(toIsoDate(new Date()), -2))}`,
      accessToken,
    );
    cachedLocationName = target;
    return target;
  } catch (err: any) {
    const status = err?.status;
    if (status !== 404 && status !== 403) throw err;
    console.warn(
      `[gbp] direct ${target} returned HTTP ${status} — falling back to account ` +
        'discovery. If this persists, the direct resource form has changed.',
    );
  }

  const accts = await gbpGet(`${ACCT_HOST}/v1/accounts`, accessToken);
  const accounts: any[] = accts.accounts || [];
  const seen: string[] = [];
  for (const acct of accounts) {
    const locs = await gbpGet(
      `${INFO_HOST}/v1/${acct.name}/locations?readMask=name,title&pageSize=100`,
      accessToken,
    );
    for (const loc of locs.locations || []) {
      if (typeof loc.name === 'string') seen.push(loc.name);
      if (loc.name && loc.name.includes(`locations/${GBP_LOCATION_ID}`)) {
        cachedLocationName = loc.name;
        return loc.name;
      }
    }
  }

  throw new GbpConfigError(
    `Target location locations/${GBP_LOCATION_ID} was not visible via either the direct ` +
      `resource or ${accounts.length} account(s) [${seen.join(', ') || 'none'}]. ` +
      'The OAuth identity cannot see this listing.',
  );
}

// ── Fetch + flatten ──────────────────────────────────────────────────────────

export interface MetricPoint {
  metric: GbpMetric;
  date: string; // YYYY-MM-DD
  value: number;
}

export interface FetchResult {
  points: MetricPoint[];
  /** Days the API returned a datapoint for, with or without a value. */
  daysInRange: number;
  /** Set when the API returned dates outside the requested window. */
  rangeViolation: string | null;
}

/**
 * Fetch the daily series for all metrics over [startIso, endIso] inclusive.
 *
 * Flattening notes, each of which is a bug seen in this repo's older audit
 * scripts:
 *
 *   * Values arrive as JSON **strings** ("3"), so they are coerced.
 *   * A day with no activity returns a datapoint with **no `value` key at all**,
 *     rather than a zero. Those are skipped, so the stored series is sparse.
 *   * Duplicate (metric, date) keys are resolved last-write-wins, NOT summed.
 *     The existing scripts accumulate, which would double-count a conversion if
 *     the API ever split a metric across two response blocks.
 *   * Dates outside the requested window are dropped with an error, because a
 *     silently-ignored range parameter would otherwise write the wrong window.
 */
export async function fetchDailyMetrics(
  startIso: string,
  endIso: string,
  accessToken?: string,
): Promise<FetchResult> {
  const token = accessToken ?? (await mintAccessToken());
  const locationName = await resolveLocationName(token);

  const query =
    GBP_METRICS.map((m) => `dailyMetrics=${m}`).join('&') +
    '&' +
    dailyRangeQuery(startIso, endIso);

  const body = await gbpGet(
    `${PERF_HOST}/v1/${locationName}:fetchMultiDailyMetricsTimeSeries?${query}`,
    token,
  );

  const byKey: Record<string, MetricPoint> = {};
  const keyOrder: string[] = [];
  const outOfRange: string[] = [];
  const datesSeen: Record<string, true> = {};

  for (const block of body.multiDailyMetricTimeSeries || []) {
    for (const pair of block.dailyMetricTimeSeries || []) {
      const metric = pair.dailyMetric;
      // Allowlist, not passthrough: a new Google enum member must not silently
      // start being stored under assumptions nobody has reviewed. Only the 7
      // metrics below are ever requested, so anything else arriving means the
      // API changed shape — worth a line in the log rather than a silent drop.
      if (typeof metric !== 'string' || !METRIC_ALLOWLIST[metric]) {
        console.warn(
          `[gbp] ignoring metric not in the allowlist: ${JSON.stringify(metric)}. ` +
            'If this is a new Google metric worth storing, add it to GBP_METRICS ' +
            'and to the migration comment.',
        );
        continue;
      }

      for (const dv of (pair.timeSeries && pair.timeSeries.datedValues) || []) {
        const d = dv.date || {};
        if (!d.year || !d.month || !d.day) continue;
        const date = `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;
        datesSeen[date] = true;

        const raw = dv.value != null ? dv.value : dv.dailyMetricValue;
        if (raw == null) continue; // zero-activity day: no value key

        const value = Number(raw);
        if (!Number.isFinite(value)) {
          console.warn(`[gbp] non-numeric value for ${metric} ${date}: ${JSON.stringify(raw)}`);
          continue;
        }

        if (date < startIso || date > endIso) {
          outOfRange.push(`${metric}@${date}`);
          continue;
        }

        const key = `${metric}|${date}`;
        if (byKey[key] && byKey[key].value !== value) {
          console.warn(
            `[gbp] duplicate ${metric} ${date}: ${byKey[key].value} then ${value} — ` +
              'keeping the later value rather than summing.',
          );
        }
        if (!byKey[key]) keyOrder.push(key);
        byKey[key] = { metric: metric as GbpMetric, date, value };
      }
    }
  }

  let rangeViolation: string | null = null;
  if (outOfRange.length > 0) {
    rangeViolation =
      `API returned ${outOfRange.length} datapoint(s) outside the requested ` +
      `${startIso}..${endIso} window (e.g. ${outOfRange.slice(0, 3).join(', ')}). ` +
      'The daily-range parameters may have been ignored; those rows were dropped.';
    console.error(`[gbp] range-ignored — ${rangeViolation}`);
  }

  return {
    points: keyOrder.map((k) => byKey[k]),
    daysInRange: Object.keys(datesSeen).length,
    rangeViolation,
  };
}

// ── Windows ──────────────────────────────────────────────────────────────────

export interface Window {
  from: string;
  to: string;
}

/**
 * The trailing window re-pulled on every sync.
 *
 * Not smaller than 7 days, and 14 by default, because the tail is genuinely
 * unsettled: a day can appear, then be revised, and direction requests can take
 * ~10 days. A 3-day window would finalise a day at a wrong value and never
 * revisit it. Each run re-pulls the whole window and upserts, which is what lets
 * late and revised values land.
 *
 * The end date is YESTERDAY UTC — today is never complete.
 */
export function resolveWindow(lookbackDays?: number): Window {
  const requested = lookbackDays ?? Number(process.env.GBP_SYNC_LOOKBACK_DAYS || DEFAULT_LOOKBACK_DAYS);
  const days = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : DEFAULT_LOOKBACK_DAYS;
  if (days < MIN_LOOKBACK_DAYS) {
    console.warn(
      `[gbp] lookback of ${days} day(s) is below the ${MIN_LOOKBACK_DAYS}-day floor; ` +
        'Google revises these figures for up to ~10 days, so a shorter window can ' +
        'finalise a day wrong and never revisit it. Using the floor.',
    );
  }
  const effective = Math.max(MIN_LOOKBACK_DAYS, days);
  const to = toIsoDate(utcDaysAgo(1));
  return { from: addDays(to, -(effective - 1)), to };
}

/** Split a long backfill into chunks the API accepts comfortably. */
export function chunkWindows(fromIso: string, toIso: string, chunkDays = BACKFILL_CHUNK_DAYS): Window[] {
  const out: Window[] = [];
  let cursor = fromIso;
  while (cursor <= toIso) {
    const end = addDays(cursor, chunkDays - 1);
    out.push({ from: cursor, to: end > toIso ? toIso : end });
    cursor = addDays(out[out.length - 1].to, 1);
  }
  return out;
}

// ── Sync ─────────────────────────────────────────────────────────────────────

export interface MetricSummary {
  rows: number;
  total: number;
  firstDate: string | null;
  lastDate: string | null;
}

export interface GbpSyncResult {
  ok: boolean;
  dryRun: boolean;
  locationId: string;
  windows: Window[];
  datapoints: number;
  daysInRange: number;
  byMetric: Record<string, MetricSummary>;
  written: number;
  /** Only populated when `diffOnly` is set: rows whose value would change. */
  changes?: { metric: string; date: string; from: number; to: number }[];
  store: 'ok' | 'unavailable';
  rangeViolation: string | null;
  durationMs: number;
  /**
   * True when the failure was a credential/configuration state rather than a
   * runtime error — missing env vars, or Google refusing the refresh token. A
   * redeploy fixes this class, so the route maps it to 503 rather than 500.
   * Set from a typed `instanceof` check, never by matching the message text.
   */
  configError?: boolean;
  error?: string;
}

export interface SyncOptions {
  /** Explicit window, overriding the trailing lookback. */
  from?: string;
  to?: string;
  /** Trailing window size in days. */
  days?: number;
  /** Backfill from `backfillDays` ago instead of the trailing window. */
  backfillDays?: number;
  /** Fetch and report, but write nothing and record no pipeline event. */
  dryRun?: boolean;
  /** Report which stored rows would change, writing nothing. */
  diffOnly?: boolean;
}

function summarise(points: MetricPoint[]): Record<string, MetricSummary> {
  const out: Record<string, MetricSummary> = {};
  for (const p of points) {
    let s = out[p.metric];
    if (!s) {
      s = { rows: 0, total: 0, firstDate: null, lastDate: null };
      out[p.metric] = s;
    }
    s.rows += 1;
    s.total += p.value;
    if (!s.firstDate || p.date < s.firstDate) s.firstDate = p.date;
    if (!s.lastDate || p.date > s.lastDate) s.lastDate = p.date;
  }
  return out;
}

/**
 * Pull and persist the GBP Performance series.
 *
 * Idempotent by construction: every run upserts onto
 * `(location_id, metric_date, metric)`, so re-running — which Vercel does, since
 * it both retries nothing and can deliver the same cron run twice — cannot
 * duplicate a row or double-count a total. Revisions overwrite in place.
 */
export async function syncGbpPerformance(options: SyncOptions = {}): Promise<GbpSyncResult> {
  const startedAt = Date.now();
  const dryRun = options.dryRun === true;
  const diffOnly = options.diffOnly === true;

  const windows: Window[] = options.from && options.to
    ? [{ from: options.from, to: options.to }]
    : options.backfillDays
      ? chunkWindows(addDays(toIsoDate(utcDaysAgo(1)), -(options.backfillDays - 1)), toIsoDate(utcDaysAgo(1)))
      : [resolveWindow(options.days)];

  const base: GbpSyncResult = {
    ok: false,
    dryRun,
    locationId: GBP_LOCATION_ID,
    windows,
    datapoints: 0,
    daysInRange: 0,
    byMetric: {},
    written: 0,
    // Reports whether a store is CONFIGURED, not whether one was used. A dry run
    // does not use the store, but reporting `unavailable` there because of that
    // would misreport a perfectly configured deployment as unconfigured.
    store: getGbpStore() ? 'ok' : 'unavailable',
    rangeViolation: null,
    durationMs: 0,
  };

  /** A missing credential or store is a configuration state, not a runtime fault. */
  const failConfig = async (error: string): Promise<GbpSyncResult> => {
    await recordOutcome(dryRun, false, error, Date.now() - startedAt);
    return { ...base, configError: true, error, durationMs: Date.now() - startedAt };
  };

  // A real sync needs somewhere to write, and a diff needs somewhere to read.
  // A DRY RUN NEEDS NEITHER, deliberately: it is the credential proof, and it
  // has to be usable before the migration has been applied — otherwise "prove
  // the credentials work" fails for a reason that has nothing to do with
  // credentials.
  //
  // Checked here, before minting a token, so a missing key cannot cost a token
  // exchange and a set of API calls whose result has nowhere to go.
  if (!dryRun && !getGbpStore()) {
    const error =
      'No service-role Supabase store configured — the pull would have nowhere to land.';
    console.error(`[gbp] ${error}`);
    return failConfig(error);
  }
  let points: MetricPoint[] = [];
  let daysInRange = 0;
  let rangeViolation: string | null = null;

  try {
    const token = await mintAccessToken();
    for (const w of windows) {
      const res = await fetchDailyMetrics(w.from, w.to, token);
      points = points.concat(res.points);
      daysInRange += res.daysInRange;
      if (res.rangeViolation) rangeViolation = res.rangeViolation;
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[gbp] fetch failed: ${error}`);
    await recordOutcome(dryRun, false, `fetch: ${error}`.slice(0, 500), Date.now() - startedAt);
    return {
      ...base,
      error,
      configError: err instanceof GbpConfigError,
      rangeViolation,
      durationMs: Date.now() - startedAt,
    };
  }

  const byMetric = summarise(points);

  // A 200 carrying no data at all is not a quiet period for this listing — it
  // has call and website activity in any fortnight — so it is treated as a
  // failure. This is the signature of a token that authenticates but resolves
  // an empty location, and without this check it would look identical to a
  // healthy quiet run forever.
  if (points.length === 0 && windows.length === 1 && daysBetween(windows[0].from, windows[0].to) >= 6) {
    const error =
      `API returned zero datapoints across all ${GBP_METRICS.length} metrics for ` +
      `${windows[0].from}..${windows[0].to} — treated as a failure, not a quiet period.`;
    console.error(`[gbp] ${error}`);
    await recordOutcome(dryRun, false, error, Date.now() - startedAt);
    return { ...base, byMetric, daysInRange, rangeViolation, error, durationMs: Date.now() - startedAt };
  }

  if (dryRun) {
    return {
      ...base,
      ok: true,
      datapoints: points.length,
      daysInRange,
      byMetric,
      rangeViolation,
      durationMs: Date.now() - startedAt,
    };
  }

  // Past the dry-run return, a store is required — the up-front check above
  // already refused if it were absent, so this is a second look at a cached
  // value rather than a second requirement. It is expressed as a check so the
  // write path below has a real type instead of an assertion.
  const store = getGbpStore();
  if (!store) {
    const error = 'No service-role Supabase store configured.';
    console.error(`[gbp] ${error}`);
    return failConfig(error);
  }

  if (diffOnly) {
    const changes = await diffAgainstStore(store, points);
    return {
      ...base,
      ok: true,
      datapoints: points.length,
      daysInRange,
      byMetric,
      changes,
      rangeViolation,
      durationMs: Date.now() - startedAt,
    };
  }

  const syncedAt = new Date().toISOString();
  const rows = points.map((p) => ({
    location_id: GBP_LOCATION_ID,
    metric_date: p.date,
    metric: p.metric,
    value: p.value,
    synced_at: syncedAt,
    // first_seen_at is deliberately absent: PostgREST only updates columns
    // present in the payload, so omitting it preserves the original on UPDATE
    // while the column default supplies it on INSERT. That asymmetry is what
    // makes revisions observable (synced_at > first_seen_at).
  }));

  try {
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK);
      const { error } = await store.from(TABLE).upsert(chunk, {
        onConflict: 'location_id,metric_date,metric',
        ignoreDuplicates: false,
      });
      if (error) throw new Error(error.message);
    }
    await writeSyncState(store, windows, null);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[gbp] store failed: ${error}`);
    await writeSyncState(store, windows, error.slice(0, 500)).catch(() => undefined);
    // Distinguished from `fetch:` on purpose — "we got the data and could not
    // keep it" is a different incident from "Google would not talk to us".
    await recordOutcome(dryRun, false, `store: ${error}`.slice(0, 500), Date.now() - startedAt);
    return { ...base, byMetric, daysInRange, rangeViolation, error, durationMs: Date.now() - startedAt };
  }

  await recordOutcome(dryRun, true, `${points.length} datapoints`, Date.now() - startedAt);

  return {
    ...base,
    ok: true,
    datapoints: points.length,
    daysInRange,
    byMetric,
    written: rows.length,
    rangeViolation,
    durationMs: Date.now() - startedAt,
  };
}

/** Read stored rows for the same (metric, date) keys and report value changes. */
async function diffAgainstStore(
  store: SupabaseClient,
  points: MetricPoint[],
): Promise<{ metric: string; date: string; from: number; to: number }[]> {
  if (points.length === 0) return [];
  const dates = points.map((p) => p.date).sort();
  const existing = await selectMetrics(store, dates[0], dates[dates.length - 1]);

  const stored: Record<string, number> = {};
  for (const row of existing) stored[`${row.metric}|${row.metric_date}`] = row.value;

  const changes: { metric: string; date: string; from: number; to: number }[] = [];
  for (const p of points) {
    const prev = stored[`${p.metric}|${p.date}`];
    if (prev !== undefined && prev !== p.value) {
      changes.push({ metric: p.metric, date: p.date, from: prev, to: p.value });
    }
  }
  return changes;
}

export interface StoredMetricRow {
  metric: string;
  metric_date: string;
  value: number;
}

/**
 * Read stored rows for a date range, paging past PostgREST's row cap.
 *
 * ⚠ PostgREST caps a response at `db-max-rows` (1000 by default). A 90-day read
 * of all 7 metrics is ~630 rows and works; a 365-day read is ~2555 and silently
 * truncates — and fewer rows render as a smaller total, i.e. it looks like a
 * real decline. `.limit()` alone does not lift the cap, so this pages.
 */
export async function selectMetrics(
  store: SupabaseClient,
  fromIso: string,
  toIso: string,
): Promise<StoredMetricRow[]> {
  const PAGE = 1000;
  const out: StoredMetricRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await store
      .from(TABLE)
      .select('metric, metric_date, value')
      .gte('metric_date', fromIso)
      .lte('metric_date', toIso)
      .order('metric_date', { ascending: true })
      .order('metric', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data || []) as StoredMetricRow[];
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

export interface SyncStateRow {
  location_id: string;
  covered_from: string | null;
  covered_to: string | null;
  last_ok_at: string | null;
  last_error: string | null;
}

/** Read the coverage row, which is the only honest freshness signal. */
export async function readSyncState(store: SupabaseClient): Promise<SyncStateRow | null> {
  const { data, error } = await store
    .from(STATE_TABLE)
    .select('location_id, covered_from, covered_to, last_ok_at, last_error')
    .eq('location_id', GBP_LOCATION_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SyncStateRow) || null;
}

async function writeSyncState(
  store: SupabaseClient,
  windows: Window[],
  error: string | null,
): Promise<void> {
  const from = windows.reduce((a, w) => (w.from < a ? w.from : a), windows[0].from);
  const to = windows.reduce((a, w) => (w.to > a ? w.to : a), windows[0].to);

  const patch: Record<string, unknown> = {
    location_id: GBP_LOCATION_ID,
    updated_at: new Date().toISOString(),
    last_error: error,
  };
  // Coverage is only advanced by a run that actually wrote, so a failed pull
  // cannot claim to have covered a window it did not.
  if (!error) {
    patch.covered_from = from;
    patch.covered_to = to;
    patch.last_ok_at = new Date().toISOString();
  }

  const { error: upsertError } = await store
    .from(STATE_TABLE)
    .upsert(patch, { onConflict: 'location_id', ignoreDuplicates: false });
  if (upsertError) throw new Error(upsertError.message);
}

/**
 * Record the pull outcome on the shared pipeline log, so a stall goes red.
 *
 * This is why `'gbp'` was added to `PipelineChannel`: the row appears per-channel
 * in `/api/health/lead-pipeline`, and a failure also pushes a fleet-ingest alert
 * to the owner's hub with no new plumbing. Note the alert's own summary text is
 * worded for leads ("Lead pipeline gbp failed in gbp-sync …") because that
 * emitter is shared — the channel name is what identifies it as this pull.
 *
 * A dry run records nothing anywhere, by definition.
 */
async function recordOutcome(
  dryRun: boolean,
  ok: boolean,
  detail: string,
  durationMs: number,
): Promise<void> {
  if (dryRun) return; // a dry run must leave no trace anywhere
  await recordPipelineEvent({
    source: 'gbp-sync',
    channel: 'gbp',
    ok,
    detail,
    durationMs,
  });
}

export const GBP_DEFAULTS = {
  lookbackDays: DEFAULT_LOOKBACK_DAYS,
  backfillDays: DEFAULT_BACKFILL_DAYS,
};
