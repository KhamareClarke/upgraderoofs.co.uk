/**
 * scripts/probe-sms-account.js
 *
 * Read-only preflight for the DEDICATED SMS SUB-ACCOUNT.
 *
 * WHY THIS IS SEPARATE FROM scripts/test-ghl-sms-live.js
 * -----------------------------------------------------
 * That harness checks the PRIMARY location (`GHL_API_KEY` / `GHL_LOCATION_ID`),
 * which is where leads are written. SMS dispatch is intended to run from a
 * *different* sub-account (`SMS_GHL_API_KEY` / `SMS_LOCATION_ID`). These are
 * different credentials against different locations, and the primary token
 * cannot see the SMS account at all — so "the pipeline works" and "the SMS
 * account is provisioned" are two independent questions.
 *
 * Nothing here writes. Every call is a GET, so it is safe to run at any time.
 *
 * THE FOUR THINGS THAT MUST ALL HOLD BEFORE DISPATCH CODE IS WORTH WRITING
 * -----------------------------------------------------------------------
 *   1. SMS_GHL_API_KEY has access to SMS_LOCATION_ID
 *   2. SMS_SENDER_PHONE is a real, provisioned number in that location
 *   3. Marcus exists as a contact IN THAT LOCATION — GHL's send-message API
 *      needs a contactId, and a contactId from the primary location is
 *      meaningless here
 *   4. A workflow exists there, if you intend to drive SMS by workflow rather
 *      than by direct conversation dispatch
 *
 * A failure on 1-3 makes direct dispatch impossible no matter what the code
 * does. A failure on 4 only matters if you are using the workflow path.
 *
 * Usage:
 *   node scripts/probe-sms-account.js
 *
 * The SMS token cannot reveal its own location id — every GHL endpoint demands
 * a locationId you must already know, and this token 403s on /locations/search.
 * So SMS_LOCATION_ID has to come from the GHL UI (Settings → Business Profile).
 *
 * Exit: 0 = every check passed, 1 = something needs fixing in GHL.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

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
function info(label) {
  console.log(`  ${C.dim}${label}${C.reset}`);
}
/** Advisory — printed, never affects the exit code. */
function warn(label) {
  console.log(`  ${C.yellow}⚠${C.reset} ${label}`);
}

function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!m) continue; // commented-out keys are skipped
      const value = m[2].trim().replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined && value !== '') process.env[m[1]] = value;
    }
  }
}

/** Digits only, last 9 — so +447700900123, 07700900123 and 447700900123 all match. */
function phoneKey(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : d;
}

/**
 * The number out of a /phone-system/numbers entry.
 *
 * GHL returns `{sid, value, title}` — `value` holds the number. Reading only
 * `phoneNumber`/`number` (as this did) yields undefined for every entry, which
 * makes the match below compare '' against the sender and report a FALSE
 * NEGATIVE on a correctly provisioned number. Verified against a live response
 * on 2026-09-15; keep `value` first.
 */
function numberValue(n) {
  return n && (n.value || n.phoneNumber || n.number || n.phone);
}

