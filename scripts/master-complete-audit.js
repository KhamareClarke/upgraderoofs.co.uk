// scripts/master-complete-audit.js
//
// STATIC configuration audit. Reads files only — it makes no API calls, so it
// cannot tell you whether tracking WORKS, only whether it is wired. A green
// result here is not evidence that conversions are recording. For that, run
// `node scripts/audit-calls-30d.js`, which queries Ads/GA4/GBP/GHL live and
// emits a severity-ranked gap list.
//
// Verified against the repo 2026-09-15. Three checks in the original draft were
// wrong and are corrected below — see the inline notes.

const fs = require('fs');
const path = require('path');

/**
 * Parse a dotenv file into live vs. commented-out keys.
 *
 * A commented-out key is MISSING at runtime, not present — `.includes(key)` on
 * the raw text cannot tell the difference and reports a disabled credential as
 * configured. That exact mistake hid the GBP OAuth vars being commented out.
 */
function readEnv(file) {
  const live = new Set();
  const commented = new Set();
  if (!fs.existsSync(file)) return { live, commented };

  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const isComment = line.startsWith('#');
    const body = isComment ? line.replace(/^#+\s*/, '') : line;
    const m = body.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!m) continue;
    const value = body.slice(body.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
    (isComment ? commented : live).add(m[1]);
  }
  return { live, commented };
}

