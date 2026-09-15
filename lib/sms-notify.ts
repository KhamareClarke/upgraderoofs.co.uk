/**
 * lib/sms-notify.ts
 *
 * Owner-notification SMS for new website leads, dispatched through GoHighLevel's
 * conversations API.
 *
 * WHY THIS IS SEPARATE FROM lib/ghl.ts
 * ------------------------------------
 * lib/ghl.ts writes the *lead* into the CRM. This sends a *notification about*
 * the lead to the business owner. They are different directions, different
 * recipients, and — since the SMS path may be pointed at a different
 * sub-account — potentially different credentials. Keeping them apart means an
 * SMS misconfiguration can never affect lead capture.
 *
 * WHAT IT DOES
 * ------------
 *   1. Resolves config. If it is incomplete this is a NO-OP that logs once —
 *      never an error, never a thrown exception.
 *   2. Upserts the owner as a contact in the target location. GHL's
 *      send-message endpoint requires a `contactId`, and a contact id is only
 *      meaningful inside the location that owns it, so this cannot be skipped
 *      or cached across locations.
 *   3. POSTs the SMS via /conversations/messages with `fromNumber` set to the
 *      configured sender.
 *
 * THE `fromNumber` CONSTRAINT — READ BEFORE DEBUGGING
 * ---------------------------------------------------
 * GHL will only send from a number **provisioned in the location**. Passing an
 * arbitrary number the business happens to own does not work; the API either
 * rejects it or silently falls back to the location's primary number. If
 * dispatch fails, check the number is actually provisioned before touching this
 * code:
 *
 *     node scripts/probe-sms-account.js
 *
 * Check 2 lists every number in the location. If it reports zero, no code here
 * can succeed.
 *
 * Env (all optional — absence degrades to a logged no-op):
 *   SMS_GHL_API_KEY      token for the SMS location (falls back to GHL_API_KEY)
 *   SMS_LOCATION_ID      location that owns the sending number (falls back to GHL_LOCATION_ID)
 *   SMS_SENDER_PHONE     the provisioned number to send FROM
 *   MARCUS_PHONE         the owner's number to notify
 *   SMS_RECIPIENT_NAME   display name for the owner contact (default "Marcus")
 */

const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';
const TIMEOUT_MS = 8000;

/** Fields a lead route can hand over for the notification body. */
export interface LeadNotification {
  name?: string;
  phone?: string;
  email?: string;
  postcode?: string;
  service?: string;
  source: string;
}

export interface SmsResult {
  ok: boolean;
  /** True only when GHL accepted the message. */
  sent: boolean;
  /** Present whenever `sent` is false — safe to log, never contains credentials. */
  reason?: string;
  conversationId?: string;
  messageId?: string;
  /** The owner contact id used, for debugging. */
  contactId?: string;
}

interface SmsConfig {
  token: string;
  locationId: string;
  sender: string;
  recipient: string;
  recipientName: string;
}

/**
 * Resolve config, or null when the SMS path is not fully configured.
 * Falls back to the primary GHL credentials, so a single-account setup needs
 * only SMS_SENDER_PHONE + MARCUS_PHONE.
 */
function readConfig(): SmsConfig | null {
  const token = (process.env.SMS_GHL_API_KEY || process.env.GHL_API_KEY || '').trim();
  const locationId = (process.env.SMS_LOCATION_ID || process.env.GHL_LOCATION_ID || '').trim();
  const sender = (process.env.SMS_SENDER_PHONE || '').trim();
  const recipient = (process.env.MARCUS_PHONE || '').trim();
  if (!token || !locationId || !sender || !recipient) return null;
  return {
    token,
    locationId,
    sender: toE164(sender),
    recipient: toE164(recipient),
    recipientName: (process.env.SMS_RECIPIENT_NAME || 'Marcus').trim(),
  };
}

