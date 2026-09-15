/**
 * scripts/test-sms-notify.js
 *
 * Offline contract test for lib/sms-notify.ts — the owner-notification SMS.
 *
 * WHY THIS EXISTS
 * ---------------
 * The whole design of lib/sms-notify is that it can NEVER affect lead capture:
 * it is called from the three lead routes with `await`, so a throw there would
 * turn a captured lead into a 500. Every claim that makes that safe —
 * "unconfigured is a silent no-op", "a GHL error is returned not thrown",
 * "a DNS failure cannot reject" — is invisible at the call site. This asserts
 * them directly, with `fetch` stubbed, so no network is touched and no text is
 * ever sent.
 *
 * It also pins the UK→E.164 normalisation, because a mis-normalised sender
 * silently resolves to the wrong conversation thread rather than erroring.
 *
 * Usage:  node scripts/test-sms-notify.js
 * Exit:   0 = the contract holds, 1 = a regression.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

const C = { green: '\x1b[32m', red: '\x1b[31m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m' };
let failures = 0;
function check(ok, label, detail) {
  if (ok) console.log(`  ${C.green}✔${C.reset} ${label}`);
  else {
    console.log(`  ${C.red}✘${C.reset} ${label}${detail ? ` ${C.red}— ${detail}${C.reset}` : ''}`);
    failures++;
  }
}

// ── Load the real module, transpiled from source ────────────────────────────
const source = fs.readFileSync(path.join(ROOT, 'lib/sms-notify.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  fileName: 'sms-notify.ts',
});
const mod = { exports: {} };
// eslint-disable-next-line no-new-func
new Function('exports', 'require', 'module', '__filename', '__dirname', outputText)(
  mod.exports, require, mod, 'sms-notify.ts', ROOT,
);
const { notifyOwnerOfLead, toE164 } = mod.exports;

// ── The env this module reads — saved so the run leaves no trace ─────────────
const SMS_KEYS = [
  'SMS_GHL_API_KEY', 'GHL_API_KEY', 'SMS_LOCATION_ID', 'GHL_LOCATION_ID',
  'SMS_SENDER_PHONE', 'MARCUS_PHONE', 'SMS_RECIPIENT_NAME',
];
const savedEnv = {};
for (const k of SMS_KEYS) savedEnv[k] = process.env[k];
const restoreEnv = () => {
  for (const k of SMS_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
};

const realFetch = global.fetch;

(async () => {
  console.log(`${C.bold}Number normalisation${C.reset}`);
  for (const [input, want] of [
    ['+447700900123', '+447700900123'],
    ['07700900123', '+447700900123'],
    ['447700900123', '+447700900123'],
    ['00447700900123', '+447700900123'],
    ['07700 900123', '+447700900123'],
    ['+44 7700 900123', '+447700900123'],
    ['', ''],
  ]) {
    const got = toE164(input);
    check(got === want, `${JSON.stringify(input)} → ${want}`, `got ${JSON.stringify(got)}`);
  }

  console.log(`\n${C.bold}Degrades to a no-op, never a throw${C.reset}`);
  for (const k of SMS_KEYS) delete process.env[k];
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls++; throw new Error('network must not be touched'); };

  const unconfigured = await notifyOwnerOfLead({ name: 'A', source: 'test' });
  check(unconfigured.ok === false && unconfigured.sent === false,
    'nothing configured: resolves ok=false sent=false', JSON.stringify(unconfigured));
  check(unconfigured.reason === 'not configured',
    'nothing configured: reason is "not configured"', JSON.stringify(unconfigured.reason));
  check(fetchCalls === 0, 'nothing configured: zero network calls', `made ${fetchCalls}`);

  // Partially configured is the dangerous state — the token and location look
  // right, so it is tempting to fire. It must still refuse.
  process.env.SMS_GHL_API_KEY = 'pit-not-a-real-token';
  process.env.SMS_LOCATION_ID = 'loc-test';
  process.env.MARCUS_PHONE = '+447700900456';
  fetchCalls = 0;
  const noSender = await notifyOwnerOfLead({ name: 'A', source: 'test' });
  check(noSender.ok === false && fetchCalls === 0,
    'no SMS_SENDER_PHONE: still a no-op', `${JSON.stringify(noSender)} calls=${fetchCalls}`);

  process.env.SMS_SENDER_PHONE = '+447700900123';

  console.log(`\n${C.bold}GHL failures are reported, not thrown${C.reset}`);

  // The single most likely real-world misconfiguration: a token pointed at a
  // location it cannot access. Must not attempt a send afterwards.
  let urls = [];
  global.fetch = async (u) => {
    urls.push(String(u));
    return { status: 403, ok: false, text: async () => '{"message":"Forbidden"}' };
  };
  const upsertForbidden = await notifyOwnerOfLead({ name: 'A', source: 'test' });
  check(upsertForbidden.ok === false && upsertForbidden.sent === false,
    'upsert 403: resolves ok=false sent=false', JSON.stringify(upsertForbidden));
  check(/SMS_LOCATION_ID/.test(upsertForbidden.reason || ''),
    'upsert 403: reason names the location mismatch', upsertForbidden.reason);
  check(urls.length === 1 && !urls.some((u) => u.includes('/conversations/messages')),
    'upsert 403: does NOT go on to attempt a send', urls.join(', '));

  // Contact resolved, send rejected — the "no provisioned number" case that
  // this repo actually hit. The contactId must survive for debugging.
  global.fetch = async (u) => (String(u).includes('/contacts/upsert')
    ? { status: 200, ok: true, text: async () => '{"contact":{"id":"c-123"}}' }
    : { status: 422, ok: false, text: async () => '{"message":"number not provisioned"}' });
  const sendRejected = await notifyOwnerOfLead({ name: 'A', phone: '07700900123', source: 'test' });
  check(sendRejected.ok === false && sendRejected.contactId === 'c-123',
    'send 422: failure reported, contactId preserved', JSON.stringify(sendRejected));
  check(/not provisioned/.test(sendRejected.reason || ''),
    'send 422: GHL’s own message surfaced in reason', sendRejected.reason);

  console.log(`\n${C.bold}Transport faults cannot reject${C.reset}`);
  global.fetch = async () => { throw new Error('getaddrinfo ENOTFOUND services.leadconnectorhq.com'); };
  const dns = await notifyOwnerOfLead({ name: 'A', source: 'test' });
  check(dns.ok === false, 'DNS failure: resolved, did not reject', JSON.stringify(dns));

  global.fetch = async () => { throw new Error('This operation was aborted'); };
  const aborted = await notifyOwnerOfLead({ name: 'A', source: 'test' });
  check(/timed out/.test(aborted.reason || ''),
    'timeout: surfaced as a timeout, not a raw abort string', aborted.reason);

  // A malformed body must not throw on the parse either.
  global.fetch = async () => ({ status: 200, ok: true, text: async () => '<html>gateway error</html>' });
  const garbage = await notifyOwnerOfLead({ name: 'A', source: 'test' });
  check(garbage.ok === false && typeof garbage.reason === 'string',
    'non-JSON 200 body: handled without throwing', JSON.stringify(garbage));

  console.log(`\n${C.bold}Happy path${C.reset}`);
  const seen = [];
  global.fetch = async (u, o) => {
    seen.push({ url: String(u), body: o && o.body ? JSON.parse(o.body) : null, headers: (o && o.headers) || {} });
    return String(u).includes('/contacts/upsert')
      ? { status: 200, ok: true, text: async () => '{"contact":{"id":"c-9"}}' }
      : { status: 201, ok: true, text: async () => '{"conversationId":"conv-1","messageId":"msg-1"}' };
  };
  const sent = await notifyOwnerOfLead({
    name: 'Jane Smith', phone: '07700900123', postcode: 'CW11 4NE',
    service: 'Roof Repair', source: 'quote form',
  });
  check(sent.ok === true && sent.sent === true && sent.messageId === 'msg-1',
    'resolves ok/sent/messageId', JSON.stringify(sent));
  const sendCall = seen.find((s) => s.url.includes('/conversations/messages'));
  check(!!sendCall, 'posts to /conversations/messages');
  check(sendCall && sendCall.body.type === 'SMS', 'payload type is SMS', JSON.stringify(sendCall && sendCall.body));
  check(sendCall && sendCall.body.fromNumber === '+447700900123',
    'payload fromNumber is the configured sender', JSON.stringify(sendCall && sendCall.body.fromNumber));
  check(sendCall && sendCall.body.contactId === 'c-9', 'payload carries the resolved contactId');
  check(sendCall && /New website lead/.test(sendCall.body.message || '') && /Jane Smith/.test(sendCall.body.message || ''),
    'body names the lead', JSON.stringify(sendCall && sendCall.body.message));
  check(sendCall && sendCall.headers.Authorization === `Bearer ${process.env.SMS_GHL_API_KEY}`,
    'send is authenticated with the SMS token');
  check(sendCall && sendCall.headers.Version === '2021-07-28', 'sends the pinned GHL API version');

  restoreEnv();
  global.fetch = realFetch;
  console.log(failures === 0
    ? `\n${C.green}${C.bold}PASS${C.reset} — lib/sms-notify holds its contract.`
    : `\n${C.red}${C.bold}FAIL${C.reset} — ${failures} assertion(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  restoreEnv();
  global.fetch = realFetch;
  console.error(`${C.red}harness error:${C.reset}`, err);
  process.exit(1);
});
