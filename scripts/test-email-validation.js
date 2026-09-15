/**
 * scripts/test-email-validation.js
 *
 * False-positive guard for lib/lead-validation.ts.
 *
 * WHY THIS EXISTS
 * ---------------
 * A route treats a content-validation failure as spam: it returns
 * `200 {success:true}` and drops the lead. Nobody sees it — not the customer,
 * not the client, not any log. So a validator that is too strict does not
 * "reduce spam", it silently deletes real customers.
 *
 * That is not hypothetical. ROLE_ADDRESS_PREFIX previously rejected `hello@`
 * (a common personal Gmail local-part) alongside `info@`, `sales@`, `office@`,
 * `enquiries@` and `quotes@` — all normal addresses for exactly the customers
 * this business wants, since landlords, letting agents and builders write from
 * them. DISPOSABLE_DOMAINS listed `mailbox.org`, a paid privacy provider
 * comparable to ProtonMail. Together they discarded 10 of 14 plausible customer
 * addresses tested.
 *
 * Every case below marked `pass` is an address a real customer could hold. If
 * one of them starts failing, the fix is to narrow the rule — never to
 * reclassify the customer as spam.
 *
 * Run:  node scripts/test-email-validation.js
 * Exit: 0 = no false positives, 1 = a real address is being discarded.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

function loadRealValidator() {
  const source = fs.readFileSync(path.join(ROOT, 'lib', 'lead-validation.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: 'lead-validation.ts',
  });
  const module_ = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', outputText)(module_.exports, require, module_);
  return module_.exports;
}

const v = loadRealValidator();

// ── Cases ───────────────────────────────────────────────────────────────────
const CASES = [
  // --- Consumer mailboxes a customer really uses ---------------------------
  { expect: 'pass', email: 'john.smith@gmail.com', why: 'plain Gmail' },
  { expect: 'pass', email: 'sarah.jones@yahoo.co.uk', why: 'Yahoo UK' },
  { expect: 'pass', email: 'd.wilson@outlook.com', why: 'Outlook' },
  { expect: 'pass', email: 'michael.brown@btinternet.com', why: 'BT Internet' },
  { expect: 'pass', email: 'emma.taylor@hotmail.com', why: 'Hotmail' },
  { expect: 'pass', email: 'chris+roof@gmail.com', why: 'plus-addressed Gmail' },
  { expect: 'pass', email: 'anna@protonmail.com', why: 'paid privacy provider' },
  { expect: 'pass', email: 'mike@mailbox.org', why: 'mailbox.org is paid, NOT disposable' },
  { expect: 'pass', email: "sean.o'brien@yahoo.co.uk", why: 'apostrophe in local part' },

  // --- Business addresses a customer legitimately writes from --------------
  { expect: 'pass', email: 'hello@gmail.com', why: 'hello@ is a PERSONAL local-part too' },
  { expect: 'pass', email: 'info@smithproperties.co.uk', why: 'landlord' },
  { expect: 'pass', email: 'sales@northwichbuilders.co.uk', why: 'trade customer' },
  { expect: 'pass', email: 'office@cheshirelettings.co.uk', why: 'letting agent' },
  { expect: 'pass', email: 'enquiries@mpdevelopments.co.uk', why: 'developer' },
  { expect: 'pass', email: 'quotes@rpcontracts.co.uk', why: 'procurement dept' },
  { expect: 'pass', email: 'team@wilsonpartnership.co.uk', why: 'family firm' },
  { expect: 'pass', email: 'mail@andersonassociates.co.uk', why: 'small firm' },
  { expect: 'pass', email: 'admin@brownsjoinery.co.uk', why: 'sole trader' },
  { expect: 'pass', email: 'accounts@haleconservatories.co.uk', why: 'accounts dept' },

  // --- Genuinely not a customer: must still be rejected --------------------
  { expect: 'drop', email: 'bot@mailinator.com', why: 'disposable' },
  { expect: 'drop', email: 'x@tempmail.com', why: 'disposable' },
  { expect: 'drop', email: 'x@guerrillamail.com', why: 'disposable' },
  { expect: 'drop', email: 'noreply@upgraderoofs.co.uk', why: 'no reply is ever read' },
  { expect: 'drop', email: 'no-reply@example.com', why: 'no reply is ever read' },
  { expect: 'drop', email: 'postmaster@example.com', why: 'mechanical mailbox' },
  { expect: 'drop', email: 'abuse@example.com', why: 'mechanical mailbox' },
  { expect: 'drop', email: 'not-an-email', why: 'malformed' },
  { expect: 'drop', email: 'missing@tld', why: 'malformed' },
  { expect: 'drop', email: '', why: 'blank' },
];

const C = { green: '\x1b[32m', red: '\x1b[31m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m' };

console.log(`${C.bold}Field-validation false-positive guard${C.reset} ${C.dim}(executing real lib/lead-validation.ts)${C.reset}\n`);

let bad = 0;
for (const c of CASES) {
  const reason = v.invalidEmailReason(c.email);
  const actual = reason ? 'drop' : 'pass';
  const ok = actual === c.expect;
  if (!ok) bad += 1;
  const tag = ok ? `${C.green}✔${C.reset}` : `${C.red}✘${C.reset}`;
  const note = ok
    ? `${C.dim}${c.why}${C.reset}`
    : `${C.red}expected ${c.expect.toUpperCase()} — ${reason || 'passed'} (${c.why})${C.reset}`;
  console.log(`  ${tag} [${(actual === 'drop' ? 'DROPPED' : 'passes ')}] ${String(c.email || '(blank)').padEnd(34)} ${note}`);
}

// The per-form rules are the other half of the contract: a form must only be
// asked for fields it actually collects.
console.log(`\n${C.bold}Per-form field rules${C.reset}`);
const RULES = [
  { form: 'contact', sent: { name: 'Sarah Jones', email: 'name@yahoo.co.uk', phone: '01614800123', subject: 's', message: 'm' }, expect: 0, why: 'contact form sends no postcode — it folds it into the message' },
  { form: 'specialOffer', sent: { name: 'David Wilson', phone: '07700900456', postcode: 'WA16 6AA' }, expect: 0, why: 'offer form Email field is optional' },
  { form: 'quote', sent: { name: 'John Smith', phone: '07700900123', postcode: 'CW11 4NE' }, expect: 0, why: 'quote form email is optional' },
  { form: 'quote', sent: { name: 'John Smith', phone: '07700900123' }, expect: 1, why: 'missing postcode must be caught' },
  { form: 'contact', sent: { name: 'Sarah Jones' }, expect: 1, why: 'missing email must be caught' },
];
for (const r of RULES) {
  const reasons = v.validateLeadFields(r.sent, v.FORM_FIELD_RULES[r.form]);
  const ok = reasons.length === r.expect;
  if (!ok) bad += 1;
  console.log(
    `  ${ok ? `${C.green}✔${C.reset}` : `${C.red}✘${C.reset}`} ${r.form.padEnd(13)} ` +
      `${C.dim}${r.why}${C.reset}${ok ? '' : ` ${C.red}— got [${reasons.join('; ')}]${C.reset}`}`,
  );
}

console.log('');
if (bad === 0) {
  console.log(`${C.green}${C.bold}PASS${C.reset} — no legitimate customer address is discarded.`);
  process.exit(0);
}
console.log(`${C.red}${C.bold}FAIL${C.reset} — ${bad} case(s) wrong. A real lead would be silently deleted.`);
process.exit(1);
