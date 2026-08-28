/**
 * scripts/audit-search-terms.ts
 *
 * GOOGLE ADS SEARCH TERM AUDIT — isolate the query behind the £28.59 click.
 *
 * Pulls `search_term_view` for a fixed Aug 26–28 window and prints every search
 * term sorted by cost, descending, so a runaway broad-match term or a single
 * expensive query that drained the daily budget surfaces at the top.
 *
 * Selects: search_term_view.search_term, campaign.name, metrics.clicks,
 *          metrics.cost_micros, metrics.impressions.
 *
 * Auth + transport mirror scripts/audit-ads-performance.ts: OAuth via the
 * `googleapis` client, GAQL over Google Ads REST (v22) `searchStream`.
 *
 * READ-ONLY. Writes nothing, mutates nothing.
 *
 * Run:  npx tsx scripts/audit-search-terms.ts [startDate] [endDate]
 *   Defaults to 2026-08-26 .. 2026-08-28 (ISO YYYY-MM-DD, inclusive).
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

// gaql() return rows from searchStream are keyed by the top-level query entity
// (here `searchTermView`) with `metrics`/`campaign`/`segments` siblings.
interface GaqlResultRow {
  searchTermView?: {
    searchTerm?: string;
    resourceName?: string;
    [key: string]: unknown;
  };
  campaign?: {
    name?: string;
    [key: string]: unknown;
  };
  metrics?: {
    clicks?: number;
    costMicros?: number;
    impressions?: number;
    ctr?: number;
    [key: string]: unknown;
  };
  segments?: {
    date?: string;
    [key: string]: unknown;
  };
}

/** Aggregated search-term row (a query can appear under multiple campaigns). */
interface TermAgg {
  term: string;
  campaign: string;
  impressions: number;
  clicks: number;
  costMicros: number;
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

// Default window: Aug 26–28 (the flatline window from the performance audit).
const DEFAULT_START = '2026-08-26';
const DEFAULT_END = '2026-08-28';

// ── small output helpers ──────────────────────────────────────────────────────
function banner(title: string): void {
  console.log('\n' + '='.repeat(96));
  console.log('  ' + title);
  console.log('='.repeat(96));
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

function padRight(s: string, n: number): string {
  return s.padEnd(n);
}

function padLeft(s: string, n: number): string {
  return s.padStart(n);
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
  const batches = Array.isArray(res.body)
    ? (res.body as Array<{ results?: GaqlResultRow[] }>)
    : [res.body as { results?: GaqlResultRow[] }];
  return batches.flatMap((b) => b.results || []);
}

// ── aggregation ───────────────────────────────────────────────────────────────
function rowsToTerms(rows: GaqlResultRow[]): TermAgg[] {
  const byTerm = new Map<string, TermAgg>();
  for (const r of rows) {
    const term = (r.searchTermView && r.searchTermView.searchTerm) || '(empty)';
    const campaign = (r.campaign && r.campaign.name) || '';
    const m = r.metrics || {};
    const cur = byTerm.get(term) || {
      term,
      campaign,
      impressions: 0,
      clicks: 0,
      costMicros: 0,
    };
    cur.impressions += Number(m.impressions || 0);
    cur.clicks += Number(m.clicks || 0);
    cur.costMicros += Number(m.costMicros || 0);
    byTerm.set(term, cur);
  }
  return Array.from(byTerm.values()).sort((a, b) => b.costMicros - a.costMicros);
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const rawStart = process.argv[2];
  const rawEnd = process.argv[3];
  const start = rawStart || DEFAULT_START;
  const end = rawEnd || DEFAULT_END;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    fail(
      `Invalid date(s) "${rawStart || ''}" / "${rawEnd || ''}" — use ISO YYYY-MM-DD.`,
      ['Example: npx tsx scripts/audit-search-terms.ts 2026-08-26 2026-08-28']
    );
  }

  banner('GOOGLE ADS — SEARCH TERM COST AUDIT');
  console.log(`Date: ${new Date().toISOString().slice(0, 10)}  |  API: ${API_VERSION}`);
  console.log(`Customer: ${CUSTOMER_ID}  |  Window: ${start} .. ${end} (inclusive)`);
  console.log('Terms sorted by cost descending — runaway broad-match / outliers float to top.');

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

  // 3. search_term_view query for the window.
  let rows: GaqlResultRow[];
  try {
    rows = await gaql(
      headers,
      `SELECT search_term_view.search_term,
              campaign.name,
              metrics.clicks,
              metrics.cost_micros,
              metrics.impressions
       FROM search_term_view
       WHERE segments.date BETWEEN '${start}' AND '${end}'
       ORDER BY metrics.cost_micros DESC
       LIMIT 10000`
    );
  } catch (err) {
    fail(`Search term query failed: ${(err as Error).message}`);
  }

  if (!rows.length) {
    console.log(`\nNo search term data between ${start} and ${end}.\n`);
    console.log('Possible causes:');
    console.log('  • Zero impressions/clicks in this window');
    console.log('  • The credential account loses search-term access in this range');
    console.log('Run scripts/audit-ads-performance.ts to confirm delivery in this window.');
    return;
  }

  const terms = rowsToTerms(rows);

  banner(`TOP SEARCH TERMS BY COST (${terms.length} unique)`);
  const head =
    padRight('Search term', 52) +
    padRight('Campaign', 20) +
    padLeft('Impr.', 7) +
    padLeft('Clicks', 7) +
    padLeft('CTR', 7) +
    padLeft('CPC', 9) +
    padLeft('Cost', 10);
  console.log(head);
  console.log('-'.repeat(head.length));
  for (const t of terms) {
    console.log(
      padRight(t.term.slice(0, 51), 52) +
        padRight(t.campaign.slice(0, 19), 20) +
        padLeft(String(t.impressions), 7) +
        padLeft(String(t.clicks), 7) +
        padLeft(pct(t.clicks, t.impressions), 7) +
        padLeft('£' + (t.clicks ? t.costMicros / 1e6 / t.clicks : 0).toFixed(2), 9) +
        padLeft(gbp(t.costMicros), 10)
    );
  }

  const tImpr = terms.reduce((s, t) => s + t.impressions, 0);
  const tClicks = terms.reduce((s, t) => s + t.clicks, 0);
  const tCost = terms.reduce((s, t) => s + t.costMicros, 0);
  console.log('-'.repeat(head.length));
  console.log(
    padRight('TOTAL', 52) +
      padRight('', 20) +
      padLeft(String(tImpr), 7) +
      padLeft(String(tClicks), 7) +
      padLeft(pct(tClicks, tImpr), 7) +
      padLeft('—', 9) +
      padLeft(gbp(tCost), 10)
  );

  if (terms[0]) {
    const top = terms[0];
    banner('OUTLIER DIAGNOSIS');
    console.log(
      `  Highest-cost query: "${top.term}" — ${top.clicks} click(s), ${gbp(top.costMicros)}.`
    );
    if (top.clicks >= 1) {
      console.log(
        `  Effective CPC: ${gbp(top.costMicros / top.clicks)} (${top.impressions} impressions).`
      );
    }
    const share = tCost ? (top.costMicros / tCost) * 100 : 0;
    console.log(
      `  This one query is ${share.toFixed(1)}% of the ${gbp(tCost)} spent in the window.`
    );
    if (top.costMicros > 0 && terms[1]) {
      const second = terms[1];
      const ratio = second.costMicros ? top.costMicros / second.costMicros : Infinity;
      if (ratio >= 3) {
        console.log(
          `  ⚠ ${(ratio).toFixed(1)}× the cost of the next most expensive term ("${second.term}").`
        );
        console.log(
          '  → This term drained the daily budget — consider a phrase/exact negative, a bid ceiling, or tightening match type.'
        );
      }
    }
    console.log('');
  }
}

main().catch((err: Error) => {
  console.error('\nFATAL:', err.message || err);
  process.exit(1);
});
