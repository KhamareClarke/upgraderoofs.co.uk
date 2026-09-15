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
// 2. SPAM-FILTER REPLAY (the real lib/spam-filter.ts, executed in-process)
// ─────────────────────────────────────────────────────────────────────────────
//
// This used to regex the B2B_PHRASES / URL_PATTERNS arrays out of the source and
// re-implement the dispatch around them. That approach had two failure modes,
// and the rewrite hit both at once: the arrays were renamed (so extraction
// returned null and the replay silently skipped itself), and the mirrored
// dispatch had already drifted from the real one — it still carried the bare
// `includes('seo')` / `includes('marketing')` checks that were deleting real
// customers. A diagnostic that tests a copy of the rules cannot be trusted to
// tell you whether the rules are wrong.
//
// So it now transpiles and executes lib/spam-filter.ts directly. The only thing
// restated here is the reporting.
function loadRealFilter() {
  const ts = require('typescript');
  const file = path.join(ROOT, 'lib', 'spam-filter.ts');
  const src = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: 'spam-filter.ts',
  });
  const module_ = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', outputText)(module_.exports, require, module_);
  if (typeof module_.exports.assessSubmission !== 'function') {
    throw new Error('lib/spam-filter.ts did not export assessSubmission');
  }
  return module_.exports;
}

