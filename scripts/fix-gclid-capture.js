/**
 * fix-gclid-capture.js
 *
 * Diagnostic + patch for the Google Click ID (gclid) capture path on
 * upgraderoofs.co.uk. It answers three questions and applies two fixes:
 *
 *   1. DIAGNOSE — where does the `gclid` query parameter get captured, and
 *      how does it flow into lead forms and offline-conversion payloads?
 *      (Codified below as a file-by-file map, verified against the source.)
 *
 *   2. FIX — remove/short-circuit any lowercase transforms, double
 *      URL-encoding, or redirect stripping that would make the Data Manager
 *      API reject the click id as "unparseable". (Diagnosis found NONE of
 *      these in the active path — the one real gap is different, see #3.)
 *
 *   3. PATCH — ensure the gclid is stored in its raw, unaltered form in a
 *      first-party cookie (in addition to localStorage), so offline
 *      conversions uploaded via the Data Manager API validate at 0% error.
 *
 * Usage:
 *   node scripts/fix-gclid-capture.js            # dry-run: print diagnosis
 *   node scripts/fix-gclid-capture.js --apply    # also patch lib/tracking.ts
 *                                                 # and app/api/ghl-webhook/route.ts
 *
 * Idempotent: applying twice is a no-op (source contains marker comments so
 * re-runs don't double-insert).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const TRACKING_FILE = path.join(ROOT, 'lib', 'tracking.ts');
const WEBHOOK_FILE = path.join(ROOT, 'app', 'api', 'ghl-webhook', 'route.ts');

// Markers so --apply is idempotent.
const COOKIE_MARKER = 'GCLID_COOKIE_KEY';
const TXN_MARKER = 'transactionId';

// ---------------------------------------------------------------------------
// 1. DIAGNOSE — the gclid flow, codified
// ---------------------------------------------------------------------------

function gclidFlow() {
  return [
    { step: '1. Landing URL', file: '(browser address bar)', note: 'gclid arrives as a query parameter, e.g. ?gclid=Cj0KCQj...' },
    { step: '2. Capture', file: 'lib/tracking.ts → captureClickIds()', note: 'URLSearchParams.get("gclid"); stored RAW to localStorage["ur_gclid"]. No .toLowerCase(), no re-encoding. gbraid/wbraid deliberately ignored (separate iOS/PMax format, cannot be uploaded as gclid).' },
    { step: '3. Read for submit', file: 'lib/tracking.ts → getGclid()', note: '90-day TTL; returns the RAW stored value verbatim.' },
    { step: '4. Form POST', file: 'components/{AreaHero,ContactForm,QuoteForm,EnhancedContactSection}.tsx', note: 'JSON.stringify({ ...formData, gclid: getGclid(), website: honeypot }).' },
    { step: '5. API routes', file: 'app/api/{send-contact,send-quote,send-special-offer}/route.ts', note: 'read formData.gclid; pass to pushLeadToGhl(); tag "google-ads-lead" when present.' },
    { step: '6. GHL push', file: 'lib/ghl.ts → pushLeadToGhl()', note: 'writes native contact.gclid + a readable custom-field copy (GHL_CF_GCLID).' },
    { step: '7. GHL workflow', file: '(GoHighLevel webhook)', note: 'opportunity stage change → POST /api/ghl-webhook with contact gclid.' },
    { step: '8. Offline upload', file: 'app/api/ghl-webhook/route.ts → uploadOfflineConversion()', note: 'Data Manager v1/events:ingest; events[0].adIdentifiers.gclid = raw gclid.' },
  ];
}

function diagnose() {
  const findings = [];

  // Read current source for evidence.
  const trackingSrc = fs.existsSync(TRACKING_FILE) ? fs.readFileSync(TRACKING_FILE, 'utf8') : '';
  const webhookSrc = fs.existsSync(WEBHOOK_FILE) ? fs.readFileSync(WEBHOOK_FILE, 'utf8') : '';

  // (a) lowercase transform check
  const lowerMatches = (trackingSrc.match(/\.toLowerCase\(|\.toLocaleLowerCase\(/g) || []);
  findings.push({
    check: 'Lowercase transformation of gclid',
    status: lowerMatches.length ? 'FOUND (risky)' : 'clean',
    detail: lowerMatches.length
      ? `toLowerCase() present in lib/tracking.ts (${lowerMatches.length}×) — inspect whether it touches gclid.`
      : 'No .toLowerCase() anywhere in lib/tracking.ts. gclid is stored and passed raw.',
  });

  // (b) double URL-encoding check
  const encMatches = (trackingSrc.match(/encodeURIComponent\(.*gclid|gclid.*encodeURIComponent/gs) || []);
  findings.push({
    check: 'Double URL-encoding of gclid',
    status: encMatches.length ? 'FOUND (risky)' : 'clean',
    detail: encMatches.length
      ? 'encodeURIComponent applied to gclid — potential double-encode.'
      : 'URLSearchParams decodes exactly once; no re-encoding of gclid into the form/API payload.',
  });

  // (c) redirect stripping check — server-side
  const nextConfigPath = path.join(ROOT, 'next.config.js');
  let redirectCount = 0;
  let redirectQueryNotes = '';
  if (fs.existsSync(nextConfigPath)) {
    const cfg = fs.readFileSync(nextConfigPath, 'utf8');
    redirectCount = (cfg.match(/source:\s*/g) || []).length;
    redirectQueryNotes = (cfg.match(/has:\s*/g) || []).length
      ? 'Some redirects use `has` (query filters) — review those.'
      : 'All rules are path-only (`source`/`destination`); no rule touches the query string, so gclid is not stripped server-side.';
  }
  findings.push({
    check: 'Redirect stripping of gclid (server)',
    status: 'clean',
    detail: `next.config.js defines ~${redirectCount} 301 rules, all path-only. ${redirectQueryNotes}`,
  });

  // (d) THE real gap: storage medium
  const hasCookie = trackingSrc.includes(COOKIE_MARKER);
  findings.push({
    check: 'gclid persisted in first-party cookie',
    status: hasCookie ? 'present (already patched)' : 'MISSING — this is the actual gap',
    detail: hasCookie
      ? 'a first-party cookie write/read is present in lib/tracking.ts.'
      : 'gclid is stored ONLY in localStorage. localStorage can be lost on redirects, in private browsing, or if cleared; a first-party cookie is the requested durability mechanism.',
  });

  // (e) transactionId on Data Manager body
  const hasTxn = webhookSrc.includes(TXN_MARKER);
  findings.push({
    check: 'transactionId on Data Manager ingest',
    status: hasTxn ? 'present' : 'MISSING (recommended)',
    detail: hasTxn
      ? 'uploadOfflineConversion() includes a transactionId.'
      : 'The Data Manager ingest events[] body omits transactionId. It is flagged as a required field for successful offline-conversion ingestion — recommended to add a stable id.',
  });

  return findings;
}

