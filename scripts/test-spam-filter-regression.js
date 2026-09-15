/**
 * scripts/test-spam-filter-regression.js
 *
 * Regression suite for lib/spam-filter.ts.
 *
 * Unlike scripts/diagnose-lead-pipeline.js (which used to re-derive the filter's
 * dispatch logic from extracted rule arrays), this suite compiles and executes
 * the REAL lib/spam-filter.ts source in-process — so it exercises the actual
 * shipped function, not a mirror of it. TypeScript is transpiled on the fly via
 * the `typescript` devDependency, so no build step is needed.
 *
 * THREE EXPECTATIONS
 * ------------------
 *   'allow'  — a clean lead. Must reach GHL/inbox with no flag.
 *   'review' — suspicious but must NOT be dropped. The lead is delivered and
 *              tagged `needs-review` in GHL for a human to judge.
 *   'block'  — confident spam. Dropped with a decoy 200.
 *
 * The bug this guards against: the link-spam TLD pattern matched the domain
 * inside an email address, so the filter returned "spam" for every submission
 * carrying an email — and each route discarded it with a fake HTTP 200. The
 * email cases below are the regression guard for that.
 *
 * The second class it guards is subtler and did equal damage: bare substrings of
 * ordinary English. `includes('seo')` matched anything containing those letters,
 * and `includes('marketing')` matched a customer writing "I saw your marketing
 * leaflet". Both deleted real leads. The 'FALSE POSITIVES' block below pins the
 * exact phrasings that must survive.
 *
 * Run:  node scripts/test-spam-filter-regression.js
 * Exit: 0 = all expectations met, 1 = any mismatch (a false positive, an
 *       over-eager block, or a missed detection).
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
  if (typeof module_.exports.assessSubmission !== 'function') {
    throw new Error('lib/spam-filter.ts did not export assessSubmission');
  }
  return module_.exports;
}

// ── Cases ───────────────────────────────────────────────────────────────────
const BASE_LEAD = { phone: '07700900123', postcode: 'CW11 4NE' };

const CASES = [
  // ═══ FALSE POSITIVES: real customers the OLD filter silently deleted ═══════
  // These are the reason this rewrite exists. Each one must NOT be blocked.
  // 'block' here is a test failure even though it "looks like" spam filtering.
  { name: '★ "I saw your marketing leaflet"', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Helen Marsh', email: 'helen.marsh@gmail.com',
      message: 'I saw your marketing leaflet through the door and wanted a quote for my gutters.' } },
  { name: '★ "do you do SEO for roofers" (customer asking)', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Paul Dean', email: 'paul.dean@outlook.com',
      message: 'Odd question — do you do SEO for roofers or just the roofing work?' } },
  { name: '★ "I found you on checkatrade.co.uk"', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Ruth Almond', email: 'ruth@almond.me.uk',
      message: 'I found you on checkatrade.co.uk and would like a survey.' } },
  { name: '★ Domain mention in passing (yell.com)', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Ian Potter', email: 'ian.potter@btinternet.com',
      message: 'Saw your listing on yell.com — do you cover Sandbach?' } },
  { name: '★ "I came across your company" (real phrasing)', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Diane Fletcher', email: 'diane.f@gmail.com',
      message: 'I came across your company on Google and need a leaking roof looked at.' } },
  { name: '★ "we specialise in" said by a landlord', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Greg Nolan', email: 'greg@nolanlettings.co.uk',
      message: 'We specialise in HMO conversions and need roofing quotes for three properties.' } },
  { name: '★ "free consultation" asked by a customer', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Maureen Platt', email: 'm.platt@yahoo.co.uk',
      message: 'Do you offer a free consultation before quoting?' } },
  { name: '★ "click here" in a forwarded description', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Alan Reid', email: 'alan.reid@gmail.com',
      message: 'The leak is where it says click here on the photo I sent.' } },
  { name: '★ Single https link in a message', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Nina Shah', email: 'nina.shah@gmail.com',
      message: 'Photos of the damage: https://imgur.com/a/roof123 — can you quote?' } },
  { name: '★ Single www domain, no other signal', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Colin Baird', email: 'colin.baird@gmail.com',
      message: 'I run the site www.bairdjoinery.co.uk next door, need my own roof done.' } },
  { name: '★ "outsource" mentioned by a trade customer', expect: 'review',
    payload: { ...BASE_LEAD, name: 'Sam Whyte', email: 'sam@whytebuild.co.uk',
      message: 'We outsource our roofing to a specialist — could you take on our overflow?' } },

  // ═══ Genuine leads carrying emails: the original regression guard ═════════
  { name: 'Gmail address, common providers', expect: 'allow', payload: { name: 'John Smith', email: 'test.user@gmail.com', phone: '07700900123', postcode: 'CW11 4NE', service_type: 'Roof Repair', message: 'My roof is leaking after the storm.' } },
  { name: 'Yahoo UK address (.co.uk two-part TLD)', expect: 'allow', payload: { name: 'Sarah Jones', email: 'name@yahoo.co.uk', phone: '01614800123', postcode: 'WA16 6AA', service_type: 'Full Replacement', message: 'Please can someone call me back.' } },
  { name: 'Outlook address', expect: 'allow', payload: { name: 'David Wilson', email: 'dave.wilson@outlook.com', phone: '07700900456', postcode: 'SK9 1AA', message: 'Do you cover Alderley Edge?' } },
  { name: 'BT Internet address', expect: 'allow', payload: { name: 'Michael Brown', email: 'michael.brown@btinternet.com', phone: '07700900789', postcode: 'CW11 4NE', serviceNeeded: 'Roof Inspection', message: 'Interested in the free offer.' } },
  { name: 'Hotmail address', expect: 'allow', payload: { name: 'Emma Taylor', email: 'emma.taylor@hotmail.com', phone: '07700900321', postcode: 'CW12 1AA', message: 'Could you quote for a new roof?' } },
  { name: 'Plus-addressed Gmail', expect: 'allow', payload: { name: 'Chris Evans', email: 'chris+roof@gmail.com', phone: '07700900654', postcode: 'CW11 4NE', message: 'Rear extension flat roof needed.' } },
  { name: 'Hyphenated subdomain email', expect: 'allow', payload: { name: 'Lucy Ward', email: 'lucy@ward-consulting.co.uk', phone: '07700900987', postcode: 'ST7 2AA', message: 'Please advise on chimney repointing.' } },
  { name: 'Contact form (subject + folding postcode into message)', expect: 'allow', payload: { name: 'Peter Green', email: 'peter.green@gmail.com', phone: '07700900111', subject: 'General enquiry', message: 'Postcode: CW11 4NE\n\nDo you do emergency callouts?' } },
  { name: 'Free-text mentions an email address (must not read as URL)', expect: 'allow', payload: { name: 'Anna Bell', phone: '07700900222', postcode: 'CW11 4NE', message: 'Best to reach me at anna.bell@gmail.com during the day.' } },
  { name: 'No email at all (quote form allows it)', expect: 'allow', payload: { name: 'Tom Hardy', phone: '07700900333', postcode: 'CW11 4NE', message: 'Roof tiles slipped in the wind.' } },
  { name: 'Apostrophe + hyphen surname', expect: 'allow', payload: { name: "Sean O'Brien-Wells", email: 'sean.obrien@yahoo.co.uk', phone: '07700900444', postcode: 'CW11 4NE', message: 'Gutter replacement quote please.' } },
  { name: 'Message with punctuation and numbers', expect: 'allow', payload: { name: 'Jane Doe', email: 'jane.doe@gmail.com', phone: '07700900555', postcode: 'CW11 4NE', message: 'We have 3 skylights and 2 chimneys. Quote for all 5?' } },
  { name: 'Decimal + sentence-final period (phantom-domain guard)', expect: 'allow', payload: { name: 'Owen Price', email: 'owen.price@gmail.com', phone: '07700900600', postcode: 'CW11 4NE', message: 'The flat roof is approx. 4.5m by 3m. Need a price.' } },
  { name: 'Landlord with a company email', expect: 'allow', payload: { name: 'Rachel Nutt', email: 'rachel@nuttproperties.co.uk', phone: '07700900601', postcode: 'WA16 6AA', message: 'I manage six rental properties and need a roofer on call.' } },

  // ═══ Confident spam: must still be blocked ════════════════════════════════
  // Names here are deliberately ordinary — a name like "Spam Bot" trips the
  // placeholder-name rule, which would make every case below pass for the wrong
  // reason and leave the link rules untested.
  // Multiple distinct links — nobody pastes a link list into a roof enquiry.
  { name: 'Two distinct domains in message', expect: 'block',
    payload: { ...BASE_LEAD, name: 'Gareth Hale', message: 'Cheap roofs at www.cheap-roofs-now.com and www.roofdeals-uk.com' } },
  // URL shorteners never appear in a genuine enquiry. Regression guard for the
  // dead-rule bug: bit.ly's TLD is not in TLDS, so only SHORTENER_RE catches it.
  { name: 'URL shortener (bit.ly)', expect: 'block',
    payload: { ...BASE_LEAD, name: 'Neil Bishop', message: 'Great offer here: https://bit.ly/x9k2p' } },
  { name: 'URL shortener (tinyurl, bare)', expect: 'block',
    payload: { ...BASE_LEAD, name: 'Neil Bishop', message: 'See tinyurl.com/roofsale for cheap tiles' } },
  // High-abuse TLD.
  { name: 'Abuse TLD (.xyz)', expect: 'block',
    payload: { ...BASE_LEAD, name: 'Neil Bishop', message: 'Roofing supplies at mega-roof.xyz' } },
  // Two-letter abuse TLD, also absent from TLDS — caught by ABUSE_TLD_RE only.
  { name: 'Abuse TLD (.tk)', expect: 'block',
    payload: { ...BASE_LEAD, name: 'Neil Bishop', message: 'Free roof survey at bestroofs.tk' } },
  // A domain in a structured field — a human never types one into a postcode.
  { name: 'URL in name field', expect: 'block',
    payload: { ...BASE_LEAD, name: 'www.spamsite.com', message: 'hello' } },
  { name: 'Domain in postcode field', expect: 'block',
    payload: { ...BASE_LEAD, name: 'John Smith', postcode: 'spam.co.uk', message: 'hello' } },
  // One link PLUS pitch language together — the compound rule.
  { name: 'Link plus B2B pitch', expect: 'block',
    payload: { ...BASE_LEAD, name: 'Marketer', message: 'We do lead generation — see www.agency-pitch.com' } },

  // ═══ B2B solicitation: unambiguous second-person sales copy ═══════════════
  { name: 'SEO services pitch', expect: 'block', payload: { ...BASE_LEAD, name: 'Marketer', message: 'We can improve your SEO services ranking.' } },
  { name: 'Digital marketing pitch', expect: 'block', payload: { ...BASE_LEAD, name: 'Agency', message: 'Our digital marketing team can grow your business.' } },
  { name: 'Estimating-support pitch', expect: 'block', payload: { ...BASE_LEAD, name: 'Outsourcer', message: 'We provide estimating support and can price more projects for you.' } },
  { name: 'Backlinks pitch', expect: 'block', payload: { ...BASE_LEAD, name: 'Linker', message: 'Buy backlinks and link building packages.' } },
  { name: '"this is not spam"', expect: 'block', payload: { ...BASE_LEAD, name: 'Sender', message: 'This is not spam, we offer appointment setting.' } },

  // ═══ Automation artifacts: must still be blocked ══════════════════════════
  { name: 'Literal "gclid" as name', expect: 'block', payload: { name: 'gclid', email: 'x@gmail.com', phone: '07700900888', message: 'hello' } },
  { name: 'Literal "test" as name', expect: 'block', payload: { name: 'test', email: 'x@gmail.com', phone: '07700900888', message: 'hello' } },
  { name: 'Crawler name', expect: 'block', payload: { name: 'Googlebot crawler', email: 'x@gmail.com', phone: '07700900888', message: 'hello' } },
];

// ── Runner ──────────────────────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`${BOLD}Spam-filter regression suite${RESET} ${DIM}(executing real lib/spam-filter.ts)${RESET}\n`);

let filter;
try {
  filter = loadRealFilter();
  console.log(`${GREEN}✔${RESET} Compiled and loaded lib/spam-filter.ts\n`);
} catch (err) {
  console.log(`${RED}✘ Could not load lib/spam-filter.ts:${RESET} ${err.message}`);
  process.exit(1);
}

const failures = [];
const tally = { allow: 0, review: 0, block: 0 };

for (const c of CASES) {
  const { verdict, reasons } = filter.assessSubmission(c.payload);
  tally[verdict] += 1;
  const okCase = verdict === c.expect;
  if (!okCase) failures.push({ c, verdict, reasons });

  const tag = okCase ? `${GREEN}✔${RESET}` : `${RED}✘${RESET}`;
  const colour = verdict === 'block' ? RED : verdict === 'review' ? YELLOW : GREEN;
  const label = `${colour}${verdict.toUpperCase().padEnd(6)}${RESET}`;
  const why = reasons.length ? `${DIM}(${reasons.join(', ')})${RESET}` : '';
  const note = okCase ? '' : `${RED}  ← expected ${c.expect.toUpperCase()}${RESET}`;
  console.log(`  ${tag} [${label}] ${c.name} ${why}${note}`);
}

const total = CASES.length;
console.log(
  `\n${BOLD}${total} cases${RESET} · ${GREEN}${total - failures.length} correct${RESET} · ` +
    `${tally.allow} allow / ${tally.review} review / ${tally.block} block`,
);

if (failures.length === 0) {
  console.log(`\n${GREEN}${BOLD}PASS${RESET} — no genuine lead is dropped; ambiguous cases are surfaced for review.`);
  process.exit(0);
}

// Distinguish the two failure modes — they call for opposite fixes.
const falsePositives = failures.filter((f) => f.verdict === 'block' && f.c.expect !== 'block');
const missed = failures.filter((f) => f.verdict !== 'block' && f.c.expect === 'block');
const misfiled = failures.filter((f) => !falsePositives.includes(f) && !missed.includes(f));

console.log(`\n${RED}${BOLD}FAIL${RESET} — ${failures.length} case(s) wrong.`);
if (falsePositives.length) {
  console.log(`${RED}  ${falsePositives.length} FALSE POSITIVE(S) — real leads dropped. This is the severe failure; fix first.${RESET}`);
  falsePositives.forEach((f) => console.log(`${RED}    · ${f.c.name} → ${f.verdict} (${f.reasons.join(', ')})${RESET}`));
}
if (missed.length) {
  console.log(`${YELLOW}  ${missed.length} missed spam — annoying, not severe.${RESET}`);
  missed.forEach((f) => console.log(`${YELLOW}    · ${f.c.name} → ${f.verdict}${RESET}`));
}
if (misfiled.length) {
  console.log(`${DIM}  ${misfiled.length} mis-tiered (allow/review mix-up) — no lead lost either way.${RESET}`);
  misfiled.forEach((f) => console.log(`${DIM}    · ${f.c.name} → ${f.verdict}, expected ${f.c.expect}${RESET}`));
}
process.exit(1);
