/**
 * scripts/dispatch-owner-sms.js
 *
 * Exercises lib/sms-notify.ts — the REAL owner-notification module — against the
 * live GHL API, and prints the exact HTTP status and response body of every call.
 *
 * WHY THIS IS SEPARATE FROM scripts/test-ghl-sms-live.js
 * -----------------------------------------------------
 * test-ghl-sms-live.js fires a lead at the DEPLOYED website and watches what the
 * running site does. This script calls the dispatch module directly, so it tests
 * the code in this working tree — deployed or not. That distinction matters: the
 * SMS wiring can be verified here the moment the config is right, without
 * waiting on a deploy.
 *
 * WHAT IT PROVES, IN ORDER
 *   1. Config resolves (names only — no secrets are printed).
 *   2. The sender is provisioned in the location.
 *   3. GHL accepts the recipient upsert, returning a contactId in that location.
 *   4. GHL accepts the SMS and returns a messageId.
 *
 * DEFAULT IS A DRY RUN. It performs steps 1–2 (both read-only) and prints the
 * exact payload step 3–4 would send. Pass --send to actually upsert the contact
 * and dispatch a real text.
 *
 * Usage:
 *   node scripts/dispatch-owner-sms.js           # read-only rehearsal
 *   node scripts/dispatch-owner-sms.js --send    # SENDS A REAL SMS
 *   node scripts/dispatch-owner-sms.js --send --message "custom body"
 *
 * Exit: 0 = the dispatch path works (or the rehearsal found nothing wrong),
 *       1 = a failure, with GHL's own status and body shown.
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
const SEND = hasFlag('--send');

const C = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m',
};

const failures = [];
function check(ok, label, detail) {
  if (ok) console.log(`  ${C.green}✔${C.reset} ${label}`);
  else {
    console.log(`  ${C.red}✘${C.reset} ${label}${detail ? ` ${C.red}— ${detail}${C.reset}` : ''}`);
    failures.push(label);
  }
  return ok;
}
const info = (s) => console.log(`  ${C.dim}${s}${C.reset}`);
const warn = (s) => console.log(`  ${C.yellow}⚠${C.reset} ${s}`);

// ── Env (names only are ever printed) ───────────────────────────────────────
function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined && value !== '') process.env[m[1]] = value;
    }
  }
}
loadEnvFiles();

// ── Load the real module from source ────────────────────────────────────────
function loadTs(file) {
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: file,
  });
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', '__filename', '__dirname', outputText)(
    mod.exports, require, mod, file, path.dirname(file),
  );
  return mod.exports;
}

/**
 * Wrap global.fetch so every outbound call is recorded and printed with its
 * status and body. The module's own logging is deliberately quiet about the
 * HTTP detail; the whole point of this script is that detail.
 */
const trace = [];
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  const res = await realFetch(url, opts);
  const clone = res.clone ? res.clone() : res;
  let bodyText = '';
  try { bodyText = await clone.text(); } catch { bodyText = '<unreadable>'; }
  trace.push({ url: String(url), status: res.status, body: bodyText });
  return res;
};