async function ghl(token, urlPath) {
  try {
    const res = await fetch(`https://services.leadconnectorhq.com${urlPath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: '2021-07-28',
        Accept: 'application/json',
      },
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  loadEnvFiles();

  const token = (process.env.SMS_GHL_API_KEY || '').trim();
  const locationId = (process.env.SMS_LOCATION_ID || '').trim();
  const sender = (process.env.SMS_SENDER_PHONE || '').trim();
  const marcus = (process.env.MARCUS_PHONE || '').trim();

  console.log(`${C.bold}SMS sub-account preflight${C.reset} ${C.dim}(read-only)${C.reset}\n`);

  console.log(`${C.bold}Configuration${C.reset}`);
  check(Boolean(token), 'SMS_GHL_API_KEY is set', 'absent — nothing can be dispatched');
  check(
    Boolean(locationId),
    'SMS_LOCATION_ID is set',
    'absent — GHL requires a locationId on every endpoint; find it in GHL → Settings → Business Profile',
  );
  check(Boolean(sender), 'SMS_SENDER_PHONE is set', 'absent — there would be no number to send from');
  check(Boolean(marcus), 'MARCUS_PHONE is set', 'absent — no notification recipient');
  if (sender) info(`sender  : ${sender}`);
  if (marcus) info(`recipient: ${marcus}`);

  if (!token || !locationId || !sender) {
    console.log(`\n${C.yellow}Cannot proceed — fill the values above in .env.local first.${C.reset}`);
    finish();
    return;
  }

  // ── 1. Token access ───────────────────────────────────────────────────────
  console.log(`\n${C.bold}1 — token access to the SMS location${C.reset}`);
  const loc = await ghl(token, `/locations/${encodeURIComponent(locationId)}`);
  if (loc.status === 403) {
    check(false, 'SMS_GHL_API_KEY can access SMS_LOCATION_ID', 'HTTP 403 — the token belongs to a different sub-account');
  } else if (check(loc.ok, `location resolves (HTTP ${loc.status})`, loc.error || JSON.stringify(loc.data).slice(0, 160))) {
    const l = loc.data && loc.data.location;
    if (l) info(`${l.name} · ${l.city || ''} ${l.country || ''} · ${l.phone || 'no phone'}`);
  }

  // ── 2. Is the sender a real number in this location? ──────────────────────
  console.log(`\n${C.bold}2 — SMS_SENDER_PHONE is provisioned here${C.reset}`);
  const nums = await ghl(token, `/phone-system/numbers?locationId=${encodeURIComponent(locationId)}`);
  if (check(nums.ok, `phone numbers list reachable (HTTP ${nums.status})`, JSON.stringify(nums.data).slice(0, 160))) {
    const list = (nums.data && nums.data.phoneNumbers) || [];
    info(`${list.length} number(s) in this location`);
    for (const n of list) info(`  · ${numberValue(n) || JSON.stringify(n)}${n.title ? `  (${n.title})` : ''}`);
    const match = list.find((n) => phoneKey(numberValue(n)) === phoneKey(sender));
    check(
      Boolean(match),
      `${sender} is a provisioned sending number`,
      list.length === 0
        ? 'this location has ZERO numbers — SMS cannot be sent from it at all'
        : `not among the ${list.length} number(s) above — dispatch would fail`,
    );
  }

  // ── 3. Marcus as a contact in THIS location ───────────────────────────────
  console.log(`\n${C.bold}3 — Marcus exists as a contact here${C.reset}`);
  info('GHL send-message needs a contactId from THIS location; a primary-location id is meaningless');
  const contacts = await ghl(token, `/contacts/?locationId=${encodeURIComponent(locationId)}&query=${encodeURIComponent(marcus)}`);
  if (check(contacts.ok, `contacts search reachable (HTTP ${contacts.status})`, JSON.stringify(contacts.data).slice(0, 160))) {
    const found = (contacts.data && contacts.data.contacts) || [];
    const exact = found.find((c) => phoneKey(c.phone) === phoneKey(marcus));
    if (exact) {
      check(true, `a contact for ${marcus} exists`);
      info(`contact ${exact.id} · ${exact.contactName || exact.firstName || ''} ${exact.phone || ''}`);
    } else {
      // Deliberately a warning, not a failure. lib/sms-notify.ts upserts the
      // recipient as a contact before every send, precisely because the SMS
      // sub-account is usually NOT where the owner already lives — here it
      // holds scraped business leads and nothing else. Flagging this as a hard
      // failure would report "not ready" on a path that is in fact ready, and
      // train the reader to ignore the exit code.
      warn(`no contact for ${marcus} here yet — not a blocker: lib/sms-notify.ts upserts him on first send`);
    }
  }

  // ── 4. Workflow path (only needed if not dispatching directly) ────────────
  console.log(`\n${C.bold}4 — workflow availability (optional path)${C.reset}`);
  const wf = await ghl(token, `/workflows/?locationId=${encodeURIComponent(locationId)}`);
  if (check(wf.ok, `workflows list reachable (HTTP ${wf.status})`, JSON.stringify(wf.data).slice(0, 160))) {
    const list = (wf.data && wf.data.workflows) || [];
    if (list.length === 0) {
      console.log(`  ${C.yellow}⚠${C.reset} 0 workflows here — the workflow path is unavailable; direct dispatch is the only option`);
    } else {
      info(`${list.length} workflow(s):`);
      for (const w of list) info(`  · ${w.id}  ${w.name}`);
      const configured = (process.env.GHL_SPEED_TO_LEAD_WORKFLOW_ID || '').trim();
      if (!configured) {
        console.log(`  ${C.yellow}⚠${C.reset} GHL_SPEED_TO_LEAD_WORKFLOW_ID not set — pick one above`);
      } else {
        check(list.some((w) => w.id === configured), 'configured workflow id resolves here', `id ${configured} not found in this location`);
      }
    }
  }

  finish();
}

function finish() {
  console.log('');
  if (failures.length === 0) {
    console.log(`${C.green}${C.bold}PASS${C.reset} — the SMS sub-account is provisioned for dispatch.`);
    process.exit(0);
  }
  console.log(`${C.red}${C.bold}FAIL${C.reset} — ${failures.length} check(s) need fixing in GHL:`);
  for (const f of failures) console.log(`  ${C.red}·${C.reset} ${f}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`${C.red}Probe error:${C.reset}`, err);
  process.exit(1);
});
