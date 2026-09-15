/**
 * scripts/verify-email-transport.js
 *
 * Read-only preflight for the SMTP transport behind every lead notification
 * email. Opens a connection, authenticates, and disconnects. **Sends nothing.**
 *
 * WHY THIS EXISTS
 * ---------------
 * The only production email path is a Gmail App Password. Google revokes every
 * App Password the moment the account password changes or 2-Step Verification is
 * toggled, and the revocation is invisible from this side: the website keeps
 * accepting leads, GHL keeps capturing them, and only the notification email
 * dies. Production ran in exactly that state — `535-5.7.8 Username and Password
 * not accepted` — until someone read the server logs.
 *
 * Running this takes two seconds and turns that outage into a one-line answer.
 *
 * USAGE
 *   node scripts/verify-email-transport.js                  # reads .env.local
 *   node scripts/verify-email-transport.js .env.prod.tmp    # reads a custom file
 *   node scripts/verify-email-transport.js --no-file        # process.env only
 *
 * CHECKING PRODUCTION VALUES
 *   Vercel env vars only take effect on a NEW deployment, so verify before you
 *   redeploy rather than after:
 *
 *     vercel env pull .env.prod.tmp --environment=production
 *     node scripts/verify-email-transport.js .env.prod.tmp
 *     rm .env.prod.tmp        # it holds real secrets — delete when done
 *
 *   Note: variables marked "Sensitive" in Vercel are write-only and pull back
 *   EMPTY, so this cannot check those. SMTP_* are not sensitive, so they do
 *   read back — which is why this specific preflight is possible.
 *
 * The transport settings here mirror lib/mail.ts readSmtpSettings(). That file
 * is the source of truth; if you change the defaults there, change them here.
 *
 * Exit: 0 = credentials accepted, 1 = something needs fixing.
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

const argv = process.argv.slice(2);
const useFile = !argv.includes('--no-file');
const envFile = argv.find((a) => !a.startsWith('--')) || '.env.local';

function loadEnvFile(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) {
    console.log(`  ${C.yellow}⚠${C.reset} ${file} not found — falling back to process.env only`);
    return false;
  }
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    // Commented-out keys are skipped: a line starting with '#' is inert.
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined && value !== '') process.env[m[1]] = value;
  }
  return true;
}

/** Mask an address so the transcript can be pasted into a ticket safely. */
function mask(addr) {
  return addr ? addr.replace(/^(.)[^@]*(@.*)$/, '$1***$2') : '(unset)';
}

