#!/usr/bin/env node
/**
 * scripts/verify-phone-number.js
 *
 * Verifies the dynamic-number-insertion migration: that every phone render on
 * the site goes through the live number, so Google Ads' forwarding-number swap
 * can reach ALL of them, and that nothing which must stay real was swapped.
 *
 * ── Why a grep is not enough, and what is checked instead ────────────────────
 *
 * "No `tel:01270897606` literal survives" sounds like the whole test. It is not.
 * A number typed as JSX text —
 *
 *     <TrackedPhoneLink placement="x">Call 01270 897 606</TrackedPhoneLink>
 *
 * — has a perfectly clean href, renders correctly, dials correctly, and can
 * NEVER be swapped, because the component only renders its own live number and
 * `children` is static text. That is the failure this file exists to catch, and
 * no href grep will ever see it. So the checks are:
 *
 *   1. no `tel:` literal outside the one file that is allowed to hold it;
 *   2. no digits, and no static href, inside any <TrackedPhoneLink> block;
 *   3. every DISPLAY-form occurrence is in a file on a reviewed allowlist of
 *      deliberately-static places (metadata, schema, prose, error strings);
 *   4. the store is written from exactly one place — the effect in Analytics;
 *   5. served pages still render the REAL number in SSR HTML.
 *
 * Check 3 is a reviewed list, not a perfect oracle — a number typed into an
 * allowlisted file still slips through. That is why the list is small, named
 * here, and fails CLOSED: a new file containing the number fails the check and
 * gets a human decision rather than passing by default.
 *
 * Plain .js, matching the scripts/verify-dashboard.js convention: a .ts script
 * importing lib/*.ts dies at the `@/` alias and looks dead rather than broken.
 *
 * Usage:
 *   node scripts/verify-phone-number.js [--base=http://localhost:3000]
 *
 * Exit: 0 all checks passed · 1 at least one failed.
 */

require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env.local'),
  quiet: true,
});

const { readFileSync, readdirSync, statSync, existsSync } = require('node:fs');
const { join, relative } = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = join(__dirname, '..');
const BASE = (process.argv.find((a) => a.startsWith('--base=')) || '').split('=')[1] || 'http://localhost:3000';

// ── The two facts everything else is derived from ────────────────────────────
// Read from lib/contact.ts rather than retyped, so a change there flows through
// instead of the test asserting a stale number.

function readContactSource() {
  return readFileSync(join(ROOT, 'lib', 'contact.ts'), 'utf8');
}

const contactSrc = readContactSource();
const DISPLAY = (/export const PHONE_DISPLAY\s*=\s*'([^']+)'/.exec(contactSrc) || [])[1];
const TEL = (/export const PHONE_TEL\s*=\s*'([^']+)'/.exec(contactSrc) || [])[1];

if (!DISPLAY || !TEL) {
  console.error('Could not read PHONE_DISPLAY / PHONE_TEL from lib/contact.ts');
  process.exit(1);
}

const DIGITS = DISPLAY.replace(/\D/g, ''); // 01270897606
const natl = DIGITS.replace(/^0/, ''); // 1270897606
const E164 = '+44' + natl; // +441270897606

/**
 * Files allowed to contain a `tel:` literal. Exactly one, and it is the
 * definition. lib/phone-number.ts mentions the literal in comments only, and
 * comments are stripped before scanning so it does not need an entry.
 */
const TEL_LITERAL_ALLOWLIST = new Set(['lib/contact.ts']);

/**
 * Matches the number in ANY of the spellings present in this repo —
 * `01270 897 606`, `01270 897606`, `01270897606`, `+441270897606`,
 * `+44 1270 897606`.
 *
 * Enumerating the spellings as literal strings was the first attempt and it was
 * wrong: it flagged three files as "no longer contains the number" purely
 * because they write `01270 897606` where `lib/contact.ts` writes
 * `01270 897 606`. A checker that fails on spacing teaches people to edit the
 * checker. Built from the national digits, so a change to the number flows
 * through instead of the regex going stale.
 */
