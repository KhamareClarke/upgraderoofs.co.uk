/**
 * optimize-pseo-boilerplate.ts
 *
 * pSEO optimisation pass (#14) — three changes, all deterministic (no
 * Math.random / Date.now, to avoid React hydration mismatches under Next.js
 * SSR):
 *
 *   1. CENTRALISE PHONE NUMBERS — replace every hardcoded phone variant
 *      (tel:01270897606, "01270 897606", "01270 897 606") in the programmatic
 *      town/matrix templates and data with PHONE_DISPLAY imported from
 *      lib/contact.ts (the single source of truth — see
 *      [[project_contact_tracking]]).
 *
 *      In `<TrackedPhoneLink>` the href is DELETED rather than repointed at
 *      PHONE_TEL: the component defaults to the live number, which is what lets
 *      Google's call-tracking swap reach it. A static href dials fine and is
 *      untrackable — the failure is invisible in every grep for `tel:`.
 *      PHONE_TEL therefore has no remaining consumer in these templates and is
 *      not imported.
 *
 *   2. DIFFERENTIATE SHARED SOLUTION STRINGS — stop the 90 service×town matrix
 *      pages rendering the byte-identical ServiceData.description everywhere.
 *      Introduce a deterministic, town-aware "solution paragraph" generator
 *      that folds the town's local geography / property styles into the
 *      service description, so each service×town combo reads distinct.
 *
 *   3. VARY TRUST & QUICK-ANSWER BOILERPLATE — rotate the shared trust bullets
 *      and quick-answer phrasing deterministically (keyed on town slug + a
 *      stable string hash) so not every page carries word-for-word identical
 *      "127+ five-star reviews" / "free written quote" framing.
 *
 * Changes are written directly to source files, so the script is transparent
 * about exactly what it edits. Run with: npx tsx scripts/optimize-pseo-boilerplate.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Deterministic string hash — stable across runs and across builds. FNV-1a.
// ---------------------------------------------------------------------------
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count += 1;
    idx += needle.length;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Task 1 — centralise phone numbers.
// ---------------------------------------------------------------------------

function addNamedImport(
  source: string,
  importPath: string,
  names: string[],
): { source: string; changed: boolean } {
  const alreadyHas = names.some((n) => source.includes(n));
  const importLine = `import { ${names.join(', ')} } from '${importPath}';`;
  if (alreadyHas) {
    return { source, changed: false };
  }
  const firstImport = source.match(/^import\s+.*$/m);
  if (firstImport) {
    const idx = firstImport.index! + firstImport[0].length;
    return {
      source: source.slice(0, idx) + '\n' + importLine + source.slice(idx),
      changed: true,
    };
  }
  return { source: importLine + '\n' + source, changed: true };
}

function centralisePhonesInComponents(): void {
  // ---- AreaPageTemplate.tsx ------------------------------------------------
  const areaPath = resolve(ROOT, 'components', 'AreaPageTemplate.tsx');
  let area = readFileSync(areaPath, 'utf8');
  const areaBefore = area;

  // PHONE_TEL is deliberately NOT imported: the href is dropped rather than
  // pointed at the constant, so this file would end up with an unused import.
  area = addNamedImport(area, '@/lib/contact', ['PHONE_DISPLAY']).source;

  // JSX text nodes use {PHONE_DISPLAY}; attribute href uses {PHONE_TEL}.
  // Order matters: replace the tel: attribute before the display text.
  const areaReplacements: [string, string][] = [
    // Hero highlight box
    ['📞 01270 897606', '📞 {PHONE_DISPLAY}'],
    // Hero TrackedPhoneLink (href + visible span)
    // NOTE: the href is DROPPED, not repointed at PHONE_TEL. A static
    // `href={PHONE_TEL}` renders and dials correctly but can never be swapped
    // for a Google Ads forwarding number, so it silently opts that link out of
    // call tracking while looking perfectly migrated. TrackedPhoneLink defaults
    // its href to the LIVE number; let it. Same for the visible span below —
    // see centralisePhonesInComponents' header.
    ['href="tel:01270897606" placement="area_page_hero"', 'placement="area_page_hero"'],
    ['<span className="!text-white">01270 897 606</span>', '<span className="!text-white">{PHONE_DISPLAY}</span>'],
    // Quick-answer <dd> (JSX text) — "Call 01270 897 606 for emergencies."
    ['Call 01270 897 606 for emergencies.', 'Call {PHONE_DISPLAY} for emergencies.'],
    // CTA TrackedPhoneLink
    ['href="tel:01270897606" placement="area_page_cta"', 'placement="area_page_cta"'],
    // CTA footer line
    ['Call: 01270 897 606', 'Call: {PHONE_DISPLAY}'],
  ];
  for (const [from, to] of areaReplacements) {
    area = area.split(from).join(to);
  }

  // FAQ schema (backtick template literal) — the same visible sentence needs
  // ${PHONE_DISPLAY} interpolation, not JSX braces. Handled after the JSX pass
  // because "Call 01270 897 606 for emergencies." appears once in JSX (<dd>)
  // and once in the schema template literal.
  area = area.replace(
    'Call {PHONE_DISPLAY} for emergencies.` }',
    'Call ${PHONE_DISPLAY} for emergencies.` }',
  );

  if (area === areaBefore) {
    console.warn('  ⚠ AreaPageTemplate: no phone strings changed');
  } else {
    writeFileSync(areaPath, area, 'utf8');
    console.log('  ✓ AreaPageTemplate.tsx — phones centralised');
  }

  // ---- ServiceLocationTemplate.tsx ----------------------------------------
  const svcPath = resolve(ROOT, 'components', 'ServiceLocationTemplate.tsx');
  let svc = readFileSync(svcPath, 'utf8');
  const svcBefore = svc;

  svc = addNamedImport(svc, '@/lib/contact', ['PHONE_DISPLAY']).source;

  const svcReplacements: [string, string][] = [
    ['📞 01270 897606', '📞 {PHONE_DISPLAY}'],
    // href dropped for the same reason as the area template above.
    ['href="tel:01270897606" placement="service_location_hero"', 'placement="service_location_hero"'],
    ['<span className="!text-white">01270 897 606</span>', '<span className="!text-white">{PHONE_DISPLAY}</span>'],
    ['href="tel:01270897606" placement="service_location_cta"', 'placement="service_location_cta"'],
    ['Call: 01270 897 606', 'Call: {PHONE_DISPLAY}'],
  ];
  for (const [from, to] of svcReplacements) {
    svc = svc.split(from).join(to);
  }

  if (svc === svcBefore) {
    console.warn('  ⚠ ServiceLocationTemplate: no phone strings changed');
  } else {
    writeFileSync(svcPath, svc, 'utf8');
    console.log('  ✓ ServiceLocationTemplate.tsx — phones centralised');
  }
}

function centralisePhonesInHelpers(): void {
  const helperPath = resolve(ROOT, 'lib', 'service-location-helpers.ts');
  let helper = readFileSync(helperPath, 'utf8');
  const before = helper;

  helper = addNamedImport(helper, './contact', ['PHONE_DISPLAY']).source;

  // These numbers live inside backtick template literals — interpolate.
  helper = helper
    .split('| 01270 897606')
    .join('| ${PHONE_DISPLAY}')
    .split('Call 01270 897606.')
    .join('Call ${PHONE_DISPLAY}.');

  if (helper === before) {
    console.warn('  ⚠ service-location-helpers: no phone strings changed');
  } else {
    writeFileSync(helperPath, helper, 'utf8');
    console.log('  ✓ service-location-helpers.ts — phones centralised');
  }
}

function centralisePhonesInTownData(): void {
  const townPath = resolve(ROOT, 'lib', 'town-data.ts');
  let town = readFileSync(townPath, 'utf8');
  const before = town;

  town = addNamedImport(town, './contact', ['PHONE_DISPLAY']).source;

  // FAQ "a" values are single-quoted prose strings in the shape
  //   { q: '...', a: '... Call 01270 897606 ...' },
  // Convert only those into template literals and interpolate the constant.
  // The phone appears only in these FAQ answer strings.
  town = town.replace(
    /(a: ')([^']*?01270 897606[^']*?)(')/g,
    (_m, open: string, body: string, _close: string) =>
      open.slice(0, -1) + '`' + body.replace(/01270 897606/g, '${PHONE_DISPLAY}') + '`',
  );

  if (town === before) {
    console.warn('  ⚠ town-data.ts: no phone strings changed');
  } else {
    writeFileSync(townPath, town, 'utf8');
    console.log('  ✓ town-data.ts — phones centralised');
  }
}

// ---------------------------------------------------------------------------
// Task 2 — differentiate shared solution strings on the matrix pages.
// ---------------------------------------------------------------------------

function differentiateMatrixSolutions(): void {
  const helperPath = resolve(ROOT, 'lib', 'service-location-helpers.ts');
  let helper = readFileSync(helperPath, 'utf8');
  if (helper.includes('buildServiceTownSolution')) {
    console.log('  ✓ service-location-helpers.ts — solution helper already present');
    return;
  }

  const newHelper = `// ---------------------------------------------------------------------------
// Town-aware solution paragraph. Each service×town matrix page otherwise
// renders the byte-identical ServiceData.description; this folds the town's own
// geography / property styles into a deterministic lead-in so every combo
// reads distinct (keyed on town.slug + service.slug via FNV-1a — hydration-safe).
// ---------------------------------------------------------------------------
const SOLUTION_ANGLE: ((town: TownData) => string)[] = [
  (town) =>
    \`Around \${town.town}, a \${town.propertyTypes?.[0]?.toLowerCase() ?? 'typical'} housing stock shapes much of the roofing we carry out. \${town.roofingChallenges}\`,
  (town) =>
    \`\${town.localContext} That context guides how we approach every job here.\`,
  (town) =>
    \`With \${town.landmarks?.[0] ? 'landmarks like ' + town.landmarks[0] + ' nearby' : 'the local area well known to us'}, we tailor our work to \${town.town}’s homes.\`,
  (town) =>
    \`We respond to \${town.town} addresses within \${town.emergencyResponseTime} in an emergency, and plan larger work around \${town.distanceFromBase.toLowerCase()}.\`,
];

export function buildServiceTownSolution(service: ServiceData, town: TownData): string {
  const seed = hashSlug(town.slug + '::' + service.slug);
  const angle = SOLUTION_ANGLE[seed % SOLUTION_ANGLE.length];
  return \`\${service.description} \${angle(town)}\`;
}

function hashSlug(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

`;

  const anchor = 'export function generateServiceLocationFaqs(';
  helper = helper.replace(anchor, newHelper + anchor);
  writeFileSync(helperPath, helper, 'utf8');
  console.log('  ✓ service-location-helpers.ts — added buildServiceTownSolution');
}

function wireTemplateToSolutionHelper(): void {
  const svcPath = resolve(ROOT, 'components', 'ServiceLocationTemplate.tsx');
  let svc = readFileSync(svcPath, 'utf8');
  if (svc.includes('buildServiceTownSolution')) {
    console.log('  ✓ ServiceLocationTemplate.tsx — already wired to solution helper');
    return;
  }

  // 1. Extend the existing import.
  const importRe = /import\s*\{([^}]*)\}\s*from\s*'@\/lib\/service-location-helpers';/;
  const importMatch = svc.match(importRe);
  if (!importMatch) {
    console.warn('  ⚠ ServiceLocationTemplate: import line not found; cannot wire helper');
    return;
  }
  const names = importMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!names.includes('buildServiceTownSolution')) {
    names.push('buildServiceTownSolution');
    svc = svc.replace(
      importMatch[0],
      `import { ${names.join(', ')} } from '@/lib/service-location-helpers';`,
    );
  }

  const svcBefore = svc;

  // 2. Render the solution paragraph in the main content column.
  svc = svc.replace(
    '<p>{service.description}</p>',
    '<p>{buildServiceTownSolution(service, town)}</p>',
  );

  // 3. Change the AEO answer block's first sentence to use the town-aware lead.
  svc = svc.replace(
    "{service.description.split('.')[0]}. {town.distanceFromBase}",
    "{buildServiceTownSolution(service, town).split('.')[0]}. {town.distanceFromBase}",
  );

  if (svc === svcBefore) {
    console.warn('  ⚠ ServiceLocationTemplate: solution render sites not found');
  } else {
    writeFileSync(svcPath, svc, 'utf8');
  }
  console.log('  ✓ ServiceLocationTemplate.tsx — wired to buildServiceTownSolution');
}

// ---------------------------------------------------------------------------
// Task 3 — vary trust & quick-answer boilerplate (deterministic rotation).
// ---------------------------------------------------------------------------

function varyTrustBullets(): void {
  const svcPath = resolve(ROOT, 'components', 'ServiceLocationTemplate.tsx');
  let svc = readFileSync(svcPath, 'utf8');
  if (svc.includes('TRUST_ANGLE')) {
    console.log('  ✓ ServiceLocationTemplate.tsx — trust bullets already varied');
    return;
  }

  // Deterministic rotation of the "Why Choose" bullet order, keyed on the town
  // slug. Instead of a fixed 6-bullet list, we rotate a smaller set of distinct
  // phrasings so each town leads with a different trust point. The existing
  // bullets already interpolate town data; we add a slug-keyed offset.
  const marker = 'export function ServiceLocationTemplate(';
  const injection = `const TRUST_ANGLE = [
  'CORC certified · £10M insured · 10-year workmanship guarantee',
  'Free written quotes — no pressure, no obligation',
  '25+ years serving Cheshire homeowners and businesses',
] as const;

function pickTrustAngle(slug: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % TRUST_ANGLE.length;
}

`;

  if (!svc.includes(marker)) {
    console.warn('  ⚠ ServiceLocationTemplate: trust-bullet marker not found');
    return;
  }

  svc = svc.replace(marker, injection + marker);

  // Replace the static "CORC certified · £10M insured · 10-year workmanship
  // guarantee" bullet with a slug-keyed pick from TRUST_ANGLE.
  const svcBefore = svc;
  svc = svc.replace(
    '>CORC certified · £10M insured · 10-year workmanship guarantee</span>',
    '>{TRUST_ANGLE[pickTrustAngle(town.slug)]}</span>',
  );
  svc = svc.replace(
    '>Free written quotes — no pressure, no obligation</span>',
    '>{TRUST_ANGLE[(pickTrustAngle(town.slug) + 1) % TRUST_ANGLE.length]}</span>',
  );
  svc = svc.replace(
    '>25+ years serving Cheshire homeowners and businesses</span>',
    '>{TRUST_ANGLE[(pickTrustAngle(town.slug) + 2) % TRUST_ANGLE.length]}</span>',
  );

  if (svc === svcBefore) {
    console.warn('  ⚠ ServiceLocationTemplate: trust bullet sites not found');
  } else {
    writeFileSync(svcPath, svc, 'utf8');
  }
  console.log('  ✓ ServiceLocationTemplate.tsx — trust bullets varied (slug-keyed)');
}

function varyQuickAnswers(): void {
  const areaPath = resolve(ROOT, 'components', 'AreaPageTemplate.tsx');
  let area = readFileSync(areaPath, 'utf8');
  if (area.includes('QA_ANGLE')) {
    console.log('  ✓ AreaPageTemplate.tsx — quick-answer rotation already present');
    return;
  }

  const marker = 'export function AreaPageTemplate(';
  const injection = `const QA_ANGLE = [
  'a rapid, no-fuss solution',
  'a reliable, long-lasting fix',
  'a tidy, high-quality result',
  'peace of mind backed by a written warranty',
] as const;

function pickQaAngle(town: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < town.length; i += 1) {
    h ^= town.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % QA_ANGLE.length;
}

`;

  if (!area.includes(marker)) {
    console.warn('  ⚠ AreaPageTemplate: quick-answer marker not found');
    return;
  }

  area = area.replace(marker, injection + marker);

  // Vary the free-quote phrasing in the AEO answer block by town. Anchor on the
  // static tail of the AEO paragraph.
  const areaBefore = area;
  area = area.replace(
    'with free written quotes and a 10-year workmanship guarantee.',
    'with {QA_ANGLE[pickQaAngle(town)]} and a 10-year workmanship guarantee.',
  );

  if (area === areaBefore) {
    console.warn('  ⚠ AreaPageTemplate: quick-answer site not found');
  } else {
    writeFileSync(areaPath, area, 'utf8');
  }
  console.log('  ✓ AreaPageTemplate.tsx — quick-answer phrasing varied (town-keyed)');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main(): void {
  console.log('Optimising pSEO boilerplate (deterministic)...\n');

  console.log('Task 1 — centralise phone numbers');
  centralisePhonesInComponents();
  centralisePhonesInHelpers();
  centralisePhonesInTownData();

  console.log('\nTask 2 — differentiate shared solution strings');
  differentiateMatrixSolutions();
  wireTemplateToSolutionHelper();

  console.log('\nTask 3 — vary trust & quick-answer boilerplate');
  varyTrustBullets();
  varyQuickAnswers();

  console.log('\nDone.');
}

main();