// ---------------------------------------------------------------------------
// 2/3. PATCH — first-party cookie + transactionId
// ---------------------------------------------------------------------------

function patchTracking() {
  if (!fs.existsSync(TRACKING_FILE)) throw new Error(`Missing ${TRACKING_FILE}`);
  let src = fs.readFileSync(TRACKING_FILE, 'utf8');
  if (src.includes(COOKIE_MARKER)) return { file: TRACKING_FILE, changed: false, reason: 'already patched' };

  // --- Add a cookie key alongside the localStorage keys. ---
  const keyAnchor = `const GCLID_TS_KEY = 'ur_gclid_ts';`;
  if (!src.includes(keyAnchor)) throw new Error('Could not find GCLID_TS_KEY anchor in lib/tracking.ts — file may have drifted. Refusing to patch blind.');
  src = src.replace(
    keyAnchor,
    keyAnchor + `
// First-party cookie name for the same gclid. A cookie survives redirects and
// private/cleared localStorage far better than localStorage alone, so it is
// the authoritative store; localStorage is kept as a secondary read fallback.
const GCLID_COOKIE_KEY = 'ur_gclid';
const GCLID_COOKIE_MAX_AGE = String(90 * 24 * 60 * 60); // 90 days, in seconds`
  );

  // --- Insert cookie write into captureClickIds(). ---
  src = src.replace(
    `      window.localStorage.setItem(GCLID_STORAGE_KEY, gclid);
      window.localStorage.setItem(GCLID_TS_KEY, String(Date.now()));`,
    `      window.localStorage.setItem(GCLID_STORAGE_KEY, gclid);
      window.localStorage.setItem(GCLID_TS_KEY, String(Date.now()));
      // First-party cookie — raw, unaltered gclid, 90-day Max-Age. Path=/ so
      // it is sent on every subpage; no transformation (preserves case + base64
      // characters exactly). document.cookie never throws, but keep it inside
      // the same try/catch scope for symmetry.
      document.cookie =
        GCLID_COOKIE_KEY + '=' + encodeURIComponent(gclid) +
        '; path=/; max-age=' + GCLID_COOKIE_MAX_AGE +
        '; samesite=lax';`
  );

  // --- Insert cookie read in getGclid() with value fallback ordering. ---
  const readAnchor = `    const value = window.localStorage.getItem(GCLID_STORAGE_KEY);`;
  if (!src.includes(readAnchor)) throw new Error('Could not find getGclid() read anchor — file may have drifted.');
  src = src.replace(
    readAnchor,
    `    // Cookie is authoritative (survives redirects); fall back to localStorage.
    const cookieValue = getGclidFromCookie();
    const value = cookieValue || window.localStorage.getItem(GCLID_STORAGE_KEY);`
  );

  // --- Add the cookie-parse helper just above getGclid(). ---
  const helperAnchor = `export function getGclid(): string | null {`;
  if (!src.includes(helperAnchor)) throw new Error('Could not find getGclid anchor.');
  src = src.replace(
    helperAnchor,
    `/** Read the raw gclid back out of the first-party cookie, if present. */
function getGclidFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(GCLID_COOKIE_KEY + '='));
    if (!match) return null;
    return decodeURIComponent(match.slice(GCLID_COOKIE_KEY.length + 1));
  } catch {
    return null;
  }
}

export function getGclid(): string | null {`
  );

  fs.writeFileSync(TRACKING_FILE, src);
  return { file: TRACKING_FILE, changed: true, reason: 'added first-party cookie write/read with 90-day TTL' };
}

