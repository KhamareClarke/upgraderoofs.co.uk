/**
 * scripts/audit-ads-performance.ts
 *
 * GOOGLE ADS CAMPAIGN BUDGET & LOST IMPRESSION SHARE AUDIT.
 *
 * Diagnoses why campaign impressions flatlined on a specific day by pulling the
 * last 7 days of campaign performance, segmented by date, and splitting "lost
 * impression share" into its two root causes:
 *
 *   - search_budget_lost_impression_share   → lost to the DAILY BUDGET CAP
 *   - search_rank_lost_impression_share     → lost to AD RANK / competition
 *
 * NOTE ON "RAINY / HIGH-DEMAND": the Google Ads API does not expose weather.
 *   Roofing demand is weather-driven; a rainy day usually *suppresses* demand
 *   (fewer searches), while a dry/high-demand day can strain the budget cap.
 *   The script prints per-day spend vs. the cap-independent share metrics so a
 *   high budget-lost-share on a high-demand day is visibly the budget ceiling
 *   throttling delivery, not ad rank or competition.
 *
 * Auth + transport mirror the existing scripts in this repo: OAuth via the
 * `googleapis` client, GAQL queries over Google Ads REST (v22) `searchStream`.
 *
 * READ-ONLY. Writes nothing, mutates nothing.
 *
 * Run:  npx tsx scripts/audit-ads-performance.ts [days]
 *   days defaults to 7.
 *
 * Env required in .env.local:
 *   GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN,
 *   GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN,
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID (optional — MCC manager account)
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';

// Prefer an explicit .env.local load (matches other scripts); fall back to the
// ambient environment (Vercel/CI) when the file is absent.
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  dotenv.config({ path: envPath, quiet: true });
}

// ── types ─────────────────────────────────────────────────────────────────────
type OAuth2 = {
  setCredentials: (c: { refresh_token?: string }) => void;
  getAccessToken: () => Promise<{ token?: string | null }>;
};

type GoogleApis = {
  auth: {
    OAuth2: new (
      clientId: string,
      clientSecret: string,
      redirectUri?: string
    ) => OAuth2;
  };
};

// gaql() return rows are the `results` objects from searchStream, keyed by the
// top-level query entity (here, `campaign`) with `metrics`/`segments` siblings.
interface GaqlResultRow {
  campaign?: {
    resourceName?: string;
    name?: string;
    id?: string;
    status?: string;
    [key: string]: unknown;
  };
  metrics?: {
    impressions?: number;
    clicks?: number;
    costMicros?: number;
    searchBudgetLostImpressionShare?: number;
    searchRankLostImpressionShare?: number;
    [key: string]: unknown;
  };
  segments?: {
    date?: string;
    [key: string]: unknown;
  };
}

interface DayRow {
  date: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  budgetLostShare: number;
  rankLostShare: number;
  ctr: number;
  cpc: number;
}

type EnvVars = {
  GOOGLE_ADS_CUSTOMER_ID?: string;
  GOOGLE_ADS_DEVELOPER_TOKEN?: string;
  GOOGLE_ADS_CLIENT_ID?: string;
  GOOGLE_ADS_CLIENT_SECRET?: string;
  GOOGLE_ADS_REFRESH_TOKEN?: string;
  GOOGLE_ADS_LOGIN_CUSTOMER_ID?: string;
};

type GaqlErrorDetail = {
  message?: string;
  errorCode?: Record<string, unknown>;
};

type GaqlError = {
  status?: string | number;
  code?: string | number;
  message?: string;
  details?: Array<{ errors?: GaqlErrorDetail[] }>;
};

// ── config & constants ────────────────────────────────────────────────────────
const API_VERSION = 'v22';
const HOST = 'googleads.googleapis.com';

const env = process.env as EnvVars;

const CUSTOMER_ID = (env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');

function banner(title: string): void {
  console.log('\n' + '='.repeat(82));
  console.log('  ' + title);
  console.log('='.repeat(82));
}

function fail(message: string, hints: string[] = []): never {
  console.error('\n[FAIL] ' + message);
  hints.forEach((h) => console.error('   → ' + h));
  process.exit(1);
}

function gbp(micros: number): string {
  return '£' + (Number(micros || 0) / 1e6).toFixed(2);
}

function pct(a: number, b: number): string {
  return b ? ((a / b) * 100).toFixed(1) + '%' : '—';
}

/** Format a share ratio (0..1) as a percentage. */
function sharePct(v?: number): string {
  const n = Number(v || 0);
  return (n * 100).toFixed(1) + '%';
}