function replayFilter() {
  heading(2, 'SPAM-FILTER REPLAY (executing the real lib/spam-filter.ts)');

  let filter;
  try {
    filter = loadRealFilter();
  } catch (err) {
    console.log(`  ${bad(`✘ Could not load lib/spam-filter.ts: ${err.message}`)}`);
    console.log(`  ${C.dim}Skipping replay — do NOT trust a hardcoded mirror. Re-run after checking the file.${C.reset}`);
    return null;
  }
  console.log(`  ${ok('✔')} Loaded and executed the real module (no mirrored rules)`);

  // Realistic payloads, one per live form. These are what a real customer sends.
  // `expect` is the verdict the filter should return:
  //   allow  — clean
  //   review — suspicious; DELIVERED and tagged `needs-review` in GHL
  //   block  — confident spam; dropped (decoy 200)
  const cases = [
    {
      label: 'QuoteForm / ServiceLeadForm / InlineLeadForm  (email required)',
      endpoint: '/api/send-quote',
      expect: 'allow',
      payload: {
        name: 'John Smith', email: 'john.smith@gmail.com', phone: '07700900123',
        postcode: 'WA15 9AB', service_type: 'Roof Repair', message: 'My roof is leaking after the storm.',
      },
    },
    {
      label: 'AreaHero / ServiceHero  (email included)',
      endpoint: '/api/send-quote',
      expect: 'allow',
      payload: {
        name: 'Sarah Jones', email: 'sarah.jones@outlook.com', phone: '01614800123',
        postcode: 'WA16 6AA', service_type: 'Full Replacement', message: 'Please can someone call me.',
      },
    },
    {
      label: 'ContactForm / EnhancedContactSection  (email REQUIRED)',
      endpoint: '/api/send-contact',
      expect: 'allow',
      payload: {
        name: 'David Wilson', email: 'dave.wilson@btinternet.com', phone: '07700900456',
        subject: 'General enquiry', message: 'Do you cover Sandbach? Postcode: CW11 4NE',
      },
    },
    {
      label: 'Special offer page  (email included)',
      endpoint: '/api/send-special-offer',
      expect: 'allow',
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
      expect: 'allow',
      payload: {
        name: 'Emma Taylor', phone: '07700900321',
        postcode: 'SK9 1AA', message: 'My roof is leaking, please call me.',
      },
    },
    {
      // A customer describing how they found the business. The OLD filter
      // destroyed this lead; it is the single most common false positive.
      label: 'CONTROL: "I saw your marketing leaflet" (real customer — must NOT be dropped)',
      endpoint: '/api/send-quote',
      expect: 'review',
      payload: {
        name: 'Helen Marsh', email: 'helen.marsh@gmail.com', phone: '07700900199',
        postcode: 'CW11 4NE', message: 'I saw your marketing leaflet through the door and wanted a quote.',
      },
    },
    {
      // A customer naming the directory they found the business on. The OLD
      // filter read the domain as link spam and destroyed the lead.
      label: 'CONTROL: "I found you on checkatrade.co.uk" (real customer — must NOT be dropped)',
      endpoint: '/api/send-quote',
      expect: 'review',
      payload: {
        name: 'Ruth Almond', email: 'ruth@almond.me.uk', phone: '07700900188',
        postcode: 'WA16 6AA', message: 'I found you on checkatrade.co.uk and would like a survey.',
      },
    },
    {
      // One link, no pitch language. Delivered with a flag rather than dropped:
      // a single domain is common in genuine enquiries (photos, a landlord's
      // own site) and is not on its own evidence of spam.
      label: 'Single link in message (delivered + flagged, not dropped)',
      endpoint: '/api/send-quote',
      expect: 'review',
      payload: {
        name: 'Emma Taylor', phone: '07700900321',
        postcode: 'SK9 1AA', message: 'Please visit www.cheap-roofs-now.com for a better price.',
      },
    },
    {
      // Confident spam: an unambiguous second-person sales pitch.
      label: 'CONTROL: B2B solicitation pitch (correctly dropped)',
      endpoint: '/api/send-quote',
      expect: 'block',
      payload: {
        name: 'Marketer', phone: '07700900321',
        postcode: 'SK9 1AA', message: 'We provide estimating support and can price more projects for you.',
      },
    },
    {
      // Confident spam: a link shortener never appears in a genuine enquiry.
      label: 'CONTROL: URL shortener (correctly dropped)',
      endpoint: '/api/send-quote',
      expect: 'block',
      payload: {
        name: 'Neil Bishop', phone: '07700900321',
        postcode: 'SK9 1AA', message: 'Great offer here: https://bit.ly/x9k2p',
      },
    },
  ];

  const tally = { allow: 0, review: 0, block: 0 };
  const falsePositives = []; // expected a delivery, got 'block' — a destroyed lead
  const misfiled = []; // allow/review mix-up — nothing lost either way
  const missed = []; // expected 'block', got through — spam admitted

  for (const c of cases) {
    const { verdict, reasons } = filter.assessSubmission(c.payload);
    tally[verdict] += 1;

    let headline;
    if (verdict === c.expect) {
      if (verdict === 'block') headline = ok('✔ correctly dropped (rule works as designed)');
      else if (verdict === 'review') headline = warn('✔ DELIVERED + flagged `needs-review` in GHL (a human decides)');
      else headline = ok('✔ PASSES clean');
    } else if (verdict === 'block') {
      falsePositives.push(c);
      headline = bad('✘ FALSE POSITIVE — real lead dropped (fake success, never reaches GHL/SMTP)');
    } else if (c.expect === 'block') {
      missed.push(c);
      headline = warn(`⚠ MISSED SPAM — admitted as ${verdict.toUpperCase()} (annoying, not severe)`);
    } else {
      misfiled.push(c);
      headline = warn(`⚠ mis-tiered — got ${verdict.toUpperCase()}, expected ${c.expect.toUpperCase()} (no lead lost)`);
    }

    console.log(`\n  ${headline}  ${C.bold}${c.label}${C.reset}`);
    console.log(`    ${C.dim}→ POST ${c.endpoint}${C.reset}`);
    if (reasons.length) console.log(`      ${C.dim}• ${reasons.join(', ')}${C.reset}`);
  }

  console.log(
    `\n  ${C.bold}${cases.length} realistic submissions: ` +
      `${tally.allow} allow / ${tally.review} review / ${tally.block} block${C.reset}`,
  );
  console.log(
    `  ${C.bold}${falsePositives.length} wrongly discarded; ${missed.length} missed spam.${C.reset}`,
  );
  if (falsePositives.length === 0) {
    console.log(`  ${ok('No genuine lead is dropped by the spam filter.')}`);
  }
  if (tally.review > 0) {
    console.log(`  ${C.dim}A 'review' verdict delivers the lead normally and tags it \`needs-review\` in GHL.`);
    console.log(`  Neither verdict returns a bare success without recording it — every path writes to`);
    console.log(`  the lead-pipeline audit log.${C.reset}`);
  }
  return { falsePositives: falsePositives.length, missed: missed.length, misfiled: misfiled.length, tally, total: cases.length };
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
    console.log(`  ${ok(`Spam filter drops no realistic lead (${replay.tally.allow} clean, ${replay.tally.review} flagged for review, ${replay.tally.block} blocked).`)}`);
    if (replay.missed > 0) {
      console.log(`  ${warn(`${replay.missed} spam payload(s) were admitted — a minor annoyance, not a lost lead.`)}`);
    }
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`  ${bad('SMTP not configured — email delivery will fail separately even once the filter is fixed.')}`);
  }
  if (!process.env.EMAIL_TO) {
    console.log(`  ${warn('EMAIL_TO unset — notifications default to upgraderoofs@yahoo.com, not the client Gmail.')}`);
  }
  console.log();
})();
