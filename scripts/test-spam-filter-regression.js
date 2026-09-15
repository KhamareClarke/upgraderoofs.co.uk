/**
 * scripts/test-spam-filter-regression.js
 *
 * Regression suite for lib/spam-filter.ts.
 *
 * Unlike scripts/diagnose-lead-pipeline.js (which re-derives the filter's
 * dispatch logic from extracted rule arrays), this suite compiles and executes
 * the REAL lib/spam-filter.ts source in-process — so it exercises the actual
 * shipped function, not a mirror of it. TypeScript is transpiled on the fly
 * via the `typescript` devDependency, so no build step is needed.
 *
 * The bug this guards against: the link-spam TLD pattern matched the domain
 * inside an email address, so isSpamSubmission() returned true for every
 * submission carrying an email — and each route discarded it with a fake
 * HTTP 200. The email cases below are the regression guard for that.
 *
 * Run:  node scripts/test-spam-filter-regression.js
 * Exit: 0 = all expectations met, 1 = a false positive or missed detection.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

// ── Load the real module ────────────────────────────────────────────────────
function loadRealFilter() {
  const file = path.join(ROOT, 'lib', 'spam-filter.ts');
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: 'spam-filter.ts',
  });
  const module_ = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', outputText)(module_.exports, require, module_);
  if (typeof module_.exports.isSpamSubmission !== 'function') {
    throw new Error('lib/spam-filter.ts did not export isSpamSubmission');
  }
  return module_.exports;
}

// ── Cases ───────────────────────────────────────────────────────────────────
// expect: 'pass' = a genuine lead that MUST reach GHL/inbox
//         'drop' = spam that MUST be filtered
const CASES = [
  // --- Realistic leads carrying emails: the regression guard ----------------
  { name: 'Gmail address, common providers', expect: 'pass', payload: { name: 'John Smith', email: 'test.user@gmail.com', phone: '07700900123', postcode: 'CW11 4NE', service_type: 'Roof Repair', message: 'My roof is leaking after the storm.' } },
  { name: 'Yahoo UK address (.co.uk two-part TLD)', expect: 'pass', payload: { name: 'Sarah Jones', email: 'name@yahoo.co.uk', phone: '01614800123', postcode: 'WA16 6AA', service_type: 'Full Replacement', message: 'Please can someone call me back.' } },
  { name: 'Outlook address', expect: 'pass', payload: { name: 'David Wilson', email: 'dave.wilson@outlook.com', phone: '07700900456', postcode: 'SK9 1AA', message: 'Do you cover Alderley Edge?' } },
  { name: 'BT Internet address', expect: 'pass', payload: { name: 'Michael Brown', email: 'michael.brown@btinternet.com', phone: '07700900789', postcode: 'CW11 4NE', serviceNeeded: 'Roof Inspection', message: 'Interested in the free offer.' } },
  { name: 'Hotmail address', expect: 'pass', payload: { name: 'Emma Taylor', email: 'emma.taylor@hotmail.com', phone: '07700900321', postcode: 'CW12 1AA', message: 'Could you quote for a new roof?' } },
  { name: 'Plus-addressed Gmail', expect: 'pass', payload: { name: 'Chris Evans', email: 'chris+roof@gmail.com', phone: '07700900654', postcode: 'CW11 4NE', message: 'Rear extension flat roof needed.' } },
  { name: 'Hyphenated subdomain email', expect: 'pass', payload: { name: 'Lucy Ward', email: 'lucy@ward-consulting.co.uk', phone: '07700900987', postcode: 'ST7 2AA', message: 'Please advise on chimney repointing.' } },
  { name: 'Contact form (subject + folding postcode into message)', expect: 'pass', payload: { name: 'Peter Green', email: 'peter.green@gmail.com', phone: '07700900111', subject: 'General enquiry', message: 'Postcode: CW11 4NE\n\nDo you do emergency callouts?' } },
  { name: 'Free-text mentions an email address (must not read as URL)', expect: 'pass', payload: { name: 'Anna Bell', phone: '07700900222', postcode: 'CW11 4NE', message: 'Best to reach me at anna.bell@gmail.com during the day.' } },
  { name: 'No email at all (quote form allows it)', expect: 'pass', payload: { name: 'Tom Hardy', phone: '07700900333', postcode: 'CW11 4NE', message: 'Roof tiles slipped in the wind.' } },
  { name: 'Apostrophe + hyphen surname', expect: 'pass', payload: { name: "Sean O'Brien-Wells", email: 'sean.obrien@yahoo.co.uk', phone: '07700900444', postcode: 'CW11 4NE', message: 'Gutter replacement quote please.' } },
  { name: 'Message with punctuation and numbers', expect: 'pass', payload: { name: 'Jane Doe', email: 'jane.doe@gmail.com', phone: '07700900555', postcode: 'CW11 4NE', message: 'We have 3 skylights and 2 chimneys. Quote for all 5?' } },

  // --- Link spam: must still be caught ------------------------------------
  { name: 'URL in message body', expect: 'drop', payload: { name: 'Spam Bot', phone: '07700900666', postcode: 'CW11 4NE', message: 'Cheap roofs at www.cheap-roofs-now.com' } },
  { name: 'https URL in message', expect: 'drop', payload: { name: 'Spam Bot', phone: '07700900666', postcode: 'CW11 4NE', message: 'See https://spam.example.com for details' } },
  { name: 'URL in name field', expect: 'drop', payload: { name: 'www.spamsite.com', phone: '07700900666', postcode: 'CW11 4NE', message: 'hello' } },
  { name: 'URL in postcode field', expect: 'drop', payload: { name: 'John Smith', phone: '07700900666', postcode: 'spam.co.uk', message: 'hello' } },

  // --- B2B solicitation: must still be caught -----------------------------
  { name: 'SEO pitch', expect: 'drop', payload: { name: 'Marketer', phone: '07700900777', postcode: 'CW11 4NE', message: 'We can improve your SEO services ranking.' } },
  { name: 'Marketing pitch', expect: 'drop', payload: { name: 'Agency', phone: '07700900777', postcode: 'CW11 4NE', message: 'Our digital marketing team can grow your business.' } },
  { name: 'Outsource pitch', expect: 'drop', payload: { name: 'Outsourcer', phone: '07700900777', postcode: 'CW11 4NE', message: 'We provide estimating support and can outsource your takeoffs.' } },
  { name: 'Backlinks pitch', expect: 'drop', payload: { name: 'Linker', phone: '07700900777', postcode: 'CW11 4NE', message: 'Buy backlinks and link building packages.' } },
  { name: 'Came-across-your-company boilerplate', expect: 'drop', payload: { name: 'Cold Caller', phone: '07700900777', postcode: 'CW11 4NE', message: 'I came across your company and wanted to reach out.' } },

  // --- Automation artifacts: must still be caught -------------------------
  { name: 'Literal "gclid" as name', expect: 'drop', payload: { name: 'gclid', email: 'x@gmail.com', phone: '07700900888', message: 'hello' } },
  { name: 'Literal "test" as name', expect: 'drop', payload: { name: 'test', email: 'x@gmail.com', phone: '07700900888', message: 'hello' } },
  { name: 'Crawler name', expect: 'drop', payload: { name: 'Googlebot crawler', email: 'x@gmail.com', phone: '07700900888', message: 'hello' } },
];

// ── Runner ──────────────────────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let falsePositives = 0;
let missedSpam = 0;

console.log(`${BOLD}Spam-filter regression suite${RESET} ${DIM}(executing real lib/spam-filter.ts)${RESET}\n`);

let filter;
try {
  filter = loadRealFilter();
  console.log(`${GREEN}✔${RESET} Compiled and loaded lib/spam-filter.ts\n`);
} catch (err) {
  console.log(`${RED}✘ Could not load lib/spam-filter.ts:${RESET} ${err.message}`);
  process.exit(1);
}

for (const c of CASES) {
  const dropped = filter.isSpamSubmission(c.payload);
  const actual = dropped ? 'drop' : 'pass';
  const okCase = actual === c.expect;
  if (!okCase && actual === 'drop') falsePositives += 1;
  if (!okCase && actual === 'pass') missedSpam += 1;

  const tag = okCase
    ? `${GREEN}✔${RESET}`
    : `${RED}✘${RESET}`;
  const verdict = dropped ? 'DROPPED' : 'passes ';
  const note = okCase ? '' : `${RED}  ← expected ${c.expect.toUpperCase()}${RESET}`;
  console.log(`  ${tag} [${verdict}] ${c.name}${note}`);
}

const total = CASES.length;
console.log(`\n${BOLD}${total} cases${RESET} · ${GREEN}${total - falsePositives - missedSpam} correct${RESET} · ` +
  `${falsePositives ? RED : DIM}${falsePositives} false positive(s)${RESET} · ` +
  `${missedSpam ? RED : DIM}${missedSpam} missed spam${RESET}`);

if (falsePositives === 0 && missedSpam === 0) {
  console.log(`\n${GREEN}${BOLD}PASS${RESET} — 0% false-positive drops; all genuine leads reach GHL/inbox.`);
  process.exit(0);
}
console.log(`\n${RED}${BOLD}FAIL${RESET} — the filter is not safe to ship as-is.`);
process.exit(1);