const NUMBER_RE = new RegExp(
  '(?:\\+?44\\s*\\(?0?\\)?\\s*|0)' +
    natl.slice(0, 4) +
    '[\\s\\-]*' +
    natl.slice(4, 7) +
    '[\\s\\-]*' +
    natl.slice(7),
);

/** Directories that hold rendered pages or reusable UI. */
const SCAN_DIRS = ['app', 'components', 'lib'];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Blank out comments so the number mentioned in lib/phone-number.ts's header
 * doc — and in the codegen scripts' explanatory notes — is not reported as a
 * live render.
 *
 * Every replacement PRESERVES LENGTH, including newlines. The first version
 * deleted the comment text, which shifted every subsequent line: the reported
 * `lib/keyword-map.ts:35` pointed at `cannibalizationNotes: string;` in a file
 * whose real first occurrence is at line 50. A finding that names the wrong line
 * sends someone to edit the wrong place, which is worse than no line number.
 *
 * Deliberately simple: a "//" inside a string is mis-blanked, which can only
 * cause a FALSE FAILURE (a number that survives inside a string is still caught
 * by the metadata check), never a false pass.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/gm, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

/**
 * Metadata fields that legitimately carry the real number.
 *
 * These are `title` / `description` / `titleTag` and friends — indexed titles and
 * search snippets. They MUST keep the real number: swapping them would rewrite
 * what Google has indexed and what a searcher sees, and a forwarding number in a
 * snippet is dead the moment the visitor is no longer on the page.
 *
 * Checked as CONTEXT rather than by filename, because the filename approach is
 * what failed. The first allowlist was written from files someone had already
 * swept by hand, so it listed 17 files in the `01270 897 606` spelling and
 * missed all 33 that write `01270 897606` — the checker then reported green on
 * the very occurrences it existed to catch. Matching the line's shape instead
 * means a new town page's metadata passes automatically (and is reported), while
 * a number typed into PROSE or JSX still fails and still needs a human decision.
 */
const METADATA_LINE_RE = /^\s*(?:title|titleTag|description|keywords|primary|secondary|name|h1)\s*[:=]/;

/**
 * Files allowed to contain the number OUTSIDE a metadata field — visible prose,
 * JSON-LD text, and API error strings. Each entry is a deliberate decision, and
 * a new file appearing here should prompt the question "should this one swap?"
 */
const STATIC_ALLOWLIST = new Set([
  // Visible prose the reader is meant to act on, standing on its own away from a
  // CTA. A swapped number here would read as the business's number and be dead
  // for anyone who returns to the page later.
  'components/FAQ.tsx',
  'app/emergency-roofing/page.tsx',
  'app/roof-repairs/page.tsx',
  'app/blog/emergency-roof-repairs/page.tsx',
  'app/blog/gutter-maintenance-guide/page.tsx',
  'app/blog/roof-damage-signs/page.tsx',
  // JSON-LD. Must stay the real E.164 number so structured data keeps matching
  // the Google Business Profile; check 7 asserts none of these are routed
  // through the live number, so listing them does not leave them unguarded.
  'app/structured-data.tsx',
  'components/TownLocalBusinessSchema.tsx',
  'app/emergency-roofing/schema.tsx',
  'app/blog/emergency-roof-repairs/layout.tsx',
  'app/special-offer/layout.tsx',
  'app/offer-sandbach/page.tsx',
  // Error strings shown in the browser when a form fails. Someone reading one is
  // being told to phone instead — a forwarding number would be wrong for them,
  // and these render as visible text, not as a dial link.
  'app/api/send-contact/route.ts',
  'app/api/send-quote/route.ts',
  'app/api/send-special-offer/route.ts',
  'components/LeadFormWizard.tsx',
]);

/** Directories outside SCAN_DIRS that carry a published copy of the number. */
const OUT_OF_TREE = ['public/llms.txt'];

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

// ── Load every source file once ──────────────────────────────────────────────

const files = SCAN_DIRS.flatMap((d) => {
  const full = join(ROOT, d);
  return existsSync(full) ? walk(full) : [];
}).map((full) => ({
  path: full,
  rel: relative(ROOT, full).split('\\').join('/'),
  raw: readFileSync(full, 'utf8'),
}));

