import { NextRequest, NextResponse } from 'next/server';
import { secretMatches, readProvidedSecret } from '@/lib/shared-secret';
import { emitFleetIngest } from '@/lib/fleet-ingest';
import { pushLeadToGhl } from '@/lib/ghl';

/**
 * app/api/webhooks/call-tracking/route.ts
 *
 * Receives inbound phone-call events from a call-tracking provider (CallRail,
 * Twilio, or Google Forwarding) and pipes them into the tracking pipeline:
 *
 *   1. Extract the caller's phone number, call duration, timestamp, source
 *      (Google Ads vs Organic), and the recorded destination number.
 *   2. Upsert the caller into GoHighLevel as a Contact tagged `inbound-call`
 *      (and `call-tracking`) — so the call registers alongside form leads —
 *      then attach a note recording duration / source / destination.
 *   3. Emit a fleet-ingest telemetry event for observability.
 *
 * Provider payloads differ, so extraction is tolerant (`pick` reads several
 * flat + nested shapes). The source is classified PAID when a gclid is present
 * or the provider reports an ads source, otherwise ORGANIC.
 *
 * Security: a shared secret guards the endpoint. Set
 * CALL_TRACKING_WEBHOOK_SECRET and send it as a header (`x-call-secret`),
 * a query param (`?secret=`), or a body field (`secret`).
 *
 * When the var is UNSET the endpoint accepts every caller, and that is the
 * state it shipped in — so the guard existed but had never once been exercised.
 * Unset now logs a loud warning rather than failing silently. It deliberately
 * does NOT fail closed: no provider is configured yet, and rejecting call
 * events outright on a missing env var would be a worse failure than an open
 * endpoint on a route that only creates CRM contacts.
 *
 * The comparison is constant-time. `provided !== expected` short-circuits on
 * the first differing byte, which leaks how much of a guessed secret was
 * correct; both sides are SHA-256'd first so the buffers are equal-length
 * (timingSafeEqual throws otherwise, and a length mismatch is itself a signal).
 *
 * Expected typical payload shapes (all handled):
 *   CallRail:    { answered, duration, start_time, customer_phone_number,
 *                  tracking_phone_number, source_name, keywords, tags, ... }
 *   Twilio:      { CallSid, CallStatus, CallDuration, From, To, Called,
 *                  Direction, AccountSid, ... }
 *   Google Fwd:  { callerNumber, forwardingNumber, durationSeconds,
 *                  callTime, ... }
 *
 * Env (server):
 *   GHL_LOCATION_ID / GHL_API_KEY       — existing lead-pipeline creds
 *   (optional) CALL_TRACKING_WEBHOOK_SECRET — shared secret (see above)
 */

const GCLID_RE = /^[A-Za-z0-9_-]{20,128}$/;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Pull a field out of a webhook payload tolerantly (flat or nested). Returns
 * the first non-empty string match, or undefined.
 */
function pick(body: any, ...paths: string[][]): string | undefined {
  for (const path of paths) {
    let cur: any = body;
    let ok = true;
    for (const key of path) {
      if (cur == null || typeof cur !== 'object' || !(key in cur)) { ok = false; break; }
      cur = cur[key];
    }
    if (ok && cur != null && cur !== '') return String(cur);
  }
  return undefined;
}

/** Validate a gclid token (mirrors the ghl-webhook rule). */
function sanitizeGclid(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  if (s === s.toLowerCase() && s !== s.toUpperCase()) return undefined; // lowercased
  if (!GCLID_RE.test(s)) return undefined;
  return s;
}

