/**
 * scripts/test-lead-pipeline-live.js
 *
 * End-to-end self-test of the lead submission pipeline, frontend payload to
 * database/CRM/inbox.
 *
 * HOW IT EXECUTES THE ROUTES
 * --------------------------
 * The three POST handlers under app/api/send-* are compiled from their real
 * TypeScript source and invoked in-process with a real NextRequest, so the
 * HTTP status under test comes from the shipped handler — not a reimplementation
 * of it. Only the three modules with outbound side effects are replaced:
 *
 *   @/lib/ghl       — otherwise this script would create a real GHL contact
 *   @/lib/mail      — otherwise this script would send a real email
 *   @/lib/fleet-ingest — otherwise this script would ping the JARVIS hub
 *
 * Everything else (spam-filter, lead-validation, rate-limit, turnstile) is the
 * real module. That is deliberate: those are the components whose behaviour the
 * status codes depend on.
 *
 * WHAT THE SCENARIOS PROVE
 * ------------------------
 * The interesting assertion is scenario `both-fail`: when GHL AND SMTP both
 * fail, the route must NOT return 200. Before this suite existed every route
 * returned `200 {success:true}` in that case, which is why a total lead-capture
 * outage looked like a working form for weeks.
 *
 * Read-only live probes (run only when credentials are present):
 *   --ghl     resolve every GHL_CF_* id against the real GHL location
 *   --schema  diff each form payload against the live PostgREST schema
 *
 * Usage:
 *   node scripts/test-lead-pipeline-live.js                 # offline, no side effects
 *   node scripts/test-lead-pipeline-live.js --ghl --schema  # + read-only live probes
 *   node scripts/test-lead-pipeline-live.js --url https://upgraderoofs.co.uk
 *       ^ real HTTP fire — SENDS A REAL EMAIL and CREATES A REAL GHL CONTACT
 *
 * Exit: 0 = every assertion held, 1 = a regression.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const flagValue = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};

const C = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

const failures = [];
function check(ok, label, detail) {
  if (ok) {
    console.log(`  ${C.green}✔${C.reset} ${label}`);
  } else {
    console.log(`  ${C.red}✘${C.reset} ${label}${detail ? ` ${C.red}— ${detail}${C.reset}` : ''}`);
    failures.push(label);
  }
  return ok;
}

/** Advisory note — printed but never affects the exit code. */
function warn(label) {
  console.log(`  ${C.yellow}⚠${C.reset} ${label}`);
}

// ── Env loading (names only are ever printed) ───────────────────────────────
function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!m) continue; // skips commented-out keys
      const value = m[2].trim().replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined && value !== '') process.env[m[1]] = value;
    }
  }
}

// ── TypeScript module loader with a `@/` alias + stubs ──────────────────────
const moduleCache = new Map();
const stubs = {};

function resolveModuleFile(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function loadModule(file) {
  if (moduleCache.has(file)) return moduleCache.get(file);

  if (file.endsWith('.js')) {
    const mod = require(file);
    moduleCache.set(file, mod);
    return mod;
  }

  const exportsObj = {};
  moduleCache.set(file, exportsObj); // set first so cycles resolve
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: file,
  });

  const localRequire = (spec) => {
    if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec];
    if (spec.startsWith('@/')) {
      const resolved = resolveModuleFile(path.join(ROOT, spec.slice(2)));
      if (!resolved) throw new Error(`Cannot resolve alias ${spec}`);
      return loadModule(resolved);
    }
    if (spec.startsWith('.')) {
      const resolved = resolveModuleFile(path.resolve(path.dirname(file), spec));
      if (!resolved) throw new Error(`Cannot resolve ${spec} from ${file}`);
      return loadModule(resolved);
    }
    return require(spec);
  };

  const moduleObj = { exports: exportsObj };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', '__filename', '__dirname', outputText)(
    exportsObj,
    localRequire,
    moduleObj,
    file,
    path.dirname(file),
  );
  moduleCache.set(file, moduleObj.exports);
  return moduleObj.exports;
}

// ── Spies ───────────────────────────────────────────────────────────────────
// `control` is read at call time so one scenario can flip behaviour without
// reloading the route module.
const control = { ghlOk: true, mailOk: true, calls: { ghl: [], mail: [], fleet: 0 } };

