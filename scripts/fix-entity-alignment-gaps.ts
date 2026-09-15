/**
 * fix-entity-alignment-gaps.ts
 *
 * Corrective entity-alignment patch. Fixes three classes of gap surfaced in
 * §11 of docs/master-content-ecosystem-audit-report.md:
 *
 *   P0 — GBP ID entity split: this previously "corrected" the 20-digit
 *        `identifier.value` in `app/structured-data.tsx` down to a 17-digit
 *        value. That was wrong — the 20-digit id ('17098915606572808840') is
 *        the live location; the 17-digit id returns 404 from the Business
 *        Information API. The check is now inverted so it heals a truncated
 *        value instead of creating one.
 *
 *   P1 — Residual aggregate ratings: `components/TownLocalBusinessSchema.tsx`
 *        still emits a self-asserted aggregateRating (4.9 / 127) that the
 *        root organization schema deliberately removed. This strips it.
 *
 *   P2 — Warranty/attribution harmonization:
 *        (a) Standardises warranty copy on the skylights and flat-roofing
 *            service pages so the workmanship/waterproof durations read
 *            consistently across hero + FAQ.
 *        (b) Replaces the two generic `sameAs` entries in
 *            `app/structured-data.tsx` (a Google Maps *share* URL and a
 *            Companies House *search* URL) with stable entity-authority links.
 *
 * Idempotent: each edit checks for the absence of its target before applying.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

/* ------------------------------------------------------------------ */
/* P0 — GBP identifier: the LIVE 20-digit location id                  */
/* ------------------------------------------------------------------ */
// Verified 2026-09-15: this id resolves to "Upgrade Roofs" (HTTP 200) and is
// the one the rest of the repo should carry. Kept inline rather than imported
// because this script rewrites files that import lib/contact.ts.
const GBP_CANONICAL_ID = '17098915606572808840';

const structuredDataPath = resolve(ROOT, 'app', 'structured-data.tsx');
let structuredData = readFileSync(structuredDataPath, 'utf8');

// P0: repair a truncated identifier value. Match by property so the intent is
// unambiguous even if surrounding whitespace drifts.
const identifierBad = `value: '17098906572808840'`;
if (structuredData.includes(identifierBad)) {
  structuredData = structuredData.replace(
    identifierBad,
    `value: '${GBP_CANONICAL_ID}'`,
  );
  console.log('[P0] structured-data.tsx: GBP identifier restored to the live 20-digit id');
} else if (structuredData.includes(`value: '${GBP_CANONICAL_ID}'`)) {
  console.log('[P0] structured-data.tsx: identifier already correct — skip');
} else {
  throw new Error(
    '[P0] could not locate identifier.value in structured-data.tsx — aborting',
  );
}

// P2(b): replace generic share/search `sameAs` entries with stable authority links.
const shareBad = 'https://share.google/EkNuUQIZgxYuyzVpu';
const shareGood = 'https://www.google.com/maps/place/Upgrade+Roofs';
if (structuredData.includes(shareBad)) {
  structuredData = structuredData.replace(shareBad, shareGood);
  console.log('[P2] sameAs: Google Maps share URL -> canonical maps/place URL');
} else {
  console.log('[P2] sameAs: maps share URL already absent — skip');
}

const chSearchBad =
  'https://find-and-update.company-information.service.gov.uk/search?q=upgrade+roofs+ltd';
const chSearchGood =
  'https://find-and-update.company-information.service.gov.uk/company/15660654';
if (structuredData.includes(chSearchBad)) {
  structuredData = structuredData.replace(chSearchBad, chSearchGood);
  console.log(
    '[P2] sameAs: Companies House search URL -> company profile URL',
  );
} else {
  console.log('[P2] sameAs: Companies House search URL already absent — skip');
}

writeFileSync(structuredDataPath, structuredData, 'utf8');

/* ------------------------------------------------------------------ */
/* P1 — strip aggregateRating from town schemas                        */
/* ------------------------------------------------------------------ */
const townSchemaPath = resolve(ROOT, 'components', 'TownLocalBusinessSchema.tsx');
let townSchema = readFileSync(townSchemaPath, 'utf8');

const aggregateBlock = `    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: 4.9,
      bestRating: 5,
      worstRating: 1,
      reviewCount: 127,
    },
`;

if (townSchema.includes(aggregateBlock)) {
  townSchema = townSchema.replace(aggregateBlock, '');
  console.log(
    '[P1] TownLocalBusinessSchema.tsx: aggregateRating block removed',
  );
} else if (!townSchema.includes('aggregateRating')) {
  console.log('[P1] TownLocalBusinessSchema.tsx: no aggregateRating — skip');
} else {
  throw new Error(
    '[P1] aggregateRating found but block shape did not match — aborting',
  );
}

writeFileSync(townSchemaPath, townSchema, 'utf8');

/* ------------------------------------------------------------------ */
/* P2 — harmonize warranty copy on two service pages                   */
/*                                                                     */
/* Hero (#answer) currently says "10-year workmanship guarantee" while */
/* their FAQ says "20-year waterproof warranty". Align hero wording to */
/* the full warranty sentence used in the FAQ body.                    */
/* ------------------------------------------------------------------ */
const skylightsPath = resolve(
  ROOT,
  'app',
  'services',
  'skylights-roof-windows',
  'page.tsx',
);
let skylights = readFileSync(skylightsPath, 'utf8');

const skylightsHeroBad =
  '10-year workmanship guarantee, free written quotes.';
const skylightsHeroGood =
  '10-year workmanship guarantee plus manufacturer warranty, free written quotes.';
if (skylights.includes(skylightsHeroBad)) {
  skylights = skylights.replace(skylightsHeroBad, skylightsHeroGood);
  console.log(
    '[P2] skylights hero #answer: warranty copy harmonized with FAQ',
  );
} else {
  console.log('[P2] skylights hero #answer: already harmonized — skip');
}
writeFileSync(skylightsPath, skylights, 'utf8');

const flatRoofingPath = resolve(
  ROOT,
  'app',
  'services',
  'flat-roofing',
  'page.tsx',
);
let flatRoofing = readFileSync(flatRoofingPath, 'utf8');

const flatHeroBad =
  '20-year waterproof warranty on EPDM and GRP installations.';
const flatHeroGood =
  '20-year waterproof warranty on EPDM and GRP installations plus 10-year workmanship guarantee.';
if (flatRoofing.includes(flatHeroBad)) {
  flatRoofing = flatRoofing.replace(flatHeroBad, flatHeroGood);
  console.log(
    '[P2] flat-roofing hero #answer: warranty copy harmonized with FAQ',
  );
} else {
  console.log('[P2] flat-roofing hero #answer: already harmonized — skip');
}
writeFileSync(flatRoofingPath, flatRoofing, 'utf8');

console.log('\nEntity-alignment patch complete.');