/** Normalise a UK number to E.164 — GHL stores and matches numbers in that form. */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0044')) return `+44${digits.slice(4).replace(/^0/, '')}`;
  if (digits.startsWith('44')) return `+${digits}`;
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`;
  return `+${digits}`;
}

/** fetch with a hard timeout — a hung SMS API must never stall a form response. */
async function ghlFetch(
  config: SmsConfig,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${GHL_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Version: API_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, data: null, error: message === 'This operation was aborted' ? `timed out after ${TIMEOUT_MS}ms` : message };
  } finally {
    clearTimeout(timer);
  }
}

/** Short, human-readable one-liner for the notification body. */
function buildMessage(lead: LeadNotification): string {
  const bits: string[] = [];
  if (lead.name) bits.push(lead.name);
  if (lead.phone) bits.push(lead.phone);
  if (lead.postcode) bits.push(lead.postcode);
  if (lead.service) bits.push(lead.service);
  const who = bits.length ? bits.join(' · ') : 'Unknown caller';
  const at = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });
  return `New website lead: ${who}\nVia ${lead.source} at ${at}`;
}

/** Non-fatal warning, emitted at most once per process per distinct reason. */
const warned = new Set<string>();
function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

/**
 * Notify the business owner of a new lead by SMS.
 *
 * Never throws and never rejects — a failure here must not affect lead capture
 * or the customer's form submission. Callers should treat a false `ok` as
 * informational and log it, not as an error to surface to the customer.
 */
export async function notifyOwnerOfLead(lead: LeadNotification): Promise<SmsResult> {
  const config = readConfig();
  if (!config) {
    // Deliberately quiet-but-visible: this is the expected state until the SMS
    // number is provisioned, and it must not spam logs on every submission.
    warnOnce(
      'unconfigured',
      '[sms] owner notification DISABLED — set SMS_SENDER_PHONE and MARCUS_PHONE ' +
        '(and SMS_LOCATION_ID if the SMS account differs from the CRM account). ' +
        'Check provisioning with: node scripts/probe-sms-account.js',
    );
    return { ok: false, sent: false, reason: 'not configured' };
  }

  // ── 1. Resolve (or create) the owner as a contact in the target location ──
  const upsert = await ghlFetch(config, 'POST', '/contacts/upsert', {
    locationId: config.locationId,
    phone: config.recipient,
    firstName: config.recipientName,
    source: 'website-sms-notify',
    tags: ['sms-notify-recipient'],
  });

  const contact = (upsert.data as { contact?: { id?: string } } | null)?.contact;
  const contactId = contact?.id;
  if (!upsert.ok || !contactId) {
    const reason =
      upsert.status === 403
        ? 'contact upsert forbidden — the SMS token cannot access SMS_LOCATION_ID'
        : // A 2xx with no contact.id means the body was not what we expect (an
          // HTML gateway page, an error envelope). Reporting the raw status
          // alone would read as a contradiction, so say which half failed.
          !upsert.ok
          ? `contact upsert failed (HTTP ${upsert.status})${upsert.error ? `: ${upsert.error}` : ''}`
          : `contact upsert returned HTTP ${upsert.status} but no contact id — unexpected response body`;
    console.error(`[sms] owner notification FAILED — ${reason}`);
    return { ok: false, sent: false, reason };
  }

  // ── 2. Dispatch ───────────────────────────────────────────────────────────
  const send = await ghlFetch(config, 'POST', '/conversations/messages', {
    type: 'SMS',
    contactId,
    message: buildMessage(lead),
    // Must be a number provisioned in this location — see the header note.
    fromNumber: config.sender,
  });

  if (!send.ok) {
    const data = send.data as { message?: string } | null;
    const reason =
      send.status === 403
        ? 'send forbidden — token lacks the conversations/messages scope'
        : `send failed (HTTP ${send.status})${data?.message ? `: ${data.message}` : send.error ? `: ${send.error}` : ''}`;
    console.error(`[sms] owner notification FAILED — ${reason}`);
    return { ok: false, sent: false, reason, contactId };
  }

  const result = send.data as { conversationId?: string; messageId?: string } | null;
  console.log(`[sms] owner notified — messageId=${result?.messageId || 'n/a'}`);
  return {
    ok: true,
    sent: true,
    conversationId: result?.conversationId,
    messageId: result?.messageId,
    contactId,
  };
}
