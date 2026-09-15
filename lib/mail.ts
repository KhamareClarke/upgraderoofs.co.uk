import nodemailer from 'nodemailer';

export type MailConfig = {
  transporter: nodemailer.Transporter;
  from: string;
  to: string;
};

/**
 * Where lead notifications land when EMAIL_TO is unset.
 *
 * This default is a documented trap: an unset EMAIL_TO does not fail, it
 * silently delivers to this mailbox instead of whatever the client expects.
 * `scripts/verify-email-transport.js` flags it explicitly.
 */
const DEFAULT_TO = 'upgraderoofs@yahoo.com';

/**
 * Fail-fast transport timeouts (ms) — a correctness requirement, not a nicety.
 *
 * The three lead routes await sendMail() before responding. Without a socket
 * timeout, a Gmail connection that completes the TCP/TLS handshake and then
 * stalls holds the serverless invocation open until the platform kills it: the
 * customer's form spins, and the response never gets to report which sink
 * actually took the lead. Failing in ~10s keeps the honest "GHL captured it,
 * email did not" outcome observable.
 */
const CONNECTION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 15_000;

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
};

/**
 * Read and validate SMTP configuration.
 *
 * Defaults to Gmail because that is what this project has always used, but
 * SMTP_HOST / SMTP_PORT / SMTP_SECURE repoint the same code at any other
 * provider without touching the three lead routes.
 *
 * That escape hatch matters here: the only production email path is a Gmail
 * App Password, and Google revokes **every** App Password the moment the
 * account password changes or 2-Step Verification is toggled. When that
 * happens the website keeps accepting leads while every notification email is
 * rejected — which is exactly the outage this file's error handling exists to
 * make loud rather than silent.
 */
export function readSmtpSettings(): SmtpSettings {
  const user = process.env.SMTP_USER?.trim();
  // Google displays App Passwords as four space-separated groups. The spaces
  // are cosmetic; strip them (including pasted non-breaking spaces).
  const pass = process.env.SMTP_PASS?.replace(/\s/g, '');

  if (!user || !pass) {
    throw new Error(
      'Missing SMTP_USER or SMTP_PASS. Add them to your environment (e.g. .env.local).'
    );
  }

  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT?.trim() || 465);
  // 465 is implicit TLS; 587 negotiates STARTTLS. Derive from the port unless
  // SMTP_SECURE says otherwise, so an override only needs host + port.
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.trim().toLowerCase() === 'true'
    : port === 465;

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: process.env.EMAIL_FROM?.trim() || user,
    to: process.env.EMAIL_TO?.trim() || DEFAULT_TO,
  };
}

/** Build a transporter from already-validated settings. */
export function buildTransport(s: SmtpSettings): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth: { user: s.user, pass: s.pass },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    tls: { minVersion: 'TLSv1.2' },
  });
}

/**
 * Gmail SMTP via Nodemailer. Use a Google **App Password**, not your normal
 * Gmail password (Account → Security → 2-Step Verification → App passwords).
 */
export function getMailConfig(): MailConfig {
  const s = readSmtpSettings();
  return { transporter: buildTransport(s), from: s.from, to: s.to };
}

/**
 * Open a connection and authenticate, sending nothing. Used by
 * `scripts/verify-email-transport.js` to catch a dead credential in seconds
 * instead of discovering it through a lost lead notification.
 */
export async function verifyMailTransport(): Promise<
  { ok: true; settings: SmtpSettings } | { ok: false; code: string; message: string }
> {
  const s = readSmtpSettings();
  try {
    await buildTransport(s).verify();
    return { ok: true, settings: s };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    return { ok: false, code: e?.code || 'unknown', message: e?.message || String(err) };
  }
}

/**
 * One actionable line describing why the transport refused a send. Written for
 * production logs: whoever reads it should not need to know nodemailer's error
 * taxonomy to know what to do next.
 */
export function describeMailError(error: unknown): string {
  const err = error as { code?: string; response?: string; message?: string };
  const code = err?.code || 'unknown';

  if (code === 'EAUTH') {
    return (
      'SMTP authentication rejected (EAUTH). The stored credential is not a valid ' +
      'App Password for SMTP_USER — Google revokes every App Password when the account ' +
      'password changes or 2-Step Verification is toggled. Mint a new App Password and ' +
      'update SMTP_PASS in Vercel (Production + Preview + Development), then redeploy; ' +
      'env changes do not reach a running deployment. Confirm with ' +
      '`node scripts/verify-email-transport.js`.'
    );
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET') {
    return `SMTP connection failed (${code}) — host/port unreachable or blocked from this network.`;
  }
  if (code === 'EENVELOPE') {
    return (
      'SMTP rejected the envelope (EENVELOPE) — usually EMAIL_FROM is not an address ' +
      'the authenticated account is permitted to send as.'
    );
  }
  if (
    typeof err?.message === 'string' &&
    (err.message.includes('Missing SMTP_USER') || err.message.includes('Missing SMTP_PASS'))
  ) {
    return 'SMTP_USER / SMTP_PASS are not set in this environment.';
  }
  return `SMTP send failed (${code}).`;
}

/** Short message for JSON responses — details stay in server logs */
export function mailErrorResponseMessage(error: unknown): string {
  const err = error as { code?: string; message?: string };
  if (err?.code === 'EAUTH') {
    return 'We could not deliver your message by email. Please call us or try again later.';
  }
  if (
    typeof err?.message === 'string' &&
    (err.message.includes('Missing SMTP_USER') ||
      err.message.includes('Missing SMTP_PASS'))
  ) {
    return 'This form is temporarily unavailable. Please contact us by phone.';
  }
  return 'Failed to send your message. Please try again later or contact us by phone.';
}