async function main() {
  console.log(`\n${C.bold}Email transport preflight${C.reset} ${C.dim}(read-only — sends nothing)${C.reset}\n`);

  if (useFile) {
    const loaded = loadEnvFile(envFile);
    if (loaded) console.log(`  ${C.dim}source: ${envFile}${C.reset}\n`);
  } else {
    console.log(`  ${C.dim}source: process.env only${C.reset}\n`);
  }

  const user = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
  const passRaw = process.env.SMTP_PASS || '';
  // Google displays App Passwords as four space-separated groups; the spaces are
  // cosmetic and lib/mail.ts strips them before use.
  const pass = passRaw.replace(/\s/g, '');
  const host = process.env.SMTP_HOST ? process.env.SMTP_HOST.trim() : 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT ? process.env.SMTP_PORT.trim() : 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.trim().toLowerCase() === 'true'
    : port === 465;
  const from = (process.env.EMAIL_FROM || '').trim() || user;
  const emailTo = (process.env.EMAIL_TO || '').trim();

  let failures = 0;

  console.log(`${C.bold}Configuration${C.reset}`);
  const hasCreds = Boolean(user && pass);
  if (!user) {
    console.log(`  ${C.red}✘${C.reset} SMTP_USER is not set`);
    failures += 1;
  } else {
    console.log(`  ${C.green}✔${C.reset} SMTP_USER ${C.dim}${mask(user)}${C.reset}`);
  }
  if (!pass) {
    console.log(`  ${C.red}✘${C.reset} SMTP_PASS is not set`);
    failures += 1;
  } else {
    const shape = pass.length === 16;
    console.log(
      `  ${shape ? C.green + '✔' : C.yellow + '⚠'}${C.reset} SMTP_PASS ${C.dim}${pass.length} chars after stripping spaces${C.reset}` +
        (shape ? '' : ` ${C.yellow}— a Gmail App Password is 16; this looks like something else${C.reset}`)
    );
    if (passRaw.length !== pass.length) {
      console.log(`  ${C.dim}  (raw value contained whitespace — stripped, as lib/mail.ts does)${C.reset}`);
    }
  }
  console.log(`  ${C.dim}host        : ${host}:${port} (${secure ? 'implicit TLS' : 'STARTTLS'})${C.reset}`);
  console.log(`  ${C.dim}from        : ${mask(from)}${C.reset}`);
  console.log(
    `  ${C.dim}to          : ${mask(emailTo)}${C.reset}` +
      (emailTo ? '' : ` ${C.yellow}← EMAIL_TO unset, lib/mail.ts defaults to upgraderoofs@yahoo.com${C.reset}`)
  );
  console.log('');

  if (!hasCreds) {
    console.log(`${C.red}${C.bold}FAIL${C.reset} — credentials missing, cannot probe.`);
    console.log(`  ${C.dim}Set SMTP_USER and SMTP_PASS, then re-run.${C.reset}\n`);
    process.exit(1);
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    console.log(`${C.red}${C.bold}FAIL${C.reset} — nodemailer is not installed. Run: npm install\n`);
    process.exit(1);
  }

  console.log(`${C.bold}Authentication${C.reset}`);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: { minVersion: 'TLSv1.2' },
  });

  try {
    await transport.verify();
    console.log(`  ${C.green}✔${C.reset} Credentials ACCEPTED — the transport can authenticate.`);
    console.log(`\n${C.green}${C.bold}PASS${C.reset} — lead notification email can be delivered.\n`);
    process.exit(0);
  } catch (err) {
    const code = err.code || 'unknown';
    console.log(`  ${C.red}✘${C.reset} Authentication failed: ${C.bold}${code}${C.reset}`);
    console.log(`  ${C.dim}${String(err.message || '').replace(pass, '[REDACTED]')}${C.reset}\n`);

    if (code === 'EAUTH') {
      console.log(`${C.bold}What this means${C.reset}`);
      console.log(`  The credential is not a valid App Password for ${mask(user)}. Google`);
      console.log(`  revokes every App Password when the account password changes or`);
      console.log(`  2-Step Verification is toggled, so an old working value can simply stop.`);
      console.log('');
      console.log(`${C.bold}Fix${C.reset}`);
      console.log(`  1. Sign in as ${mask(user)} → https://myaccount.google.com/apppasswords`);
      console.log(`     (2-Step Verification must be ON for this page to exist.)`);
      console.log(`  2. Create a new App Password, e.g. named "upgraderoofs website".`);
      console.log(`  3. Put the 16-character value in SMTP_PASS — Production AND Preview AND`);
      console.log(`     Development, since the routes read it in every environment.`);
      console.log(`     Vercel → upgraderoof → Settings → Environment Variables.`);
      console.log(`  4. Redeploy. ${C.yellow}An env change does NOT reach a running deployment.${C.reset}`);
      console.log(`  5. Re-run this script against the pulled production env to confirm.`);
    } else if (code === 'EENVELOPE') {
      console.log(`${C.bold}What this means${C.reset}`);
      console.log(`  Credentials are fine but EMAIL_FROM is not an address this account may`);
      console.log(`  send as. Set EMAIL_FROM to the authenticated address or a verified alias.`);
    } else if (['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EDNS'].includes(code)) {
      console.log(`${C.bold}What this means${C.reset}`);
      console.log(`  Could not reach ${host}:${port}. Check the host/port, and note that`);
      console.log(`  outbound port 25 is blocked on most hosts — 465 and 587 are fine.`);
    } else {
      console.log(`${C.bold}What this means${C.reset}`);
      console.log(`  Unrecognised failure — read the raw message above.`);
    }

    console.log(`\n${C.red}${C.bold}FAIL${C.reset} — lead notification email is broken.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n${C.red}Unexpected error:${C.reset}`, err);
  process.exit(1);
});
