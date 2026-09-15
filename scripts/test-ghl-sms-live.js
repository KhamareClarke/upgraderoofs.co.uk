/**
 * scripts/test-ghl-sms-live.js
 *
 * End-to-end proof that a website lead produces a real outbound SMS in GHL.
 *
 * WHY THIS EXISTS
 * ---------------
 * The naive version of this test — POST a lead, check `response.ok`, print
 * "check your phone" — cannot fail. `/api/send-contact` returns a decoy
 * `200 {success:true}` for every submission the spam filter, the too-fast
 * heuristic or content validation rejects (route.ts:56, :92, :116), and the
 * speed-to-lead trigger is fire-and-forget, never awaited (:161), so its result
 * is not in the response at all. A green run of that test proves nothing about
 * whether an SMS was sent. This script instead asserts on the *body* and then
 * confirms the message exists in GHL via the conversations API.
 *
 * THE THREE GATES THIS CHECKS, IN ORDER
 * -------------------------------------
 *   1. A speed-to-lead workflow is configured  (GHL_SPEED_TO_LEAD_WORKFLOW_ID)
 *   2. The lead actually reached GHL           (body.ghl === 'ok', not a decoy)
 *   3. An outbound SMS exists on the contact's conversation after the fire time
 *
 * Gate 1 is checked *before* anything is sent, because with it unset
 * `triggerSpeedToLead` returns { triggered: false, reason: '...not set' } and
 * no SMS is dispatched — yet the HTTP response is still a normal success.
 *
 * USAGE
 * -----
 *   node scripts/test-ghl-sms-live.js                 # preflight only, no side effects
 *   node scripts/test-ghl-sms-live.js --fire          # + send a REAL lead, then verify
 *   node scripts/test-ghl-sms-live.js --fire --url http://localhost:3000
 *   node scripts/test-ghl-sms-live.js --check-only    # verify the newest SMS, send nothing
 *
 * `--fire` is required for anything outbound. Without it this script makes no
 * writes here and only performs read-only GETs against GHL.
 *
 * WHAT --fire ACTUALLY DOES (all real, all outward-facing):
 *   · creates/updates a contact in your live GHL location
 *   · sends a real notification email to the business inbox
 *   · can trigger a real SMS, depending on how the workflow is built
 *
 * NOTE ON WHO RECEIVES THE SMS
 * ----------------------------
 * This submits the lead with Marcus's number as the *contact* phone, on the
 * assumption the workflow texts the contact. If your workflow instead notifies
 * the business owner internally, the contact's conversation will exist but hold
 * no outbound SMS — this script reports that case explicitly (see the
 * "conversation exists but no outbound SMS" branch) rather than calling it a
 * failure of the pipeline.
 *
 * RATE LIMITS
 * -----------
 * /api/send-contact allows 3 submissions per IP per hour, and a repeat from the
 * same identity within 3s gets a decoy 200 with nothing dispatched. Running
 * --fire repeatedly will start returning 429, or worse, a silent no-op that
 * looks identical to success. This script detects the decoy and says so.
 *
 * Exit: 0 = an outbound SMS was confirmed, 1 = it was not (or a gate failed).
 */

const fs = require('fs');
const path = require('path');

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
  cyan: '\x1b[36m',
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
function warn(label) {
  console.log(`  ${C.yellow}⚠${C.reset} ${label}`);
}
function info(label) {
  console.log(`  ${C.dim}${label}${C.reset}`);
}

const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

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