stubs['@/lib/ghl'] = {
  pushLeadToGhl: async (input) => {
    control.calls.ghl.push(input);
    return control.ghlOk ? `test-contact-${control.calls.ghl.length}` : null;
  },
};
stubs['@/lib/mail'] = {
  getMailConfig: () => ({
    transporter: {
      sendMail: async (msg) => {
        if (!control.mailOk) throw new Error('Simulated SMTP failure (535 auth rejected)');
        control.calls.mail.push(msg);
        return { messageId: 'simulated' };
      },
    },
    from: 'test@example.com',
    to: 'test@example.com',
  }),
  mailErrorResponseMessage: (e) => (e && e.message ? e.message : 'email failed'),
};
stubs['@/lib/fleet-ingest'] = {
  emitFleetIngest: async () => {
    control.calls.fleet += 1;
    return { ok: true };
  },
};
stubs['@/lib/lead-logger'] = { logLeadSubmission: () => {} };
stubs['@/lib/ghl/opportunities.js'] = {
  listPipelines: async () => ({ pipelines: [] }),
  createOpportunity: async () => ({}),
  triggerSpeedToLead: async () => ({ triggered: false, reason: 'test harness' }),
};
stubs['@/lib/ghl/opportunities'] = stubs['@/lib/ghl/opportunities.js'];

// ── Payloads: exactly what each component sends ─────────────────────────────
// Mirrors ContactForm.tsx, QuoteForm.tsx / ServiceLeadForm.tsx, and the
// special-offer page. A field added to a form but not here is a blind spot.
const ROUTES = [
  {
    name: 'send-quote',
    file: 'app/api/send-quote/route.ts',
    table: 'quote_requests',
    payload: {
      name: 'John Smith',
      email: 'test.user@gmail.com',
      phone: '07700900123',
      postcode: 'CW11 4NE',
      service_type: 'Roof Repair',
      roof_type: 'Tiled',
      message: 'My roof is leaking after the storm.',
    },
  },
  {
    name: 'send-contact',
    file: 'app/api/send-contact/route.ts',
    table: 'contact_messages',
    payload: {
      name: 'Sarah Jones',
      email: 'name@yahoo.co.uk',
      phone: '01614800123',
      subject: 'General enquiry',
      roof_type: 'Flat',
      service_needed: 'Roof Inspection',
      message: 'Postcode: CW11 4NE\n\nDo you do emergency callouts?',
    },
  },
  {
    name: 'send-special-offer',
    file: 'app/api/send-special-offer/route.ts',
    table: null, // no client-side Supabase write on this form
    payload: {
      name: 'David Wilson',
      phone: '07700900456',
      postcode: 'WA16 6AA',
      email: 'dave.wilson@outlook.com',
      roofType: 'Tiled',
      serviceNeeded: 'Full Replacement',
      sameDayCallback: true,
      message: 'Please call after 5pm.',
    },
    // The wizard's Email field is optional (LeadFormWizard step 2 requires only
    // a postcode, and both offer pages validate the format only when typed), so
    // this variant reaches the route in normal use and must still be delivered.
    optionalFieldVariant: { omit: 'email' },
  },
];