function padRight(s: string, n: number): string {
  return s.padEnd(n);
}

function padLeft(s: string, n: number): string {
  return s.padStart(n);
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
async function request(
  headers: Record<string, string>,
  pathName: string,
  body: unknown
): Promise<{ status: number; body: GaqlError | unknown }> {
  const res = await fetch(`https://${HOST}${pathName}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed };
}

// ── error decoding ────────────────────────────────────────────────────────────
function explainAdsError(body: unknown): string[] {
  const b = body as GaqlError;
  const errs =
    (b && b.details ? b.details.flatMap((d) => d.errors || []) : []) || [];
  if (!errs.length && b && b.message) {
    return [`${b.status || b.code}: ${b.message}`];
  }
  if (!errs.length) {
    return ['HTTP error with no parseable detail'];
  }
  return errs.map((e) => {
    const code = e.errorCode
      ? Object.entries(e.errorCode)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')
      : '';
    return `${e.message}${code ? `  [${code}]` : ''}`;
  });
}

// ── GAQL ──────────────────────────────────────────────────────────────────────
async function gaql(
  headers: Record<string, string>,
  query: string
): Promise<GaqlResultRow[]> {
  const res = await request(
    headers,
    `/${API_VERSION}/customers/${CUSTOMER_ID}/googleAds:searchStream`,
    { query }
  );
  if (res.status !== 200) {
    const lines = explainAdsError(res.body);
    throw new Error(`GAQL HTTP ${res.status}: ${lines.join(' | ')}`);
  }
  // searchStream returns either an array of batches (each with results[]) or a
  // single object with results[].
  const batches = Array.isArray(res.body)
    ? (res.body as Array<{ results?: GaqlResultRow[] }>)
    : [res.body as { results?: GaqlResultRow[] }];
  return batches.flatMap((b) => b.results || []);
}

// ── aggregation ───────────────────────────────────────────────────────────────
function rowsToDays(rows: GaqlResultRow[]): DayRow[] {
  const days: DayRow[] = [];
  for (const r of rows) {
    const m = r.metrics || {};
    const date = (r.segments && r.segments.date) || '';
    const impressions = Number(m.impressions || 0);
    const clicks = Number(m.clicks || 0);
    const costMicros = Number(m.costMicros || 0);
    const budgetLostShare = Number(m.searchBudgetLostImpressionShare || 0);
    const rankLostShare = Number(m.searchRankLostImpressionShare || 0);
    days.push({
      date,
      impressions,
      clicks,
      costMicros,
      budgetLostShare,
      rankLostShare,
      ctr: impressions ? clicks / impressions : 0,
      cpc: clicks ? costMicros / 1e6 / clicks : 0,
    });
  }
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return days;
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const rawDaysArg = process.argv[2];
  const days = rawDaysArg ? Number.parseInt(rawDaysArg, 10) : 7;
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    fail(`Invalid window "${rawDaysArg}" — pass a number of days between 1 and 90.`);
  }

  banner('GOOGLE ADS — BUDGET & LOST IMPRESSION SHARE AUDIT');
  console.log(`Date: ${new Date().toISOString().slice(0, 10)}  |  API: ${API_VERSION}`);
  console.log(`Customer: ${CUSTOMER_ID}  |  Window: last ${days} days`);
  console.log('Root-causes split: budget cap vs. ad rank/competition, per day.');

  // 1. Env vars
  const required: Array<[string, string | undefined]> = [
    ['GOOGLE_ADS_CUSTOMER_ID', env.GOOGLE_ADS_CUSTOMER_ID],
    ['GOOGLE_ADS_DEVELOPER_TOKEN', env.GOOGLE_ADS_DEVELOPER_TOKEN],
    ['GOOGLE_ADS_CLIENT_ID', env.GOOGLE_ADS_CLIENT_ID],
    ['GOOGLE_ADS_CLIENT_SECRET', env.GOOGLE_ADS_CLIENT_SECRET],
    ['GOOGLE_ADS_REFRESH_TOKEN', env.GOOGLE_ADS_REFRESH_TOKEN],
  ];
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    fail(`Missing env vars in .env.local: ${missing.join(', ')}`);
  }
  if (!/^\d{10}$/.test(CUSTOMER_ID)) {
    fail(`GOOGLE_ADS_CUSTOMER_ID "${env.GOOGLE_ADS_CUSTOMER_ID}" is not a 10-digit customer ID.`);
  }

  // 2. OAuth access token
  if (!env.GOOGLE_ADS_DEVELOPER_TOKEN || !env.GOOGLE_ADS_CLIENT_ID || !env.GOOGLE_ADS_CLIENT_SECRET) {
    fail('Missing Google Ads credential env vars.');
  }
  const google = require('googleapis').google as GoogleApis;
  const oauth2 = new google.auth.OAuth2(
    String(env.GOOGLE_ADS_CLIENT_ID),
    String(env.GOOGLE_ADS_CLIENT_SECRET)
  );
  oauth2.setCredentials({
    refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
  });
  let accessToken: string;
  try {
    const { token } = await oauth2.getAccessToken();
    if (!token) throw new Error('empty access token');
    accessToken = token;
  } catch (err) {
    fail(
      `Refresh token exchange failed: ${(err as Error).message}`,
      [
        'Refresh token may be revoked or the OAuth client rotated.',
        'Regenerate with scope: https://www.googleapis.com/auth/adwords',
      ]
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
  };
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');
  }

  // 3. Campaign-level identity + 7-day performance (already GAQL here rather
  //    than a separate account query, to keep noise down).
  const start = isoDaysAgo(days);
  const end = isoDaysAgo(0);

  let rows: GaqlResultRow[];
  try {
    rows = await gaql(
      headers,
      `SELECT campaign.resource_name, campaign.name, campaign.status,
              segments.date,
              metrics.impressions, metrics.clicks, metrics.cost_micros,
              metrics.search_budget_lost_impression_share,
              metrics.search_rank_lost_impression_share
       FROM campaign
       WHERE segments.date BETWEEN '${start}' AND '${end}'
       ORDER BY segments.date
       LIMIT 10000`
    );
  } catch (err) {
    fail(`Campaign performance query failed: ${(err as Error).message}`);
  }

  if (!rows.length) {
    console.log(`\nNo campaign data between ${start} and ${end}.\n`);
    console.log('Possible causes:');
    console.log('  • All campaigns paused/removed during the window');
    console.log('  • The credential account loses access in this date range');
    console.log('  • Account-level budget exhaustion at day start (zero eligible ads)');
    console.log('Run scripts/test-google-ads-api.js to confirm auth + account access.');
    return;
  }

  // Group segments by date across campaigns (segment.date is per row).
  const daysByDate = rowsToDays(rows);

  banner('DAILY SPEND & LOST IMPRESSION SHARE');
  const head =
    padRight('Date', 12) +
    padLeft('Impr.', 8) +
    padLeft('Clicks', 7) +
    padLeft('CTR', 7) +
    padLeft('CPC', 8) +
    padLeft('Spend', 9) +
    padLeft('Budget!', 9) +
    padLeft('Rank!', 8);
  console.log(head);
  console.log('-'.repeat(head.length));
  for (const d of daysByDate) {
    console.log(
      padRight(d.date || '(no date)', 12) +
        padLeft(String(d.impressions), 8) +
        padLeft(String(d.clicks), 7) +
        padLeft(pct(d.clicks, d.impressions), 7) +
        padLeft('£' + d.cpc.toFixed(2), 8) +
        padLeft(gbp(d.costMicros), 9) +
        padLeft(sharePct(d.budgetLostShare), 9) +
        padLeft(sharePct(d.rankLostShare), 8)
    );
  }

  const tImpr = daysByDate.reduce((s, d) => s + d.impressions, 0);
  const tClicks = daysByDate.reduce((s, d) => s + d.clicks, 0);
  const tCost = daysByDate.reduce((s, d) => s + d.costMicros, 0);
  console.log('-'.repeat(head.length));
  console.log(
    padRight('TOTAL', 12) +
      padLeft(String(tImpr), 8) +
      padLeft(String(tClicks), 7) +
      padLeft(pct(tClicks, tImpr), 7) +
      padLeft('—', 8) +
      padLeft(gbp(tCost), 9) +
      padLeft('—', 9) +
      padLeft('—', 8)
  );

  banner('DIAGNOSIS');
  // A budget-lost share that spikes sharply on a given day (relative to the
  // window median) is the budget ceiling throttling delivery, not competition.
  const flatlined = daysByDate.reduce((worst, d) =>
    !worst || d.impressions < worst.impressions ? d : worst, daysByDate[0]);

  let flatlineNote = '';
  if (flatlined) {
    const nonEmpty = daysByDate.filter((d) => d.impressions > 0);
    if (nonEmpty.length > 1) {
      const maxImpr = Math.max(...nonEmpty.map((d) => d.impressions));
      if (flatlined.impressions <= maxImpr * 0.25 && nonEmpty.length >= days - 1) {
        flatlineNote =
          `  ⚠ ${flatlined.date} impressions (${flatlined.impressions}) fell to ≤25% of the ` +
          `window peak (${maxImpr}).`;
      }
    }
  }

  let topShare: DayRow | undefined;
  let budgetDominant = false;
  for (const d of daysByDate) {
    if (!topShare) topShare = d;
    if (d.budgetLostShare > Number(topShare.budgetLostShare)) topShare = d;
  }
  if (topShare && topShare.budgetLostShare >= topShare.rankLostShare && topShare.budgetLostShare > 0) {
    budgetDominant = true;
  }

  console.log('  Legend:  "Budget!" = search_budget_lost_impression_share (daily budget cap)');
  console.log('           "Rank!"  = search_rank_lost_impression_share (ad rank vs. competition)');
  console.log('');
  if (flatlineNote) console.log(flatlineNote);
  if (flatlineNote) console.log('');
  if (budgetDominant && topShare) {
    console.log(
      `  On ${topShare.date}, budget-lost share (${sharePct(topShare.budgetLostShare)}) ` +
        `exceeds rank-lost share (${sharePct(topShare.rankLostShare)}).`
    );
    console.log(
      '  → Impressions were throttled by the DAILY BUDGET CAP, not ad rank or competition.'
    );
    console.log('  → Fix: raise the campaign daily budget, or smooth spend across days.');
  } else if (topShare && topShare.rankLostShare > 0) {
    console.log(
      `  Rank-lost share dominates on ${topShare.date} (${sharePct(topShare.rankLostShare)}).`
    );
    console.log('  → Lost to AD RANK / competition — improve Quality Score, bids, or ad relevance.');
  } else {
    console.log('  No clear budget- vs. rank-lost signal in this window.');
  }
  console.log('');
}

main().catch((err: Error) => {
  console.error('\nFATAL:', err.message || err);
  process.exit(1);
});