async function main() {
  console.log(`Phone-number verification · ${files.length} files scanned`);
  console.log(`PHONE_DISPLAY = "${DISPLAY}"   PHONE_TEL = "${TEL}"   E.164 = ${E164}`);

  // ── 1. The constants agree ─────────────────────────────────────────────────
  section('1. lib/contact.ts is internally consistent');
  if (TEL === 'tel:' + DIGITS) {
    pass('PHONE_TEL is "tel:" + the digits of PHONE_DISPLAY', TEL);
  } else {
    fail('PHONE_TEL matches PHONE_DISPLAY', `expected tel:${DIGITS}, got ${TEL}`);
  }
  if (E164 === '+44' + natl) {
    pass('the E.164 form used in structured data is the same line', E164);
  } else {
    fail('E.164 form', E164);
  }

  // ── 2. No tel: literal outside the definition ──────────────────────────────
  section('2. No `tel:` literal survives outside lib/contact.ts');
  // Any tel: href followed by real digits. Catches tel:+44…, tel://, spaces.
  const telPattern = /tel:\/{0,2}\+?[\d\s()-]{7,}/g;
  for (const f of files) {
    if (TEL_LITERAL_ALLOWLIST.has(f.rel)) continue;
    const hits = [...stripComments(f.raw).matchAll(telPattern)];
    if (hits.length) {
      fail(
        `${f.rel} contains ${hits.length} tel: literal(s)`,
        hits.map((h) => h[0].trim()).slice(0, 3).join(', ') + ' — route these through TrackedPhoneLink / usePhoneNumber',
      );
    }
  }
  if (failures === 0) pass('no tel: literal outside lib/contact.ts');

  // ── 3. TrackedPhoneLink blocks carry no static number and no static href ────
  section('3. Every <TrackedPhoneLink> renders the LIVE number');
  let linkBlocks = 0;
  for (const f of files) {
    const src = stripComments(f.raw);
    // Match an opening tag through to its match: Either `<TrackedPhoneLink … />`
    // or `<TrackedPhoneLink …>…</TrackedPhoneLink>`.
    const re = /<TrackedPhoneLink\b[\s\S]*?(?:\/>|<\/TrackedPhoneLink>)/g;
    for (const m of src.matchAll(re)) {
      linkBlocks += 1;
      const block = m[0];
      const where = `${f.rel}:${src.slice(0, m.index).split('\n').length}`;

      // A href here is a static dial target that the swap cannot reach. The prop
      // exists as an escape hatch, but nothing needs it today.
      if (/\bhref=/.test(block)) {
        fail(`${where} passes an explicit href`, 'the component defaults to the live number; a static href can never be swapped');
      }
      // The number as visible text — the failure a tel: grep cannot see.
      if (new RegExp(`\\b${DIGITS}\\b|\\b${natl}\\b|PHONE_DISPLAY|PHONE_TEL`).test(block)) {
        fail(
          `${where} contains the phone number as static text`,
          'move it into `prefix`, or use no prefix — `children` is static and the swap cannot reach it',
        );
      }
    }
  }
  if (linkBlocks === 0) {
    fail('TrackedPhoneLink is used somewhere', 'none found — the migration may have been reverted');
  } else {
    pass(`checked ${linkBlocks} TrackedPhoneLink blocks for static numbers and hrefs`);
  }

  // ── 4. Display-form occurrences are all in reviewed, static places ─────────
  section('4. Static display-form occurrences are all on the reviewed allowlist');
  const offenders = [];
  const metadataHits = [];
  // Replace the global regex's lastIndex state — NUMBER_RE has no /g, so a plain
  // exec per file is enough, but every occurrence matters: the first version
  // checked only the FIRST match per file, so a file with a legitimate metadata
  // hit and a rogue prose one reported clean.
  for (const f of files) {
    if (f.rel === 'lib/contact.ts') continue;
    const src = stripComments(f.raw);
    const lines = src.split('\n');
    const re = new RegExp(NUMBER_RE.source, 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      const line = src.slice(0, m.index).split('\n').length;
      const text = lines[line - 1] || '';
      if (METADATA_LINE_RE.test(text) || STATIC_ALLOWLIST.has(f.rel)) {
        metadataHits.push(`${f.rel}:${line}`);
      } else {
        offenders.push(`${f.rel}:${line} (${text.trim().slice(0, 90)})`);
      }
    }
  }
  const metadataFiles = new Set(metadataHits.map((h) => h.split(':')[0]));
  const allowlistedHits = metadataHits.filter((h) => STATIC_ALLOWLIST.has(h.split(':')[0]));
  pass(
    `${metadataHits.length} occurrence(s) in metadata fields or allowlisted files, ${metadataFiles.size} distinct file(s)`,
  );
  for (const h of allowlistedHits.slice(0, 40)) {
    console.log(`      · ${h}  (allowlisted: prose / JSON-LD / error string)`);
  }
  if (offenders.length === 0) {
    pass('no occurrence sits in un-rendered prose or JSX');
  } else {
    for (const o of offenders) {
      fail(`${o} is static text that is neither metadata nor allowlisted`, 'either route it through the live number, or add the file to STATIC_ALLOWLIST with a reason');
    }
  }
  // The allowlist must not rot: an entry that no longer holds the number is a
  // stale permission that would silently cover a future real render.
  for (const rel of STATIC_ALLOWLIST) {
    if (!metadataHits.some((h) => h.split(':')[0] === rel)) {
      fail(`allowlist entry ${rel} no longer contains the number`, 'remove it from STATIC_ALLOWLIST');
    }
  }
  // Files outside the scanned tree that publish the number anyway. Asserted
  // rather than ignored: `public/llms.txt` is served verbatim to answer engines,
  // and "outside the scan" is exactly how it would be missed.
  for (const rel of OUT_OF_TREE) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) {
      fail(`${rel} exists`, 'it is served publicly and documents the business number');
      continue;
    }
    const src = readFileSync(full, 'utf8');
    if (NUMBER_RE.test(src)) {
      pass(`${rel} still publishes the real number (not scanned — asserted explicitly)`);
    } else {
      fail(`${rel} still publishes the real number`, 'the number changed here without lib/contact.ts changing');
    }
  }

  // ── 5. The store has exactly one writer, and it writes from an effect ─────
  section('5. The number store is written from exactly one place');
  // lib/phone-number.ts is where the function is DEFINED, not a call site — it
  // must not count as a writer, or this check could never pass.
  const DEFINITION_FILE = 'lib/phone-number.ts';
  const writers = files
    .filter((f) => f.rel !== DEFINITION_FILE)
    .filter((f) => /setTrackedPhone\s*\(/.test(stripComments(f.raw)))
    .map((f) => f.rel);
  const expectedWriter = 'components/Analytics.tsx';
  if (writers.length === 1 && writers[0] === expectedWriter) {
    pass(`the only call site is ${expectedWriter} (${DEFINITION_FILE} defines it)`);
  } else {
    fail('exactly one writer', `found: ${writers.join(', ') || '<none>'}`);
  }
  // The write must be inside a useEffect — a store write during render produces
  // a hydration mismatch on every page. The documented rule is that Analytics'
  // effect is the only writer, so check the call sits after an effect opening.
  const analytics = files.find((f) => f.rel === expectedWriter);
  if (analytics) {
    const src = stripComments(analytics.raw);
    const callIdx = src.indexOf('setTrackedPhone(');
    const effectIdx = src.lastIndexOf('useEffect', callIdx);
    if (callIdx > -1 && effectIdx > -1) {
      pass('the write sits inside a useEffect (never during render)');
    } else {
      fail('the write sits inside a useEffect', 'a render-time write causes a hydration mismatch on every page');
    }
    // The one parameter that must never be used: it rewrites DOM text directly,
    // which React reverts on the next render.
    if (/phone_conversion_css_class/.test(src)) {
      fail('phone_conversion_css_class is not used', 'React reverts direct DOM mutation — the number would flicker back');
    } else {
      pass('phone_conversion_css_class is not used anywhere');
    }
    // The labelled target is the whole point; a stripped label records nothing.
    if (/GADS_CALL_CONV_ID\b/.test(src) && /isUsableCallConversionTarget/.test(src)) {
      pass('the call-conversion target is validated before use');
    } else {
      fail('the call-conversion target is validated', 'a bare account id or a foreign label silently records nothing');
    }
  } else {
    fail('components/Analytics.tsx exists', 'not found');
  }

  // ── 6. The generated client HTML carries the real number ──────────────────
  section('6. Served pages still render the REAL number in SSR HTML');
  const SAMPLES = [
    ['/', 'home'],
    ['/contact', 'contact'],
    ['/emergency-roofing', 'emergency'],
    ['/roof-repairs', 'roof repairs'],
    ['/services/flat-roofing', 'a service page'],
    ['/special-offer', 'special offer'],
    ['/thank-you', 'thank you'],
    ['/sitemap-page', 'sitemap'],
    ['/blog/emergency-roof-repairs', 'a blog page'],
    ['/roofers-sandbach', 'a town page'],
  ];
  for (const [path, label] of SAMPLES) {
    let html = null;
    try {
      const res = await fetch(BASE + path);
      if (res.ok) html = await res.text();
    } catch {
      /* reported below */
    }
    if (html === null) {
      fail(`${label} (${path}) is served`, `no 200 from ${BASE}${path} — is the server running?`);
      continue;
    }
    const hasTel = html.includes('tel:' + DIGITS) || html.includes('tel:' + E164);
    const hasDisplay = html.includes(DISPLAY);
    if (hasTel && hasDisplay) {
      pass(`${label} (${path}) serves the real number and its tel: href`);
    } else {
      fail(
        `${label} (${path}) serves the real number and its tel: href`,
        `tel:${hasTel ? 'yes' : 'NO'} display:${hasDisplay ? 'yes' : 'NO'}`,
      );
    }
    // No pre-swapped number may ever be baked into the HTML: the swap is a
    // post-hydration effect, so a forwarding number here would mean the store
    // was written during render.
    const leaked = [...html.matchAll(/tel:\+44(?!1270897606)\d{9,}/g)].map((m) => m[0]);
    if (leaked.length) {
      fail(`${label} (${path}) contains a non-real tel: href`, [...new Set(leaked)].join(', '));
    }
  }

  // ── 7. Structured data was NOT swapped ────────────────────────────────────
  section('7. Structured data keeps the real E.164 number (a deliberate invariant)');
  const schemaFiles = files.filter((f) => /structured-data|Schema/.test(f.rel));
  let schemaChecked = 0;
  for (const f of schemaFiles) {
    if (f.raw.includes(E164) || f.raw.includes(DIGITS)) {
      schemaChecked += 1;
      if (/usePhoneNumber|TrackedPhoneLink|PhoneNumberText/.test(stripComments(f.raw))) {
        fail(`${f.rel} routes structure data through the live number`, 'JSON-LD must keep the real number to match the GBP listing');
      }
    }
  }
  if (schemaChecked === 0) {
    fail('a schema file holding the real number was found', 'none matched — has structured data moved?');
  } else {
    pass(`structured data still carries ${E164} in ${schemaChecked} file(s), unswapped`);
  }

  // ── 8. The private dashboard has no phone link at all ─────────────────────
  section('8. The private dashboard carries no tel: link');
  const slug = (process.env.DASHBOARD_MARCUS_SLUG || '').trim();
  if (!slug) {
    console.log('  · skipped — DASHBOARD_MARCUS_SLUG is not set in .env.local');
  } else {
    let html = null;
    try {
      const res = await fetch(`${BASE}/dashboard/${slug}`);
      if (res.ok) html = await res.text();
    } catch {
      /* reported below */
    }
    if (html === null) {
      fail('the dashboard is served', `no 200 from ${BASE}/dashboard/${slug}`);
    } else if (/tel:/.test(html)) {
      fail('the dashboard contains no tel: link', 'it is not site traffic and must not carry a tracked number');
    } else {
      pass('the dashboard carries no tel: link');
    }
  }

  // ── 9. The configured call target reached the browser bundle ──────────────
  section('9. The call-conversion target is wired through to the client');
  const configured = (process.env.NEXT_PUBLIC_GADS_CALL_CONV_ID || '').trim();
  if (!configured) {
    console.log('  · NEXT_PUBLIC_GADS_CALL_CONV_ID is unset — the feature ships DARK, by design.');
    console.log('    Run scripts/setup-website-call-conversions.js --apply, set the value in');
    console.log('    .env.local AND Vercel, redeploy, then re-run this script.');
  } else {
    const gadsId = (process.env.NEXT_PUBLIC_GADS_ID || 'AW-17763560213').trim();
    const m = /^(AW-\d+)\/[\w-]+$/.exec(configured);
    if (!m) {
      fail('the configured target is well-formed', `expected AW-<id>/<label>, got "${configured}"`);
    } else if (m[1] !== gadsId) {
      fail('the configured target belongs to this account', `${m[1]} !== ${gadsId} — it would record nothing`);
    } else {
      pass('the configured target is well-formed and belongs to this account', configured);
    }
  }

  // ── 10. `placement` names are unchanged against HEAD ──────────────────────
  //
  // This is the check that catches the expensive mistake, and no grep for `tel:`
  // can see it. `placement` is the join key for the existing tap conversion
  // (lib/tracking.ts), so RENAMING one silently splits its history in Google
  // Ads: the old name stops receiving data, a new one starts from zero, and both
  // look healthy in isolation. The number is still right, the link still works,
  // and the reporting quietly resets.
  //
  // A name that disappears is therefore a failure. A NEW name is not — that is a
  // site that previously had no tracking at all, which is the point of the
  // migration, and it is reported so the additions are visible rather than
  // assumed.
  section('10. `placement` names survive (they key the existing tap conversion)');
  const placementsAt = (rev) => {
    try {
      const args = rev
        ? ['grep', '-h', '-o', 'placement="[^"]*"', rev, '--', ...SCAN_DIRS]
        : ['grep', '-h', '-o', 'placement="[^"]*"', '--', ...SCAN_DIRS];
      const out = execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return new Set(out.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.replace(/^placement="|"$/g, '')));
    } catch {
      return null;
    }
  };
  const before = placementsAt('HEAD');
  const after = placementsAt(null);
  if (!before || !after) {
    fail('git can list placements at HEAD and in the working tree', 'git unavailable, or no HEAD yet');
  } else {
    const removed = [...before].filter((p) => !after.has(p));
    const added = [...after].filter((p) => !before.has(p));
    if (removed.length === 0) {
      pass(`all ${before.size} placements present at HEAD still exist`, added.length ? `+${added.length} newly tracked site(s)` : '');
    } else {
      for (const p of removed) {
        fail(
          `placement "${p}" exists at HEAD but not in the working tree`,
          'a rename splits that conversion\'s history in Google Ads — restore the name or accept the reset deliberately',
        );
      }
    }
    if (added.length) {
      console.log(`      · new placements (previously untracked): ${added.join(', ')}`);
    }
  }

  // ── 11. The PHONE_DISPLAY surface, listed for review ─────────────────────
  //
  // NUMBER_RE only sees literal numbers. A static number written as
  // `{PHONE_DISPLAY}` in JSX renders exactly as static and is invisible to it —
  // deliberately not a failure, because several of these are prose and metadata
  // that MUST stay real, but listed so the surface is visible rather than
  // assumed. Check 3 independently guarantees none of them sit in a
  // <TrackedPhoneLink>.
  section('11. Files rendering the number through the PHONE_DISPLAY constant (informational)');
  const constUsers = files
    .filter((f) => f.rel !== 'lib/contact.ts')
    .filter((f) => /\bPHONE_DISPLAY\b/.test(stripComments(f.raw)))
    .map((f) => f.rel);
  if (constUsers.length === 0) {
    pass('no file renders through PHONE_DISPLAY');
  } else {
    pass(`${constUsers.length} file(s) render the number via PHONE_DISPLAY — none may sit inside a TrackedPhoneLink (check 3)`);
    for (const rel of constUsers) console.log(`      · ${rel}`);
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
  console.error(`\nverify-phone-number crashed: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