function parseDuration(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Classify the call source as 'paid' (Google Ads) or 'organic'. A gclid wins
 * outright; otherwise inspect the provider's source labels for an ads signal.
 */
function classifySource(body: any, gclid: string | undefined): 'paid' | 'organic' {
  if (gclid) return 'paid';
  const sourceLabels = [
    pick(body, ['source'], ['source_name'], ['sourceName'], ['campaign'], ['campaign_name'], ['marketing_source'], ['tracking', 'source']),
    pick(body, ['keywords']) || pick(body, ['ads', 'keyword']),
    pick(body, ['tags']) || pick(body, ['tag']),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/(google\s*ads|ppc|paid\s*search|cpc|gclid|adwords|display|shopping)/.test(sourceLabels)) {
    return 'paid';
  }
  return 'organic';
}

function normalizeTimestamp(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? new Date().toISOString() : new Date(ms).toISOString();
}

// --- POST handler ----------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  // Shared-secret verification (set CALL_TRACKING_WEBHOOK_SECRET).
  const expectedSecret = (process.env.CALL_TRACKING_WEBHOOK_SECRET || '').trim();
  if (expectedSecret) {
    const provided = readProvidedSecret(request, {
      headers: ['x-call-secret'],
      queryParam: 'secret',
      body,
      bodyFields: [['secret']],
    });
    if (!secretMatches(provided, expectedSecret)) {
      return jsonError('Unauthorized', 401);
    }
  } else {
    // The endpoint is openly accepting call events. Logged on every request
    // because this is the exact condition that made the guard inert: the route
    // looks protected in source, and nothing anywhere said otherwise.
    console.warn(
      '[call-tracking] CALL_TRACKING_WEBHOOK_SECRET is unset — this endpoint is ' +
        'accepting unauthenticated POSTs. Set it in Vercel and redeploy.',
    );
  }

  // Tolerant extraction across CallRail / Twilio / Google Forwarding shapes.
  const callerPhone =
    pick(body, ['caller_phone'], ['callerNumber'], ['caller_number'], ['customer_phone_number'], ['from'], ['From'], ['phone'], ['caller', 'phone']) ||
    pick(body, ['caller_id'], ['callerId']);
  const destination =
    pick(body, ['destination'], ['destination_number'], ['tracking_phone_number'], ['forwarding_number'], ['forwardingNumber'], ['to'], ['To'], ['called'], ['Called']);
  const duration =
    pick(body, ['duration'], ['durationSeconds'], ['duration_seconds'], ['call_duration'], ['callDuration'], ['CallDuration']) ??
    pick(body, ['answered_duration'], ['connected_duration']);
  const gclidRaw =
    pick(body, ['gclid'], ['GCLID'], ['click_id'], ['clickId'], ['gcl_id'], ['contact', 'gclid'], ['customField', 'gclid']);
  const tsRaw =
    pick(body, ['timestamp'], ['time'], ['call_time'], ['callTime'], ['start_time'], ['startTime'], ['date'], ['Date'], ['created_at'], ['createdAt'], ['CallTimestamp']);

  const gclid = sanitizeGclid(gclidRaw);
  const source = classifySource(body, gclid);
  const durationSecs = parseDuration(duration);
  const timestamp = normalizeTimestamp(tsRaw);

  // A call event is only meaningful with a caller number; without it we can't
  // upsert a contact, so acknowledge but flag it rather than create junk.
  if (!callerPhone) {
    await emitFleetIngest({
      event_type: 'call_tracking_skipped',
      summary: 'Call-tracking webhook received without a caller number — cannot attribute (destination: ' + (destination || 'unknown') + ')',
      payload: { source, duration: durationSecs, destination },
    });
    return NextResponse.json({ success: false, error: 'No caller phone number in payload' }, { status: 422 });
  }

  // Normalise the phone into a GHL-friendly string (strip spaces).
  const phone = callerPhone.replace(/[^\d+]/g, '');

  const durationNote =
    durationSecs != null ? `${durationSecs}s` : 'duration unknown';

  // 1. Upsert caller as an inbound-call contact (registers alongside form leads).
  const ghlContactId = await pushLeadToGhl({
    name: 'Inbound Caller',
    phone,
    tags: ['inbound-call', 'call-tracking'],
    source: 'phone_call',
    gclid,
    notes: `Inbound call: ${durationNote}, source ${source}, destination ${destination || 'unknown'}`,
  });

  // 2. Observability — always emit, even if GHL upsert returned null (non-fatal).
  await emitFleetIngest({
    event_type: 'call_tracking',
    summary: `Inbound call from ${phone} (${source}, ${durationNote})${gclid ? ' — gclid ' + gclid.slice(0, 12) + '…' : ''}`,
    payload: {
      phone,
      source,
      attributed: source === 'paid',
      gclid: gclid ? gclid.slice(0, 12) + '…' : undefined,
      duration: durationSecs,
      destination,
      timestamp,
      ghlContactId: ghlContactId || undefined,
    },
  });

  return NextResponse.json({
    success: true,
    source,
    attributed: source === 'paid',
    duration: durationSecs,
    ghlContactId: ghlContactId || null,
  }, { status: 200 });
}

// Provider testers sometimes probe with GET — answer usefully.
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'call-tracking',
    expects: 'POST { caller_phone, duration, timestamp, source?, gclid?, destination? }',
    auth: (process.env.CALL_TRACKING_WEBHOOK_SECRET || '') ? 'secret-guarded' : 'open',
  });
}