(async () => {
  console.log(`${C.bold}Owner-notification SMS dispatch${C.reset} ${C.dim}(${SEND ? 'LIVE SEND' : 'dry run'})${C.reset}`);

  // ── 1. Config ─────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}1 — configuration${C.reset}`);
  const token = (process.env.SMS_GHL_API_KEY || process.env.GHL_API_KEY || '').trim();
  const locationId = (process.env.SMS_LOCATION_ID || process.env.GHL_LOCATION_ID || '').trim();
  const sender = (process.env.SMS_SENDER_PHONE || '').trim();
  const recipient = (process.env.MARCUS_PHONE || '').trim();
  check(Boolean(token), 'a GHL token is present');
  check(Boolean(locationId), `SMS_LOCATION_ID resolves (${locationId || 'unset'})`);
  check(Boolean(sender), `SMS_SENDER_PHONE resolves (${sender || 'unset'})`);
  check(Boolean(recipient), `MARCUS_PHONE resolves (${recipient || 'unset'})`);
  if (!token || !locationId || !sender || !recipient) {
    console.log(`\n${C.red}${C.bold}FAIL${C.reset} — cannot dispatch without a complete config.`);
    process.exit(1);
  }
  const usingFallback = !process.env.SMS_GHL_API_KEY || !process.env.SMS_LOCATION_ID;
  if (usingFallback) warn('falling back to GHL_API_KEY / GHL_LOCATION_ID — the SMS account may differ from the CRM account');

  // ── 2. Sender is provisioned ──────────────────────────────────────────────
  console.log(`\n${C.bold}2 — sender is provisioned in this location${C.reset}`);
  const numRes = await realFetch(
    `https://services.leadconnectorhq.com/phone-system/numbers?locationId=${encodeURIComponent(locationId)}`,
    { headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', Accept: 'application/json' } },
  );
  const numBody = await numRes.text();
  const digits = (s) => String(s || '').replace(/\D/g, '').slice(-9);
  let provisioned = [];
  try {
    const parsed = JSON.parse(numBody);
    provisioned = (parsed.phoneNumbers || []).map((n) => n.value || n.phoneNumber || n.number);
  } catch { /* fall through to the failed check below */ }
  check(numRes.status === 200, `phone numbers list (HTTP ${numRes.status})`, numBody.slice(0, 160));
  for (const n of provisioned) info(`· ${n}`);
  check(
    provisioned.some((n) => digits(n) === digits(sender)),
    `${sender} is provisioned here`,
    `provisioned: ${provisioned.join(', ') || 'none'}`,
  );
  if (failures.length) {
    console.log(`\n${C.red}${C.bold}ABORTED${C.reset} — dispatch cannot succeed; fix the above first.`);
    console.log(`  ${C.dim}No SMS was sent. Run: node scripts/probe-sms-account.js${C.reset}`);
    process.exit(1);
  }

  // ── 3 + 4. The real dispatch ──────────────────────────────────────────────
  const lead = {
    name: 'Pipeline Test',
    phone: '07700 900123',
    postcode: 'CW11 4NE',
    service: 'Roof Inspection',
    source: 'dispatch-owner-sms.js',
  };
  const message = flagValue('--message');

  if (!SEND) {
    console.log(`\n${C.bold}3 — recipient upsert${C.reset} ${C.dim}(not sent)${C.reset}`);
    info(`POST /contacts/upsert  locationId=${locationId}  phone=${recipient}`);
    console.log(`\n${C.bold}4 — SMS dispatch${C.reset} ${C.dim}(not sent)${C.reset}`);
    info(`POST /conversations/messages  type=SMS  from=${sender}  to=${recipient}(via contact)`);
    if (message) info(`message: ${message}`);
    console.log(`\n${C.yellow}${C.bold}DRY RUN${C.reset} — nothing was sent. Re-run with ${C.bold}--send${C.reset} to dispatch a real text.`);
    process.exit(0);
  }

  console.log(`\n${C.bold}3+4 — dispatching${C.reset}`);
  const { notifyOwnerOfLead } = loadTs(path.join(ROOT, 'lib/sms-notify.ts'));
  const result = await notifyOwnerOfLead(message ? { ...lead, source: message } : lead);

  console.log(`\n${C.bold}GHL HTTP trace${C.reset} ${C.dim}(exactly what the API returned)${C.reset}`);
  for (const call of trace) {
    const short = call.url.replace('https://services.leadconnectorhq.com', '');
    console.log(`  ${C.bold}${call.status}${C.reset} ${short}`);
    console.log(`    ${C.dim}${call.body.slice(0, 400)}${C.reset}`);
  }

  console.log(`\n${C.bold}Result${C.reset}`);
  check(result.sent === true, 'GHL accepted the SMS', result.reason);
  if (result.contactId) info(`contactId      ${result.contactId}`);
  if (result.conversationId) info(`conversationId ${result.conversationId}`);
  if (result.messageId) info(`messageId      ${result.messageId}`);

  console.log(failures.length === 0
    ? `\n${C.green}${C.bold}PASS${C.reset} — dispatched from ${sender} to ${recipient}.`
    : `\n${C.red}${C.bold}FAIL${C.reset} — ${failures.join('; ')}`);
  process.exit(failures.length === 0 ? 0 : 1);
})().catch((err) => {
  global.fetch = realFetch;
  console.error(`${C.red}harness error:${C.reset}`, err);
  process.exit(1);
});