async function main() {
  loadEnvFiles();

  console.log(`${C.bold}Lead pipeline self-test${C.reset} ${C.dim}(executing real route handlers in-process)${C.reset}\n`);

  const { NextRequest } = require('next/server');

  let ipCounter = 0;
  const scenarios = [
    { key: 'both-ok', ghlOk: true, mailOk: true, expectStatus: 200, expectGhl: 'ok', expectEmail: 'ok' },
    { key: 'mail-fails', ghlOk: true, mailOk: false, expectStatus: 200, expectGhl: 'ok', expectEmail: 'failed' },
    { key: 'ghl-fails', ghlOk: false, mailOk: true, expectStatus: 200, expectGhl: 'failed', expectEmail: 'ok' },
    { key: 'both-fail', ghlOk: false, mailOk: false, expectStatus: 502, expectGhl: 'failed', expectEmail: 'failed' },
  ];

  // ── 2. Route response integrity ──────────────────────────────────────────
  for (const route of ROUTES) {
    console.log(`${C.bold}${route.name}${C.reset} ${C.dim}(${route.file})${C.reset}`);

    let handler;
    try {
      handler = loadModule(path.join(ROOT, route.file));
    } catch (err) {
      check(false, 'module loads', err.message);
      console.log('');
      continue;
    }
    if (!check(typeof handler.POST === 'function', 'exports POST handler')) {
      console.log('');
      continue;
    }

    // Spam filter must let the realistic payload through — the false-positive
    // class that caused the outage.
    const spy = loadModule(path.join(ROOT, 'lib/spam-filter.ts'));
    check(
      spy.isSpamSubmission(route.payload) === false,
      'realistic payload survives the spam filter',
      'isSpamSubmission returned true',
    );

    for (const s of scenarios) {
      control.ghlOk = s.ghlOk;
      control.mailOk = s.mailOk;
      control.calls.ghl = [];
      control.calls.mail = [];

      ipCounter += 1;
      const req = new NextRequest(`http://localhost/api/${route.name}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.0.${ipCounter}` },
        body: JSON.stringify(route.payload),
      });

      let res;
      try {
        res = await handler.POST(req);
      } catch (err) {
        check(false, `${s.key} — handler did not throw`, err.message);
        continue;
      }
      const body = await res.json().catch(() => ({}));

      const statusOk = res.status === s.expectStatus;
      const detail = `got ${res.status} ${JSON.stringify(body)}`;
      check(statusOk, `${s.key}: HTTP ${s.expectStatus}`, statusOk ? null : detail);

      if (s.key === 'both-fail') {
        // The whole point of the exercise.
        check(
          res.status !== 200 && body.success === false,
          `${s.key}: does not report fake success`,
          `returned ${res.status} success=${body.success}`,
        );
      } else {
        check(body.ghl === s.expectGhl, `${s.key}: body.ghl === "${s.expectGhl}"`, `got "${body.ghl}"`);
        check(body.email === s.expectEmail, `${s.key}: body.email === "${s.expectEmail}"`, `got "${body.email}"`);
      }

      // The filter must drop the lead BEFORE any outbound call.
      if (s.key === 'both-ok') {
        check(control.calls.ghl.length === 1, 'scenario both-ok: GHL called exactly once');
        check(control.calls.mail.length === 1, 'scenario both-ok: SMTP called exactly once');
        const ghl = control.calls.ghl[0] || {};
        check(ghl.source !== undefined, 'scenario both-ok: GHL source tag present');
      }
    }

    // A field the UI lets the customer leave blank must not silently discard
    // the lead. Regression guard for the send-special-offer email bug, where
    // the route required an email the form never asked for: every such
    // submission got 200 {success:true} and vanished — and unlike the other
    // forms these two pages have no Supabase write to recover it from.
    if (route.optionalFieldVariant) {
      const omit = route.optionalFieldVariant.omit;
      const variant = { ...route.payload };
      delete variant[omit];
      control.ghlOk = true;
      control.mailOk = true;
      control.calls.ghl = [];
      control.calls.mail = [];
      ipCounter += 1;
      const req = new NextRequest(`http://localhost/api/${route.name}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.0.${ipCounter}` },
        body: JSON.stringify(variant),
      });
      const res = await handler.POST(req);
      const body = await res.json().catch(() => ({}));
      check(
        control.calls.ghl.length === 1 && control.calls.mail.length === 1,
        `optional "${omit}" omitted: lead is still delivered (not silently dropped)`,
        `GHL calls=${control.calls.ghl.length} SMTP calls=${control.calls.mail.length} status=${res.status} body=${JSON.stringify(body)}`,
      );
    }

    // Anti-bot behaviour must be preserved: a spam payload is still a silent
    // 200, and must not be converted into a 502 by the integrity change.
    control.ghlOk = true;
    control.mailOk = true;
    control.calls.ghl = [];
    control.calls.mail = [];
    ipCounter += 1;
    const spamReq = new NextRequest(`http://localhost/api/${route.name}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.0.${ipCounter}` },
      body: JSON.stringify({ ...route.payload, message: 'Buy backlinks at www.cheap-seo.com' }),
    });
    const spamRes = await handler.POST(spamReq);
    const spamBody = await spamRes.json().catch(() => ({}));
    check(spamRes.status === 200 && spamBody.success === true, 'link spam still silently 200 (bot decoy preserved)');
    check(control.calls.ghl.length === 0, 'link spam never reaches GHL');
    check(control.calls.mail.length === 0, 'link spam never reaches SMTP');

    console.log('');
  }

  // ── 1. Schema vs payload alignment ───────────────────────────────────────
  console.log(`${C.bold}Schema / payload alignment${C.reset}`);

  // Advisory only, and deliberately NOT part of the pass/fail verdict. This
  // reads the migration DDL in the repo — including migrations that were
  // written but never applied. A green result here means "the SQL I can see
  // would satisfy the payload", which is NOT the same as "production has these
  // columns". Only --schema, which reads the live PostgREST spec, can say that.
  // Treating a repo-only check as proof is precisely the false confidence that
  // let the original schema drift run unnoticed.
  const migratedColumns = readColumnsFromMigrations();
  for (const route of ROUTES) {
    if (!route.table) continue;
    const cols = migratedColumns[route.table];
    if (!cols) {
      warn(`${route.table}: no CREATE TABLE found in supabase/migrations`);
      continue;
    }
    const sent = Object.keys(route.payload).filter((k) => route.payload[k] !== undefined);
    const missing = sent.filter((k) => !cols.has(k) && !INTENTIONALLY_NOT_STORED.has(`${route.table}.${k}`));
    if (missing.length) {
      // A field written by a form with no migration at all is a definite bug.
      check(false, `${route.table}: migration covers every written field`, `no column for: ${missing.join(', ')}`);
    } else {
      warn(`${route.table}: payload covered by migration DDL ${C.dim}(not proof — run --schema)${C.reset}`);
    }
  }

  // ── Client-side backstop ordering ────────────────────────────────────────
  // The Supabase write in each form is the only copy of a lead that survives a
  // GHL+mail outage. It is worthless if it sits behind the `response.ok` gate,
  // because the route now returns 502 in exactly that case — so the write must
  // come first, and must be gated on 4xx only.
  console.log(`${C.bold}Client backstop ordering${C.reset}`);
  for (const form of [
    { file: 'components/QuoteForm.tsx', table: 'quote_requests' },
    { file: 'components/ServiceLeadForm.tsx', table: 'quote_requests' },
    { file: 'components/ContactForm.tsx', table: 'contact_messages' },
    { file: 'components/EnhancedContactSection.tsx', table: 'contact_messages' },
  ]) {
    const src = fs.readFileSync(path.join(ROOT, form.file), 'utf8');
    const insertAt = src.indexOf(`.from('${form.table}').insert([formData])`);
    const throwAt = src.indexOf('throw new Error(result.error');
    if (insertAt < 0) {
      check(false, `${form.file}: writes to ${form.table}`);
      continue;
    }
    check(
      throwAt > insertAt,
      `${form.file}: persists before the response.ok gate`,
      'the insert sits behind the throw — a 502 would skip the backstop entirely',
    );
    check(
      /if \(response\.ok \|\| response\.status >= 500\)/.test(src),
      `${form.file}: backstop runs on 5xx, skipped on 4xx`,
      'expected `if (response.ok || response.status >= 500)`',
    );
  }

  // ── Live read-only probes ────────────────────────────────────────────────
  if (hasFlag('--ghl')) await probeGhlCustomFields();
  else console.log(`${C.dim}\n  (skipped live GHL field check — pass --ghl)${C.reset}`);

  if (hasFlag('--schema')) await probeLiveSchema();
  else console.log(`${C.dim}  (skipped live schema check — pass --schema)${C.reset}`);

  // ── Optional: real HTTP fire ─────────────────────────────────────────────
  const url = flagValue('--url');
  if (url) await fireRealRequest(url);

  // ── Verdict ──────────────────────────────────────────────────────────────
  console.log('');
  if (failures.length === 0) {
    console.log(`${C.green}${C.bold}PASS${C.reset} — all assertions held.`);
    process.exit(0);
  }
  console.log(`${C.red}${C.bold}FAIL${C.reset} — ${failures.length} assertion(s) failed:`);
  for (const f of failures) console.log(`  ${C.red}·${C.reset} ${f}`);
  process.exit(1);
}