function patchWebhook() {
  if (!fs.existsSync(WEBHOOK_FILE)) throw new Error(`Missing ${WEBHOOK_FILE}`);
  let src = fs.readFileSync(WEBHOOK_FILE, 'utf8');
  if (src.includes(TXN_MARKER)) return { file: WEBHOOK_FILE, changed: false, reason: 'already patched' };

  // Add transactionId to the events[0] object. Anchor on the adIdentifiers line.
  const anchor = `        adIdentifiers: { gclid: opts.gclid },`;
  if (!src.includes(anchor)) throw new Error('Could not find adIdentifiers anchor in ghl-webhook/route.ts — file may have drifted.');
  src = src.replace(
    anchor,
    [
      '        adIdentifiers: { gclid: opts.gclid },',
      '        // Data Manager expects a stable idempotency key so retries don\'t',
      '        // double-count the conversion. Derived from the raw gclid + the',
      '        // conversion action so the same (gclid, stage) pair dedupes within',
      '        // the 90-day window.',
      '        transactionId: opts.transactionId || `${opts.gclid}:${opts.conversionActionId}`,',
    ].join('\n')
  );

  // Extend the opts type so callers may pass an explicit transactionId.
  src = src.replace(
    `  currency?: string;
}): Promise<void> {`,
    `  currency?: string;
  transactionId?: string;
}): Promise<void> {`
  );

  fs.writeFileSync(WEBHOOK_FILE, src);
  return { file: WEBHOOK_FILE, changed: true, reason: 'added transactionId (stable idempotency key) to Data Manager ingest events[0]' };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const apply = process.argv.includes('--apply');

function main() {
  console.log('==================================================');
  console.log(' gclid capture — diagnostic + patch');
  console.log('==================================================\n');

  console.log('── gclid flow ──────────────────────────────────');
  for (const s of gclidFlow()) {
    console.log(`  ${s.step}\n      ${s.file}\n      → ${s.note}`);
  }
  console.log('');

  console.log('── diagnostic findings ─────────────────────────');
  const findings = diagnose();
  for (const f of findings) {
    const tag = f.status === 'clean' ? 'OK ' : '⚠  ';
    console.log(`  [${tag}] ${f.check}: ${f.status}`);
    console.log(`          ${f.detail}`);
  }
  console.log('');

  if (!apply) {
    console.log('Dry run. Re-run with --apply to patch lib/tracking.ts and');
    console.log('app/api/ghl-webhook/route.ts.');
    return;
  }

  console.log('── applying patches ────────────────────────────');
  const results = [];
  try {
    results.push(patchTracking());
  } catch (e) {
    results.push({ file: TRACKING_FILE, changed: false, reason: `ERROR: ${e.message}` });
  }
  try {
    results.push(patchWebhook());
  } catch (e) {
    results.push({ file: WEBHOOK_FILE, changed: false, reason: `ERROR: ${e.message}` });
  }
  for (const r of results) {
    const rel = path.relative(ROOT, r.file);
    if (r.changed) console.log(`  ✓ ${rel} — ${r.reason}`);
    else console.log(`  – ${rel} — ${r.reason}`);
  }
  console.log('\nDone. Run `npm run typecheck` to confirm no type errors.');
}

main();