function runMasterAudit() {
  console.log('==================================================');
  console.log('   UPGRADE ROOFS: MASTER ECOSYSTEM & API AUDIT    ');
  console.log('==================================================');
  console.log('   STATIC config check — does not verify that');
  console.log('   tracking actually records. See audit-calls-30d.js');
  console.log('==================================================\n');

  let issuesFound = 0;

  // 1. Environment & Credential Audit
  console.log('🔍 [1/4] Auditing Environment & Credentials...');
  const envPath = path.join(process.cwd(), '.env.local');
  const { live, commented } = readEnv(envPath);
  console.log(` - .env.local file exists: ${fs.existsSync(envPath) ? 'YES 🟢' : 'MISSING 🔴'}`);

  if (fs.existsSync(envPath)) {
    // Names the application ACTUALLY reads. NEXT_PUBLIC_GA_MEASUREMENT_ID is
    // present in .env.local but referenced nowhere — the app reads
    // NEXT_PUBLIC_GA4_ID (components/Analytics.tsx:21). Checking the dead name
    // passes unconditionally and proves nothing.
    const requiredKeys = [
      'GHL_API_KEY',
      'GHL_LOCATION_ID',
      'GBP_CLIENT_ID',
      'GBP_CLIENT_SECRET',
      'GBP_REFRESH_TOKEN',
      'NEXT_PUBLIC_GA4_ID',
      'NEXT_PUBLIC_GADS_CONV_ID',
      'NEXT_PUBLIC_GADS_CLICK_CONV_ID',
    ];
    requiredKeys.forEach((key) => {
      if (live.has(key)) {
        console.log(`   - ${key}: PRESENT 🟢`);
      } else if (commented.has(key)) {
        console.log(`   - ${key}: COMMENTED OUT 🔴 (runtime sees nothing)`);
        issuesFound++;
      } else {
        console.log(`   - ${key}: MISSING ⚠️`);
        issuesFound++;
      }
    });
  } else {
    issuesFound++;
  }

  // 2. Google Cloud Service Account File Check
  console.log('\n🔍 [2/4] Auditing Google Cloud Service Account...');
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : path.join(process.cwd(), 'google-service-account.json');
  const hasSA = fs.existsSync(saPath);
  console.log(` - service-account key: ${hasSA ? `FOUND 🟢 (${path.basename(saPath)})` : 'NOT FOUND ⚠️'}`);
  if (hasSA) {
    try {
      const email = JSON.parse(fs.readFileSync(saPath, 'utf8')).client_email;
      console.log(`   - client_email: ${email || '(absent)'}`);
      console.log('   - NOTE: this service account must be a Manager on the GBP profile.');
      console.log('     It currently sees only its own empty account and 404s on the real location.');
    } catch {
      console.log('   - ⚠️ key file is not valid JSON');
      issuesFound++;
    }
  }

  // 3. Frontend GTM / GA4 Tracking Check
  //
  // GA4 is initialised in components/Analytics.tsx, NOT app/layout.tsx — and
  // `content.includes('G-')` is far too loose to prove anything (in layout.tsx
  // it matches near-arbitrary text, and the gtag block there configures the Ads
  // ID). Check the real file for the real constants.
  console.log('\n🔍 [3/4] Auditing Frontend Tracking & GTM...');
  const analyticsPath = path.join(process.cwd(), 'components/Analytics.tsx');
  if (fs.existsSync(analyticsPath)) {
    const a = fs.readFileSync(analyticsPath, 'utf8');
    const hasGtm = /GTM-[A-Z0-9]+/.test(a);
    const hasGa4 = /G-[A-Z0-9]{6,}/.test(a);
    const hasAds = /AW-[0-9]+/.test(a);
    console.log(` - GTM container in Analytics.tsx: ${hasGtm ? 'DETECTED 🟢' : 'MISSING 🔴'}`);
    console.log(` - GA4 measurement ID in Analytics.tsx: ${hasGa4 ? 'DETECTED 🟢' : 'MISSING 🔴'}`);
    console.log(` - Google Ads tag in Analytics.tsx: ${hasAds ? 'DETECTED 🟢' : 'MISSING 🔴'}`);
    if (!hasGtm || !hasGa4) issuesFound++;
    console.log('   - ⚠️ CANNOT BE VERIFIED HERE: whether the GTM container actually');
    console.log('     contains Custom Event triggers for lib/tracking.ts events');
    console.log('     (phone_click, whatsapp_click, email_click, quote_request,');
    console.log('     contact_form_submit). The tags load, but those events are absent');
    console.log('     from GA4 — the triggers were never built. Check GTM directly.');
  } else {
    console.log(' - components/Analytics.tsx not found!');
    issuesFound++;
  }

  // 4. GBP Canonical ID Verification
  console.log('\n🔍 [4/4] Auditing GBP Canonical ID Integrity...');
  const contactLibPath = path.join(process.cwd(), 'lib/contact.ts');
  if (fs.existsSync(contactLibPath)) {
    const c = fs.readFileSync(contactLibPath, 'utf8');
    // Match the EXPORT, not a bare substring: the docblock deliberately quotes
    // the wrong ids to warn against them, so `includes()` would false-pass.
    const m = c.match(/export\s+const\s+GBP_LOCATION_ID\s*=\s*['"](\d+)['"]/);
    const id = m ? m[1] : null;
    const ok = id === '17098915606572808840';
    console.log(` - GBP_LOCATION_ID in lib/contact.ts: ${id || '(not found)'} ${ok ? 'VERIFIED 🟢' : 'INCORRECT 🔴'}`);
    if (!ok) {
      console.log('   - expected the 20-digit 17098915606572808840 (the live location).');
      console.log('     The 17-digit 17098906572808840 does not exist and 404s.');
      issuesFound++;
    }
  } else {
    console.log(' - lib/contact.ts not found!');
    issuesFound++;
  }

  console.log('\n==================================================');
  if (issuesFound === 0) {
    console.log('✅ STATIC AUDIT COMPLETE: configuration looks wired.');
    console.log('   This does NOT mean tracking records. As of 2026-09-15 it does not:');
    console.log('   0 conversions against £954 spend, all browser-side conversion');
    console.log('   actions REMOVED, GTM Custom Event triggers absent.');
    console.log('   Run: node scripts/audit-calls-30d.js');
  } else {
    console.log(`⚠️ AUDIT COMPLETE: ${issuesFound} configuration gap(s) listed above.`);
  }
  console.log('==================================================');
}

runMasterAudit();