/** Columns present in the client payloads that are deliberately not stored. */
const INTENTIONALLY_NOT_STORED = new Set([
  // ContactForm folds the postcode into the message body instead of sending it.
  'contact_messages.postcode',
]);

function readColumnsFromMigrations() {
  const dir = path.join(ROOT, 'supabase', 'migrations');
  const tables = {};
  if (!fs.existsSync(dir)) return tables;
  const ensure = (t) => (tables[t] = tables[t] || new Set());

  for (const file of fs.readdirSync(dir).sort()) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    // CREATE TABLE [IF NOT EXISTS] [public.]name ( ... );
    const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?(\w+)["']?\s*\(([\s\S]*?)\n\s*\)\s*;/gi;
    let m;
    while ((m = createRe.exec(sql))) {
      const set = ensure(m[1]);
      for (const rawLine of m[2].split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('--')) continue;
        const col = /^["']?(\w+)["']?\s+(?!constraint|primary|foreign|unique|check)(\w|[a-z]|\s)/i.exec(line);
        if (!col) continue;
        const kw = col[2].toLowerCase();
        if (['constraint', 'primary', 'foreign', 'unique', 'check'].includes(kw)) continue;
        set.add(col[1]);
      }
    }
    // ALTER TABLE name ADD COLUMN [IF NOT EXISTS] col type
    const alterRe = /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?["']?(\w+)["']?\s+add\s+column\s+(?:if\s+not\s+exists\s+)?["']?(\w+)["']?/gi;
    while ((m = alterRe.exec(sql))) {
      ensure(m[1]).add(m[2]);
    }
  }
  return tables;
}

async function probeGhlCustomFields() {
  console.log(`\n${C.bold}Live GHL custom-field mapping${C.reset}`);
  const token = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) {
    console.log(`  ${C.yellow}!${C.reset} Skipped — GHL_API_KEY / GHL_LOCATION_ID not set in this environment.`);
    return;
  }
  const wanted = {
    GHL_CF_GCLID: 'gclid',
    GHL_CF_POSTCODE: 'postcode',
    GHL_CF_SERVICE_TYPE: 'service_type',
    GHL_CF_ROOF_TYPE: 'roof_type',
    GHL_CF_SERVICE_NEEDED: 'service_needed',
  };
  let fields;
  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: '2021-07-28',
          Accept: 'application/json',
        },
      },
    );
    if (!res.ok) {
      check(false, `GHL customFields returned ${res.status}`, await res.text().catch(() => ''));
      return;
    }
    ({ customFields: fields = [] } = await res.json());
  } catch (err) {
    check(false, 'GHL customFields reachable', err.message);
    return;
  }

  const byId = new Map(fields.map((f) => [f.id, f]));
  for (const [envKey, payloadKey] of Object.entries(wanted)) {
    const id = process.env[envKey];
    if (!id) {
      check(false, `${envKey} is set`, `payload key "${payloadKey}" will be silently dropped by lib/ghl.ts`);
      continue;
    }
    const found = byId.get(id);
    check(
      Boolean(found),
      `${envKey} resolves on location ${locationId}`,
      found ? null : `id ${id} exists on no custom field — "${payloadKey}" arrives blank in GHL`,
    );
    if (found) console.log(`    ${C.dim}→ ${found.name} (${found.fieldKey || found.dataType})${C.reset}`);
  }
}