function ghlHeaders() {
  return {
    Authorization: `Bearer ${(process.env.GHL_API_KEY || '').trim()}`,
    Version: API_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function ghl(method, urlPath, body) {
  try {
    const res = await fetch(`${GHL_BASE}${urlPath}`, {
      method,
      headers: ghlHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Normalise a UK number to E.164 so GHL stores and matches it predictably. */
function toE164(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0044')) return `+44${digits.slice(4).replace(/^0/, '')}`;
  if (digits.startsWith('44')) return `+${digits}`;
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`;
  return `+${digits}`;
}

/** GHL returns dateAdded as ISO or epoch — accept both. */
function toMillis(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n) && value.trim() !== '') return n;
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

// ── Gate 1: a speed-to-lead workflow exists and is configured ────────────────
async function preflightWorkflow() {
  console.log(`${C.bold}Gate 1 — speed-to-lead workflow configured${C.reset}`);

  if (!process.env.GHL_LOCATION_ID || !process.env.GHL_API_KEY) {
    check(false, 'GHL_LOCATION_ID and GHL_API_KEY are set', 'cannot reach GHL without them');
    return null;
  }

  const res = await ghl('GET', `/workflows/?locationId=${encodeURIComponent(process.env.GHL_LOCATION_ID)}`);
  if (!check(res.ok, `workflows list reachable (HTTP ${res.status})`, res.error || JSON.stringify(res.data).slice(0, 200))) {
    return null;
  }

  const workflows = (res.data && res.data.workflows) || [];
  const configuredId = (process.env.GHL_SPEED_TO_LEAD_WORKFLOW_ID || '').trim();

  if (workflows.length === 0) {
    check(
      false,
      'at least one workflow exists in the GHL location',
      'the location has ZERO workflows — there is nothing for speed-to-lead to enrol into',
    );
    console.log('');
    console.log(`  ${C.yellow}To fix:${C.reset} build the speed-to-lead workflow in the GHL UI`);
    console.log(`  ${C.dim}(Automation → Workflows → Create). The API can list and enrol contacts,${C.reset}`);
    console.log(`  ${C.dim}but it cannot create a workflow. Then set in .env.local:${C.reset}`);
    console.log(`  ${C.dim}    GHL_SPEED_TO_LEAD_WORKFLOW_ID=<id from the workflow URL>${C.reset}`);
    return null;
  }

  info(`${workflows.length} workflow(s) found in the location:`);
  for (const w of workflows) console.log(`    ${C.dim}· ${w.id}  ${w.name}${C.reset}`);

  if (!configuredId) {
    check(
      false,
      'GHL_SPEED_TO_LEAD_WORKFLOW_ID is set',
      'triggerSpeedToLead returns {triggered:false,"...not set"} and no SMS is ever sent',
    );
    return null;
  }
  check(true, `GHL_SPEED_TO_LEAD_WORKFLOW_ID is set (${configuredId})`);

  // A stale id is the silent killer here: the API 404s, triggerSpeedToLead
  // reports it to a console.log nobody reads, and the HTTP response is still a
  // clean success. Resolve it against the live list instead of trusting it.
  const match = workflows.find((w) => w.id === configuredId);
  check(
    Boolean(match),
    'the configured id resolves to a real workflow',
    match ? null : `id ${configuredId} exists on no workflow — "speed to lead" would silently no-op`,
  );
  if (match) info(`→ ${match.name}`);

  return match ? configuredId : null;
}

// ── Gate 1b: can we read the SMS back afterwards? ────────────────────────────
async function preflightConversations() {
  console.log(`\n${C.bold}Gate 1b — conversations readable (needed to verify)${C.reset}`);
  const res = await ghl(
    'GET',
    `/conversations/search?locationId=${encodeURIComponent(process.env.GHL_LOCATION_ID)}&limit=1`,
  );
  if (res.status === 401 || res.status === 403) {
    check(false, 'private integration token can read conversations', `HTTP ${res.status} — add the conversations scope in GHL`);
    return false;
  }
  return check(res.ok, `conversations/search reachable (HTTP ${res.status})`, res.error || JSON.stringify(res.data).slice(0, 200));
}

// ── Gate 2: fire a real lead and prove it reached GHL ────────────────────────
async function fireLead(base, payload) {
  console.log(`\n${C.bold}Gate 2 — lead reaches GHL${C.reset}`);
  console.log(`  ${C.yellow}!${C.reset} Firing a REAL lead at ${base}`);
  console.log(`  ${C.dim}creates a real GHL contact and sends a real notification email${C.reset}`);

  const fireTime = Date.now();
  let res, body;
  try {
    res = await fetch(new URL('/api/send-contact', base), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    body = await res.json().catch(() => ({}));
  } catch (err) {
    check(false, 'POST /api/send-contact reachable', err.message);
    return { ok: false, fireTime };
  }

  if (res.status === 429) {
    check(false, 'not rate limited', '3 submissions per IP per hour — wait, or fire from another IP');
    return { ok: false, fireTime };
  }
  if (res.status === 502) {
    check(false, 'lead was captured', 'HTTP 502 — GHL AND SMTP both failed, the lead was lost');
    return { ok: false, fireTime };
  }
  check(res.status === 200, `HTTP 200 (got ${res.status})`, JSON.stringify(body).slice(0, 200));

  // The decoy check. A spam/too-fast rejection returns 200 {success:true} with
  // NO `ghl` key; the genuine path always sets it. This is the assertion the
  // naive version of this script was missing.
  if (body.ghl === undefined) {
    check(
      false,
      'response is a real delivery, not a decoy',
      `body has no "ghl" key — this is the silent-drop response (spam filter, or a repeat ` +
        `within 3s). success:true here means NOTHING was sent.`,
    );
    return { ok: false, fireTime };
  }

  check(
    body.ghl === 'ok',
    'body.ghl === "ok" (lead is in the CRM)',
    `got "${body.ghl}" — the contact was not created, so no workflow could run`,
  );
  if (body.email === 'failed') warn(`notification email failed: ${body.email_error || 'unknown'}`);

  return { ok: body.ghl === 'ok', fireTime };
}

// ── Gate 3: an outbound SMS actually exists ──────────────────────────────────
async function findContactByEmail(email) {
  const q = encodeURIComponent(email);
  const res = await ghl('GET', `/contacts/?locationId=${encodeURIComponent(process.env.GHL_LOCATION_ID)}&query=${q}`);
  if (!res.ok) return { ok: false, status: res.status };
  const contacts = (res.data && res.data.contacts) || [];
  // `query` is a fuzzy text search — pin it to an exact email match.
  const exact = contacts.find((c) => (c.email || '').toLowerCase() === email.toLowerCase());
  return { ok: true, contact: exact || contacts[0] || null };
}

async function verifySms(email, fireTime, timeoutMs) {
  console.log(`\n${C.bold}Gate 3 — an outbound SMS exists${C.reset}`);

  const found = await findContactByEmail(email);
  if (!check(found.ok && Boolean(found.contact), 'contact resolves in GHL by email', found.ok ? 'no contact matched — the lead did not land' : `contacts search HTTP ${found.status}`)) {
    return false;
  }
  const contact = found.contact;
  info(`contact ${contact.id} (${contact.phone || 'no phone'})`);

  const convRes = await ghl(
    'GET',
    `/conversations/search?locationId=${encodeURIComponent(process.env.GHL_LOCATION_ID)}&contactId=${encodeURIComponent(contact.id)}`,
  );
  const conversations = (convRes.data && convRes.data.conversations) || [];
  if (!check(conversations.length > 0, 'a conversation exists for the contact', 'no conversation — no message of any kind was logged')) {
    return false;
  }

  // Workflows are asynchronous; poll rather than sampling once.
  // Allow 60s of clock skew: GHL's dateAdded and this machine's clock are not
  // guaranteed to agree, and a false negative here would be misleading.
  const since = fireTime - 60_000;
  const deadline = Date.now() + timeoutMs;
  let sawAnyOutbound = false;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    const msgs = [];
    for (const conv of conversations) {
      const r = await ghl('GET', `/conversations/${encodeURIComponent(conv.id)}/messages?limit=20&type=TYPE_SMS`);
      if (r.ok) msgs.push(...((r.data && r.data.messages && r.data.messages.messages) || []));
    }

    const outbound = msgs.filter((m) => {
      const isSms = m.messageType === 'SMS' || m.type === 'TYPE_SMS';
      const isOut = String(m.direction || '').toLowerCase() === 'outbound';
      const t = toMillis(m.dateAdded);
      return isSms && isOut && t !== null && t >= since;
    });
    if (outbound.length > 0) sawAnyOutbound = true;

    if (outbound.length > 0) {
      const m = outbound[outbound.length - 1];
      check(true, `outbound SMS found (after ${attempt} poll${attempt === 1 ? '' : 's'})`);
      console.log(`    ${C.dim}body: ${String(m.body || '').slice(0, 160)}${C.reset}`);
      console.log(`    ${C.dim}status: ${m.status || 'n/a'}  at: ${new Date(toMillis(m.dateAdded)).toISOString()}${C.reset}`);
      return true;
    }

    if (Date.now() < deadline) {
      process.stdout.write(`  ${C.dim}· poll ${attempt}: no outbound SMS yet, retrying…${C.reset}\r`);
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }

  process.stdout.write(' '.repeat(70) + '\r');
  check(false, `outbound SMS found within ${Math.round(timeoutMs / 1000)}s`, 'timed out');

  // Distinguish "workflow never ran" from "workflow ran but notifies someone
  // else" — different problems with different fixes.
  if (!sawAnyOutbound) {
    console.log('');
    warn('The conversation exists but holds no outbound SMS after the fire time.');
    console.log(`  ${C.dim}Either the workflow did not enrol this contact, or its SMS step texts the${C.reset}`);
    console.log(`  ${C.dim}business owner internally rather than this contact. Check the workflow's${C.reset}`);
    console.log(`  ${C.dim}enrolment trigger and its SMS action recipient in the GHL UI.${C.reset}`);
  }
  return false;
}

async function main() {
  loadEnvFiles();

  const base = flagValue('--url') || 'https://www.upgraderoofs.co.uk';
  const shouldFire = hasFlag('--fire');
  const checkOnly = hasFlag('--check-only');
  const timeoutMs = Number(flagValue('--timeout') || 120) * 1000;
  const phone = toE164(flagValue('--phone') || process.env.MARCUS_PHONE || '07379440583');

  console.log(`${C.bold}GHL SMS live verification${C.reset}`);
  console.log(`${C.dim}location ${process.env.GHL_LOCATION_ID || '<unset>'}  ·  base ${base}  ·  target ${phone}${C.reset}\n`);

  const workflowId = await preflightWorkflow();
  const canRead = await preflightConversations();

  const payload = {
    // A fixed identity, so repeat runs upsert one test contact instead of
    // littering the CRM with a new one per invocation.
    name: flagValue('--name') || 'Test Lead',
    email: flagValue('--email') || 'test@upgraderoofs.co.uk',
    phone,
    subject: 'SMS pipeline verification',
    service_needed: 'Roof Inspection',
    message: `Automated speed-to-lead SMS verification. Safe to ignore. (${new Date().toISOString()})`,
  };

  if (checkOnly) {
    console.log(`\n${C.bold}--check-only${C.reset} ${C.dim}— skipping the fire, verifying the newest SMS only${C.reset}`);
    await verifySms(payload.email, 0, timeoutMs);
  } else if (!shouldFire) {
    console.log(`\n${C.yellow}Preflight only.${C.reset} Nothing was sent.`);
    console.log(`  ${C.dim}Re-run with ${C.reset}--fire${C.dim} to send a real lead and verify the SMS end to end.${C.reset}`);
    if (failures.length === 0) {
      console.log(`\n${C.green}${C.bold}PREFLIGHT PASS${C.reset} — gates 1 and 1b are satisfied; --fire would exercise the pipeline.`);
      process.exit(0);
    }
  } else if (!workflowId && !hasFlag('--force')) {
    console.log(`\n${C.red}${C.bold}ABORTED${C.reset} — refusing to fire a lead that cannot produce an SMS (gate 1 failed).`);
    console.log(`  ${C.dim}--force fires anyway, to exercise contact/opportunity ingestion only.${C.reset}`);
    console.log(`  ${C.dim}The SMS assertion is still evaluated, and will still fail.${C.reset}`);
  } else {
    if (!workflowId) {
      warn('--force: firing without a configured workflow. Ingestion will be tested;');
      warn('no SMS can be produced, so gate 3 is expected to fail.');
    }
    const fired = await fireLead(base, payload);
    if (fired.ok && canRead) await verifySms(payload.email, fired.fireTime, timeoutMs);
    else if (fired.ok && !canRead) warn('skipping verification — the token cannot read conversations');
  }

  console.log('');
  if (failures.length === 0) {
    console.log(`${C.green}${C.bold}PASS${C.reset} — an outbound SMS was confirmed in GHL.`);
    process.exit(0);
  }
  console.log(`${C.red}${C.bold}FAIL${C.reset} — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.log(`  ${C.red}·${C.reset} ${f}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`${C.red}Harness error:${C.reset}`, err);
  process.exit(1);
});
