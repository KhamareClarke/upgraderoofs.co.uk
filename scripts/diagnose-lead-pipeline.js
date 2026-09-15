/**
 * scripts/diagnose-lead-pipeline.js
 *
 * End-to-end diagnostic for the lead-capture pipeline (form → /api/send-* →
 * spam filters → GHL → SMTP → local audit log). Answers, in one run, the
 * question "why did that lead vanish?" — by replaying realistic payloads
 * through the SAME spam-filter rules production uses and printing the exact
 * HTTP status / response body of every external hop.
 *
 * Run (read-only — no network writes, no test leads created):
 *   node scripts/diagnose-lead-pipeline.js
 *
 * Run including live probes (creates ONE clearly-labelled test contact in GHL
 * and POSTs one labelled test lead to the running app; SMTP is verified only,
 * never sends):
 *   node scripts/diagnose-lead-pipeline.js --live
 *   node scripts/diagnose-lead-pipeline.js --live --url https://upgraderoofs.co.uk
 *
 * The spam-filter rules are EXTRACTED FROM lib/spam-filter.ts AT RUNTIME (not
 * copied), so this script cannot drift out of sync with production logic. If
 * extraction fails the script says so loudly rather than silently testing a
 * stale mirror.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const LIVE = argv.includes('--live');
const urlArgIdx = argv.indexOf('--url');
const BASE_URL = urlArgIdx !== -1 ? argv[urlArgIdx + 1] : 'http://localhost:3000';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const ok = (s) => `${C.green}${s}${C.reset}`;
const bad = (s) => `${C.red}${s}${C.reset}`;
const warn = (s) => `${C.yellow}${s}${C.reset}`;

function heading(n, title) {
  console.log(`\n${C.bold}${C.cyan}── ${n}. ${title} ${'─'.repeat(Math.max(0, 58 - title.length))}${C.reset}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENVIRONMENT AUDIT
// ─────────────────────────────────────────────────────────────────────────────
function auditEnv() {
  heading(1, 'ENVIRONMENT');

  const groups = [
    ['GoHighLevel (lead delivery)', ['GHL_LOCATION_ID', 'GHL_API_KEY']],
    ['GHL custom-field ids (optional — silent data loss if unset)', [
      'GHL_CF_GCLID', 'GHL_CF_POSTCODE', 'GHL_CF_SERVICE_TYPE', 'GHL_CF_ROOF_TYPE', 'GHL_CF_SERVICE_NEEDED',
    ]],
    ['Email / SMTP (notify inbox)', ['SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM', 'EMAIL_TO']],
    ['Turnstile (optional gate)', ['TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY']],
    ['JARVIS fleet ingest (optional mirror)', ['FLEET_INGEST_SECRET', 'FLEET_INGEST_URL', 'EMPIRE_INGEST_SECRET']],
  ];

  let missingCritical = [];

  for (const [label, keys] of groups) {
    console.log(`\n  ${C.bold}${label}${C.reset}`);
    for (const k of keys) {
      const raw = process.env[k];
      const set = typeof raw === 'string' && raw.trim().length > 0;
      if (set) {
        const v = raw.trim();
        // Never print secrets — length + a safe fingerprint only.
        const shown = /SECRET|PASS|KEY|TOKEN/.test(k)
          ? `${C.dim}${v.length} chars, ends …${v.slice(-4)}${C.reset}`
          : `${C.dim}${v}${C.reset}`;
        console.log(`    ${ok('✔')} ${k.padEnd(34)} ${shown}`);
      } else {
        console.log(`    ${bad('✘')} ${k.padEnd(34)} ${bad('NOT SET')}`);
        if (label.startsWith('GoHighLevel (lead') || label.startsWith('Email')) missingCritical.push(k);
      }
    }
  }

  // EMAIL_TO default is a documented trap: lib/mail.ts falls back to a Yahoo
  // address, not the client's Gmail, when the var is unset.
  if (!process.env.EMAIL_TO || !process.env.EMAIL_TO.trim()) {
    console.log(`\n  ${warn('⚠')}  EMAIL_TO unset — lib/mail.ts will silently default to ${C.bold}upgraderoofs@yahoo.com${C.reset}`);
    console.log(`     If the client expects mail at a Gmail address, that is a second, independent failure.`);
  }

  if (missingCritical.length) {
    console.log(`\n  ${bad('✘ Critical vars missing from .env.local:')} ${missingCritical.join(', ')}`);
    console.log(`  ${C.dim}Note: .env.local is local-dev only. Verify the same keys exist in the Vercel`);
    console.log(`  project (Production) — that is what the deployed site actually reads.${C.reset}`);
  } else {
    console.log(`\n  ${ok('✔')} All critical delivery vars present in .env.local`);
  }

  return { missingCritical };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SPAM-FILTER REPLAY (rules extracted live from lib/spam-filter.ts)
// ─────────────────────────────────────────────────────────────────────────────
function loadFilterRules() {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'spam-filter.ts'), 'utf8');

  // Pull the array literals straight out of the TypeScript source and evaluate
  // them, so this diagnostic always tests the rules production actually ships.
  const grab = (name) => {
    const re = new RegExp(`const ${name}\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);`);
    const m = src.match(re);
    if (!m) return null;
    try {
      return eval(m[1]); // eslint-disable-line no-eval
    } catch {
      return null;
    }
  };

  const B2B_PHRASES = grab('B2B_PHRASES');
  const URL_PATTERNS = grab('URL_PATTERNS');
  const SUSPICIOUS_NAME_PATTERNS = grab('SUSPICIOUS_NAME_PATTERNS');

  if (!B2B_PHRASES || !URL_PATTERNS || !SUSPICIOUS_NAME_PATTERNS) return null;
  return { B2B_PHRASES, URL_PATTERNS, SUSPICIOUS_NAME_PATTERNS };
}

// Mirrors the field-selection logic in lib/spam-filter.ts isSpamSubmission().
// The RULES come from source; only this ~20-line dispatch is restated here.
function buildChecker(rules) {
  const { B2B_PHRASES, URL_PATTERNS, SUSPICIOUS_NAME_PATTERNS } = rules;

  const isUrlLike = (v) => URL_PATTERNS.some((re) => new RegExp(re.source, re.flags).test(v));
  // Must match EMAIL_LIKE in lib/spam-filter.ts.
  const EMAIL_LIKE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const maskEmails = (v) => v.replace(EMAIL_LIKE, ' [email] ');
  const hasB2bPitch = (v) => {
    const t = v.toLowerCase();
    if (t.includes('seo')) return true;
    if (t.includes('marketing')) return true;
    return B2B_PHRASES.some((p) => t.includes(p));
  };
  const collectStrings = (value, out) => {
    if (typeof value === 'string') return void out.push(value);
    if (Array.isArray(value)) return value.forEach((i) => collectStrings(i, out));
    if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out));
  };

  // Returns a list of the rules that fired (empty = lead passes).
  return function check(payload) {
    const hits = [];
    const name = typeof payload.name === 'string' ? payload.name : '';

    for (const re of SUSPICIOUS_NAME_PATTERNS) {
      if (new RegExp(re.source, re.flags).test(name)) hits.push(`name matches ${re}`);
    }
    // `email` is intentionally NOT checked here — see lib/spam-filter.ts.
    for (const key of ['name', 'phone', 'postcode']) {
      const v = payload[key];
      if (typeof v === 'string' && isUrlLike(v)) hits.push(`${key}="${v}" looks like a URL`);
    }
    const all = [];
    collectStrings(payload, all);
    for (const raw of all) {
      const text = maskEmails(raw);
      if (hasB2bPitch(text)) hits.push(`text "${text.slice(0, 48)}" contains a B2B pitch keyword`);
      if (isUrlLike(text)) hits.push(`text "${text.slice(0, 48)}" looks like a URL`);
    }
    return hits;
  };
}

function replayFilter() {
  heading(2, 'SPAM-FILTER REPLAY (rules read from lib/spam-filter.ts)');

  const rules = loadFilterRules();
  if (!rules) {
    console.log(`  ${bad('✘ Could not extract rule arrays from lib/spam-filter.ts.')}`);
    console.log(`  ${C.dim}Skipping replay — do NOT trust a hardcoded mirror. Re-run after checking the file.${C.reset}`);
    return null;
  }
  console.log(`  ${ok('✔')} Extracted ${rules.URL_PATTERNS.length} URL patterns, ${rules.B2B_PHRASES.length} B2B phrases, ${rules.SUSPICIOUS_NAME_PATTERNS.length} name patterns`);

  const check = buildChecker(rules);

  // Realistic payloads, one per live form. These are what a real customer sends.
  const cases = [
    {
      label: 'QuoteForm / ServiceLeadForm / InlineLeadForm  (email required)',
      endpoint: '/api/send-quote',
      payload: {
        name: 'John Smith', email: 'john.smith@gmail.com', phone: '07700900123',
        postcode: 'WA15 9AB', service_type: 'Roof Repair', message: 'My roof is leaking after the storm.',
      },
    },
    {
      label: 'AreaHero / ServiceHero  (email included)',
      endpoint: '/api/send-quote',
      payload: {
        name: 'Sarah Jones', email: 'sarah.jones@outlook.com', phone: '01614800123',
        postcode: 'WA16 6AA', service_type: 'Full Replacement', message: 'Please can someone call me.',
      },
    },
    {
      label: 'ContactForm / EnhancedContactSection  (email REQUIRED)',
      endpoint: '/api/send-contact',
      payload: {
        name: 'David Wilson', email: 'dave.wilson@btinternet.com', phone: '07700900456',
        subject: 'General enquiry', message: 'Do you cover Sandbach? Postcode: CW11 4NE',
      },
    },
    {
      label: 'Special offer page  (email included)',
      endpoint: '/api/send-special-offer',
      payload: {
        name: 'Michael Brown', email: 'michael.brown@yahoo.co.uk', phone: '07700900789',
        postcode: 'CW11 4NE', serviceNeeded: 'Roof Inspection', message: 'Interested in the offer.',
      },
    },
    {
      // Control — email is OPTIONAL on /api/send-quote and /api/send-special-offer,
      // so this payload exercises the filter with no email present at all. It
      // proves the filter is not simply "always true".
      label: 'CONTROL: genuine lead, no email at all (must pass)',
      endpoint: '/api/send-quote',
      payload: {
        name: 'Emma Taylor', phone: '07700900321',
        postcode: 'SK9 1AA', message: 'My roof is leaking, please call me.',
      },
    },
    {
      // The URL rule working as DESIGNED: a real URL pasted into free text.
      // Dropping this is correct behaviour, not the bug.
      label: 'CONTROL: message contains a real URL (correctly dropped)',
      endpoint: '/api/send-quote',
      expect: 'drop',
      payload: {
        name: 'Emma Taylor', phone: '07700900321',
        postcode: 'SK9 1AA', message: 'Please visit www.cheap-roofs-now.com for a better price.',
      },
    },
  ];

  let falsePositives = 0;
  let correctDrops = 0;
  for (const c of cases) {
    const hits = check(c.payload);
    const isDrop = hits.length > 0;
    const expected = c.expect || 'pass';
    const isFalsePositive = isDrop && expected === 'pass';
    const isCorrectDrop = isDrop && expected === 'drop';
    if (isFalsePositive) falsePositives += 1;
    if (isCorrectDrop) correctDrops += 1;

    const verdict = isFalsePositive
      ? bad('✘ FALSE POSITIVE — real lead dropped (fake success, never reaches GHL/SMTP)')
      : isCorrectDrop
        ? ok('✔ correctly dropped (rule works as designed)')
        : ok('✔ PASSES');
    console.log(`\n  ${verdict}  ${C.bold}${c.label}${C.reset}`);
    console.log(`    ${C.dim}→ POST ${c.endpoint}${C.reset}`);
    if (isDrop) {
      for (const h of [...new Set(hits)]) console.log(`      ${(isFalsePositive ? bad('•') : C.dim + '•')} ${h}`);
    }
  }

  console.log(`\n  ${C.bold}${falsePositives} of ${cases.length} realistic submissions are wrongly discarded; ${correctDrops} dropped correctly.${C.reset}`);
  if (falsePositives > 0) {
    console.log(`  ${warn('Every dropped case returns HTTP 200 {"success":true} — the browser shows a')}`);
    console.log(`  ${warn('green confirmation while the lead is discarded before GHL, SMTP, and the audit log.')}`);
  }
  return { falsePositives, correctDrops, total: cases.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LOCAL AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────
function auditLocalLog() {
  heading(3, 'LOCAL AUDIT LOG (data/leads-audit.jsonl)');

  const file = path.join(ROOT, 'data', 'leads-audit.jsonl');
  if (!fs.existsSync(file)) {
    console.log(`  ${bad('✘ File does not exist.')}`);
    console.log(`  ${C.dim}lib/lead-logger.ts is called AFTER the spam filter in every route, so a`);
    console.log(`  filtered submission is never written here. An absent/empty file means either no`);
    console.log(`  lead survived the filters, or the route never reached the logger.${C.reset}`);
    return;
  }

  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  console.log(`  ${ok('✔')} Found ${C.bold}${lines.length}${C.reset} logged lead(s)`);
  for (const line of lines.slice(-5)) {
    try {
      const r = JSON.parse(line);
      console.log(`    ${C.dim}${r.timestamp}  ${r.route}  ${r.name || '?'}  ${r.phone || r.email || ''}${C.reset}`);
    } catch {
      console.log(`    ${warn('(unparseable line)')} ${line.slice(0, 80)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GHL DIRECT PROBE  (--live only)
// ─────────────────────────────────────────────────────────────────────────────
async function probeGhl() {
  heading(4, 'GOHIGHLEVEL DIRECT PROBE');

  const locationId = (process.env.GHL_LOCATION_ID || '').trim();
  const token = (process.env.GHL_API_KEY || '').trim();

  if (!locationId || !token) {
    console.log(`  ${bad('✘ Skipped — GHL_LOCATION_ID / GHL_API_KEY not set.')}`);
    console.log(`  ${C.dim}lib/ghl.ts returns null immediately in this state, so no lead can ever reach GHL.${C.reset}`);
    return;
  }

  if (!LIVE) {
    console.log(`  ${C.dim}Skipped — pass --live to create one labelled test contact in GHL.${C.reset}`);
    console.log(`  ${C.dim}Would POST https://services.leadconnectorhq.com/contacts/upsert (location ${locationId})${C.reset}`);
    return;
  }

  const payload = {
    locationId,
    firstName: 'Pipeline Diagnostic',
    lastName: 'Safe To Delete',
    name: 'Pipeline Diagnostic - Safe To Delete',
    email: 'pipeline.diagnostic.safetodelete@upgraderoofs-test.invalid',
    phone: '07700900000',
    tags: ['diagnostic', 'safe-to-delete'],
    source: 'diagnostic_script',
  };

  console.log(`  → POST /contacts/upsert  (location ${locationId})`);
  try {
    const res = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }

    const good = res.status === 200 || res.status === 201;
    console.log(`  ${good ? ok('✔') : bad('✘')} HTTP ${C.bold}${res.status}${C.reset}`);
    console.log(`  ${C.dim}${JSON.stringify(body).slice(0, 600)}${C.reset}`);

    if (res.status === 401 || res.status === 403) {
      console.log(`  ${bad('→ Auth rejected. Check GHL_API_KEY is a Private Integration token scoped to this location.')}`);
    } else if (res.status === 422) {
      console.log(`  ${bad('→ Validation rejected. A payload property is malformed (often a customFields id).')}`);
    } else if (good) {
      const id = body.contact?.id || body.id;
      console.log(`  ${ok('→ GHL accepts this token and location.')} Contact created: ${C.bold}${id}${C.reset}`);
      console.log(`  ${C.dim}Delete "Pipeline Diagnostic - Safe To Delete" in GHL when done.${C.reset}`);
    }
  } catch (err) {
    console.log(`  ${bad('✘ Transport error:')} ${err.message}`);
    console.log(`  ${C.dim}DNS/TLS/network failure — the lead would also fail here.${C.reset}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SMTP DIRECT PROBE  (verify only — never sends)
// ─────────────────────────────────────────────────────────────────────────────
async function probeSmtp() {
  heading(5, 'SMTP / GMAIL PROBE (verify only — sends nothing)');

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s/g, '');
  const to = process.env.EMAIL_TO?.trim() || 'upgraderoofs@yahoo.com';

  if (!user || !pass) {
    console.log(`  ${bad('✘ Skipped — SMTP_USER / SMTP_PASS not set.')}`);
    console.log(`  ${C.dim}lib/mail.ts getMailConfig() throws in this state. The route catches it and still`);
    console.log(`  returns {"success":true,"message":"...email delivery pending"} — a silent email failure.${C.reset}`);
    return;
  }

  console.log(`  From: ${C.dim}${process.env.EMAIL_FROM?.trim() || user}${C.reset}`);
  console.log(`  To:   ${C.dim}${to}${C.reset}${process.env.EMAIL_TO ? '' : warn('  ← DEFAULT, EMAIL_TO unset')}`);

  try {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await t.verify();
    console.log(`  ${ok('✔ SMTP credentials accepted by Gmail.')}`);
  } catch (err) {
    console.log(`  ${bad('✘ SMTP verify failed:')} ${err.code || ''} ${err.message}`);
    if (err.code === 'EAUTH') {
      console.log(`  ${bad('→ EAUTH: bad credentials. SMTP_PASS must be a Google App Password (16 chars),')}`);
      console.log(`  ${bad('   not the account password, and 2-Step Verification must be enabled.')}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. LIVE ENDPOINT PROBE  (--live only)
// ─────────────────────────────────────────────────────────────────────────────
async function probeEndpoint() {
  heading(6, 'LIVE ENDPOINT PROBE');

  if (!LIVE) {
    console.log(`  ${C.dim}Skipped — pass --live to POST a labelled test lead to ${BASE_URL}/api/send-quote${C.reset}`);
    console.log(`  ${C.dim}Note: the route returns {"success":true} even when it discards the lead, so a 200`);
    console.log(`  here is NOT proof of delivery — cross-check the GHL contact and the audit log.${C.reset}`);
    return;
  }

  const payload = {
    name: 'Pipeline Diagnostic',
    email: 'pipeline.diagnostic.safetodelete@upgraderoofs-test.invalid',
    phone: '07700900000',
    postcode: 'CW11 4NE',
    service_type: 'Diagnostic Test',
    message: 'Automated pipeline diagnostic — safe to delete.',
    website: '', // honeypot must stay empty
    gclid: '',
    turnstileToken: '',
  };

  console.log(`  → POST ${BASE_URL}/api/send-quote`);
  try {
    const res = await fetch(`${BASE_URL}/api/send-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    console.log(`  HTTP ${C.bold}${res.status}${C.reset}  ${C.dim}${JSON.stringify(body)}${C.reset}`);
    if (body.success === true) {
      console.log(`  ${warn('⚠ success:true — this is returned for BOTH delivered and silently-dropped leads.')}`);
      console.log(`  ${warn('  Confirm delivery in GHL and in data/leads-audit.jsonl, not from this response.')}`);
    }
  } catch (err) {
    console.log(`  ${bad('✘ Could not reach the app:')} ${err.message}`);
    console.log(`  ${C.dim}Start it with "npm run dev", or pass --url https://upgraderoofs.co.uk${C.reset}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`${C.bold}Lead-pipeline diagnostic${C.reset}  ${C.dim}${new Date().toISOString()}${C.reset}`);
  console.log(`${C.dim}Mode: ${LIVE ? 'LIVE (will create a test contact + POST a test lead)' : 'read-only (no network writes)'}${C.reset}`);

  auditEnv();
  const replay = replayFilter();
  auditLocalLog();
  await probeGhl();
  await probeSmtp();
  await probeEndpoint();

  heading('SUMMARY', '');
  if (replay && replay.falsePositives > 0) {
    console.log(`  ${bad(`${replay.falsePositives}/${replay.total} realistic leads are wrongly discarded by lib/spam-filter.ts.`)}`);
    console.log(`  ${C.bold}This alone explains leads reaching neither GHL nor the notify inbox.${C.reset}`);
  } else if (replay) {
    console.log(`  ${ok('Spam filter passes all realistic payloads.')}`);
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`  ${bad('SMTP not configured — email delivery will fail separately even once the filter is fixed.')}`);
  }
  if (!process.env.EMAIL_TO) {
    console.log(`  ${warn('EMAIL_TO unset — notifications default to upgraderoofs@yahoo.com, not the client Gmail.')}`);
  }
  console.log();
})();