async function probeLiveSchema() {
  console.log(`\n${C.bold}Live PostgREST schema${C.reset}`);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log(
      `  ${C.yellow}!${C.reset} Skipped — NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY not set in this environment.\n` +
        `    ${C.dim}These live only in the Vercel project, so run this probe there (or export them first).${C.reset}`,
    );
    return;
  }
  let spec;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' },
    });
    if (!res.ok) {
      check(false, `PostgREST spec returned ${res.status}`, await res.text().catch(() => ''));
      return;
    }
    spec = await res.json();
  } catch (err) {
    check(false, 'PostgREST spec reachable', err.message);
    return;
  }
  const defs = spec.definitions || (spec.components && spec.components.schemas) || {};
  for (const route of ROUTES) {
    if (!route.table) continue;
    const def = defs[route.table];
    if (!def || !def.properties) {
      check(false, `${route.table} visible in the live schema`);
      continue;
    }
    const cols = new Set(Object.keys(def.properties));
    const missing = Object.keys(route.payload).filter((k) => !cols.has(k) && !INTENTIONALLY_NOT_STORED.has(`${route.table}.${k}`));
    check(
      missing.length === 0,
      `${route.table}: live schema matches the form payload`,
      missing.length ? `PGRST204 — add column(s): ${missing.join(', ')}` : null,
    );
  }
}

async function fireRealRequest(base) {
  console.log(`\n${C.bold}${C.yellow}Real HTTP fire${C.reset} ${C.dim}→ ${base}${C.reset}`);
  console.log(`  ${C.yellow}!${C.reset} This creates a REAL GHL contact and sends a REAL email.`);
  const stamp = new Date().toISOString();
  for (const route of ROUTES) {
    const payload = {
      ...route.payload,
      name: `ZZ Pipeline Test ${route.name}`,
      email: 'pipeline-test@example.com',
      message: `Automated pipeline self-test at ${stamp}. Safe to ignore.`,
    };
    try {
      const res = await fetch(new URL(`/api/${route.name}`, base), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      console.log(
        `  ${res.ok ? C.green : C.red}${res.status}${C.reset} /api/${route.name} ${C.dim}${JSON.stringify(body)}${C.reset}`,
      );
      if (res.status === 429) {
        console.log(`    ${C.dim}(rate limited — a previous run from this IP was within the hour)${C.reset}`);
      }
    } catch (err) {
      console.log(`  ${C.red}ERR${C.reset} /api/${route.name} — ${err.message}`);
    }
  }
  console.log(
    `  ${C.dim}Now confirm out-of-band: the GHL contact exists, the inbox got the mail, ` +
      `and the ${ROUTES.map((r) => r.table).filter(Boolean).join(' / ')} row is present.${C.reset}`,
  );
}

main().catch((err) => {
  console.error(`${C.red}Harness error:${C.reset}`, err);
  process.exit(1);
});
