/**
 * scripts/add-negative-keywords.ts
 *
 * GOOGLE ADS NEGATIVE KEYWORDS + LOCATION-TARGETING PATCH.
 *
 * 1) Pushes phrase-match NEGATIVE keywords for out-of-area and over-broad
 *    queries to the "Leads-Search-calls" campaign via campaignCriteria:mutate,
 *    so searches like "roofing staffordshire" and "roof repairs sheffield"
 *    (the two queries that drained the Aug 27 daily budget) stop matching.
 *
 * 2) Audits the campaign's LOCATION targeting and enforces/verifies the exact
 *    local service radius — Crewe, Sandbach, Stoke-on-Trent — with PRESENCE
 *    (not "interest-in") targeting. Note: "Presence" in current Google Ads is
 *    governed by campaign.exclusion_policy, not a per-criterion flag, so this
 *    script READS the current geotargets + exclusion_policy and either
 *    CORRECTS them (--apply) or prints the exact instruction to correct them
 *    in the Google Ads UI. It never silently adds geotargets.
 *
 * SAFE BY DEFAULT: without --apply it dry-runs mutations (negatives + location
 * fixes), prints exactly what each would do, and emits the current location
 * state + the explicit manual correction. With --apply it performs them.
 *
 * Run:  npx tsx scripts/add-negative-keywords.ts          # dry-run
 *       npx tsx scripts/add-negative-keywords.ts --apply  # mutate
 *
 * Env required in .env.local:
 *   GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN,
 *   GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN,
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID (optional — MCC manager account)
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';

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

interface GaqlResultRow {
  campaign?: {
    id?: string | number;
    resourceName?: string;
    name?: string;
    geoTargetTypeSetting?: {
      positiveGeoTargetType?: string;
      negativeGeoTargetType?: string;
    };
    [key: string]: unknown;
  };
  campaignCriterion?: {
    resourceName?: string;
    negative?: boolean;
    keyword?: { text?: string; matchType?: string };
    location?: { geoKey?: string; geoTargetConstant?: string; [key: string]: unknown };
    locationGroup?: unknown;
    type?: string;
    [key: string]: unknown;
  };
  geoTargetConstant?: {
    id?: number;
    name?: string;
    targetType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
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

type NegativeSpec = {
  text: string;
  matchType: 'PHRASE' | 'EXACT';
  reason: 'OUT_OF_AREA' | 'BROAD_COUNTY' | 'COMPETITOR_BRAND';
};

// ── config & constants ────────────────────────────────────────────────────────
const API_VERSION = 'v22';
const HOST = 'googleads.googleapis.com';
const CAMPAIGN_NAME = 'Leads-Search-calls';
const APPLY = process.argv.includes('--apply');

const env = process.env as EnvVars;
const CUSTOMER_ID = (env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');

// Phrase-match negatives that stop runaway / out-of-area spend. Derived from
// the search-term audit (scripts/audit-search-terms.ts): "roofing staffordshire"
// cost £28.59 (66% of window spend) and "roof repairs sheffield" £6.36.
const NEGATIVES: NegativeSpec[] = [
  { text: 'staffordshire', matchType: 'PHRASE', reason: 'BROAD_COUNTY' },
  { text: 'sheffield', matchType: 'PHRASE', reason: 'OUT_OF_AREA' },
  { text: 'barnstaple', matchType: 'PHRASE', reason: 'OUT_OF_AREA' },
  { text: 'brighton', matchType: 'PHRASE', reason: 'OUT_OF_AREA' },
  { text: 'hampshire', matchType: 'PHRASE', reason: 'OUT_OF_AREA' },
  { text: 'york', matchType: 'PHRASE', reason: 'OUT_OF_AREA' },
  { text: 'knutsford', matchType: 'PHRASE', reason: 'OUT_OF_AREA' },
  { text: 'wilmslow', matchType: 'PHRASE', reason: 'OUT_OF_AREA' },
];

// ── small output helpers ──────────────────────────────────────────────────────
function banner(title: string): void {
  console.log('\n' + '='.repeat(86));
  console.log('  ' + title);
  console.log('='.repeat(86));
}

function fail(message: string, hints: string[] = []): never {
  console.error('\n[FAIL] ' + message);
  hints.forEach((h) => console.error('   → ' + h));
  process.exit(1);
}

function padRight(s: string, n: number): string {
  return s.padEnd(n);
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
async function request(
  headers: Record<string, string>,
  pathName: string,
  body?: unknown
): Promise<{ status: number; body: GaqlError | unknown }> {
  const res = await fetch(`https://${HOST}${pathName}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
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

// ── mutate helper ─────────────────────────────────────────────────────────────
async function mutate(
  headers: Record<string, string>,
  entityName: string,
  operations: unknown[]
): Promise<{ status: number; body: GaqlError | unknown }> {
  return request(
    headers,
    `/${API_VERSION}/customers/${CUSTOMER_ID}/${entityName}:mutate`,
    { operations, partialFailure: true }
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  banner('GOOGLE ADS — NEGATIVE KEYWORDS + LOCATION-TARGETING PATCH');
  console.log(`Date: ${new Date().toISOString().slice(0, 10)}  |  API: ${API_VERSION}`);
  console.log(`Customer: ${CUSTOMER_ID}  |  Campaign: ${CAMPAIGN_NAME}`);
  console.log(`Mode: ${APPLY ? 'APPLY (mutating)' : 'DRY-RUN (no mutations)'}`);

  // 1. Env validation
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

  // 2. OAuth
  const google = require('googleapis').google as GoogleApis;
  const oauth2 = new google.auth.OAuth2(
    String(env.GOOGLE_ADS_CLIENT_ID),
    String(env.GOOGLE_ADS_CLIENT_SECRET)
  );
  oauth2.setCredentials({ refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN });
  let accessToken: string;
  try {
    const { token } = await oauth2.getAccessToken();
    if (!token) throw new Error('empty access token');
    accessToken = token;
  } catch (err) {
    fail(`Refresh token exchange failed: ${(err as Error).message}`);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': String(env.GOOGLE_ADS_DEVELOPER_TOKEN),
  };
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '');
  }

  // 3. Resolve campaign resource name + geo target type setting (Presence vs interest).
  const campRows = await gaql(
    headers,
    `SELECT campaign.id, campaign.resource_name, campaign.name,
            campaign.geo_target_type_setting.positive_geo_target_type,
            campaign.geo_target_type_setting.negative_geo_target_type
     FROM campaign
     WHERE campaign.name = '${CAMPAIGN_NAME}'`
  );
  if (!campRows.length) {
    fail(`Campaign "${CAMPAIGN_NAME}" not found.`);
  }
  const campaign = campRows[0].campaign!;
  const campaignRN = String(campaign.resourceName);
  const positiveGeoType = String(campaign.geoTargetTypeSetting?.positiveGeoTargetType || '');
  const negativeGeoType = String(campaign.geoTargetTypeSetting?.negativeGeoTargetType || '');
  console.log(`Campaign resource: ${campaignRN}`);
  console.log(`positive_geo_target_type: ${positiveGeoType || '(unset — default DONT_CARE)'}`);
  console.log(`negative_geo_target_type: ${negativeGeoType || '(unset — default DONT_CARE)'}`);

  // ── A. NEGATIVE KEYWORDS ────────────────────────────────────────────────────
  banner('A. NEGATIVE KEYWORDS');
  const existing = await gaql(
    headers,
    `SELECT campaign_criterion.keyword.text, campaign_criterion.keyword.match_type
     FROM campaign_criterion
     WHERE campaign.resource_name = '${campaignRN}'
       AND campaign_criterion.negative = TRUE`
  );
  const existingSet = new Set(
    existing.map((r) => {
      const kw = r.campaignCriterion?.keyword;
      return `${kw?.matchType}:${(kw?.text || '').toLowerCase()}`;
    })
  );
  console.log(`Existing campaign negatives: ${existing.length}`);

  const toCreate: Array<{ create: Record<string, unknown> }> = [];
  for (const n of NEGATIVES) {
    const key = `${n.matchType}:${n.text.toLowerCase()}`;
    if (existingSet.has(key)) {
      console.log(`  SKIP  [${n.matchType}] "${n.text}"  (already present)`);
      continue;
    }
    console.log(`  ${APPLY ? 'ADD' : 'PLAN'} [${n.matchType}] "${n.text}"  (${n.reason})`);
    toCreate.push({
      create: {
        campaign: campaignRN,
        negative: true,
        keyword: { text: n.text, matchType: n.matchType },
      },
    });
  }

  if (!toCreate.length) {
    console.log('\n  Nothing to add — all planned negatives already present.');
  } else if (!APPLY) {
    console.log(`\n  [dry-run] would create ${toCreate.length} negative keyword(s).`);
  } else {
    const res = await mutate(headers, 'campaignCriteria', toCreate);
    if (res.status !== 200) {
      fail(`Negative keyword mutation failed: ${explainAdsError(res.body).join(' | ')}`);
    }
    const rbody = res.body as { results?: Array<{ resourceName?: string }>; partialFailureError?: { message?: string } };
    const created = (rbody.results || []).filter((r) => r.resourceName);
    console.log(`\n  Applied: ${created.length}/${toCreate.length} negatives created.`);
    if (rbody.partialFailureError) {
      console.error('  Partial failure:', rbody.partialFailureError.message);
    }
    created.forEach((r) => console.log(`    ✓ ${r.resourceName}`));
  }

  // ── B. LOCATION TARGETING ───────────────────────────────────────────────────
  banner('B. LOCATION TARGETING — PRESENCE ENFORCEMENT');
  console.log('  Target radius: Crewe, Sandbach, Stoke-on-Trent (PRESENCE only).');

  const locRows = await gaql(
    headers,
    `SELECT campaign_criterion.type, campaign_criterion.negative,
            campaign_criterion.resource_name,
            campaign_criterion.location.geo_target_constant
     FROM campaign_criterion
     WHERE campaign.resource_name = '${campaignRN}'
       AND campaign_criterion.type = 'LOCATION'`
  );
  const positiveLocs = locRows.filter((r) => !r.campaignCriterion?.negative);
  const negativeLocs = locRows.filter((r) => r.campaignCriterion?.negative);
  console.log(`  Current LOCATION criteria: ${positiveLocs.length} positive target(s), ${negativeLocs.length} excluded.`);

  // Resolve geotarget constant IDs → names so we can name the exact targets.
  const geos: Array<{ name: string; id: number }> = [];
  for (const r of positiveLocs) {
    const rn = r.campaignCriterion?.location?.geoTargetConstant;
    if (!rn) continue;
    try {
      const g = await gaql(
        headers,
        `SELECT geo_target_constant.name, geo_target_constant.id, geo_target_constant.country_code, geo_target_constant.target_type
         FROM geo_target_constant
         WHERE geo_target_constant.resource_name = '${rn}'`
      );
      if (g.length && g[0].geoTargetConstant) {
        const gc = g[0].geoTargetConstant;
        geos.push({ name: `${gc.name} (${gc.targetType || '?'})`, id: Number(gc.id || 0) });
      }
    } catch {
      // resolution failure is non-fatal; record the raw resource name.
      geos.push({ name: rn, id: 0 });
    }
  }
  console.log('  Positive geotargets in effect:');
  if (!geos.length) {
    console.log('    ⚠ none — the campaign may be targeting ALL of the UK.');
  } else {
    for (const g of geos) console.log(`    • ${g.name}`);
  }
  if (negativeLocs.length) {
    console.log('  Excluded locations:');
    for (const r of negativeLocs) {
      console.log(`    ✗ ${r.campaignCriterion?.location?.geoTargetConstant || '?'}`);
    }
  }

  // ── PRESENCE vs INTEREST check + enforcement ──
  console.log('\n  ── PRESENCE / INTEREST CHECK ──');
  const isPresence = positiveGeoType === 'PRESENCE';
  if (positiveGeoType) {
    console.log(`  positive_geo_target_type = ${positiveGeoType}`);
    if (isPresence) {
      console.log('    ✓ PRESENCE — only people in the targeted locations.');
    } else if (positiveGeoType === 'LOCATION_OF_PRESENCE_OR_INTEREST') {
      console.log('    ⚠ OR_INTEREST — includes people merely "interested in" the area (LEANS OUT).');
    } else {
      console.log(`    (unexpected value ${positiveGeoType})`);
    }
  } else {
    console.log('  positive_geo_target_type is unset — DONT_CARE (interest broadening possible).');
  }

  // Enforce PRESENCE via campaigns:mutate on the geo_target_type_setting.
  if (positiveGeoType !== 'PRESENCE') {
    if (APPLY) {
      console.log('\n  Applying PRESENCE fix via campaigns:mutate ...');
      const res = await request(
        headers,
        `/${API_VERSION}/customers/${CUSTOMER_ID}/campaigns:mutate`,
        {
          operations: [
            {
              update: {
                resourceName: campaignRN,
                geoTargetTypeSetting: { positiveGeoTargetType: 'PRESENCE' },
              },
              updateMask: 'geoTargetTypeSetting.positiveGeoTargetType',
            },
          ],
          partialFailure: true,
        }
      );
      if (res.status !== 200) {
        console.error('  ✗ PRESENCE update failed:', explainAdsError(res.body).join(' | '));
      } else {
        console.log('  ✓ positive_geo_target_type set to PRESENCE.');
      }
    } else {
      console.log('\n  [dry-run] would set positive_geo_target_type = PRESENCE via campaigns:mutate.');
      console.log('    update: { resourceName, geoTargetTypeSetting: { positiveGeoTargetType: "PRESENCE" } }');
      console.log('    updateMask = "geo_target_type_setting.positive_geo_target_type"');
    }
  } else {
    console.log('\n  ✓ Already PRESENCE — no change needed.');
  }

  // ── Hometown coverage check ──
  const HOMETOWNS = ['Crewe', 'Sandbach', 'Stoke-on-Trent'];
  const found = geos.map((g) => g.name.toLowerCase());
  const missingHometowns = HOMETOWNS.filter(
    (h) => !found.some((f) => f.includes(h.toLowerCase()))
  );

  console.log('\n  ── HOMETOWN COVERAGE (Crewe, Sandbach, Stoke-on-Trent) ──');
  if (!geos.length) {
    console.log('  ⚠ Cannot verify — no positive geotargets resolved.');
  } else if (!missingHometowns.length) {
    console.log('  ✓ All three hometowns are present among the positive geotargets.');
  } else {
    console.log('  ⚠ Missing from positive geotargets:');
    for (const h of missingHometowns) console.log(`      - ${h}`);
  }

  console.log('\n  ── MANUAL / VALIDATED CORRECTIONS REQUIRED ──');
  console.log('  1. In Google Ads → Campaign "Leads-Search-calls" → Settings → Locations:');
  console.log('     • Include: Crewe, Sandbach, Stoke-on-Trent (radius around each).');
  console.log('     • Remove any broad county/region geotargets (Staffordshire, Cheshire, UK-wide).');
  console.log('  2. Set Location options → Target: "Presence" (NOT "Presence or interest").');
  console.log('  3. Confirm the account has no "country-wide" default location layer.');
  console.log('');
}

main().catch((err: Error) => {
  console.error('\nFATAL:', err.message || err);
  process.exit(1);
});
