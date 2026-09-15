import { NextRequest, NextResponse } from 'next/server';
import { emitFleetIngest } from '@/lib/fleet-ingest';
import { secretMatches, readProvidedSecret } from '@/lib/shared-secret';

const ghl = require('@/lib/ghl-client.js');

/**
 * app/api/ghl-webhook/route.ts
 *
 * Receives GoHighLevel workflow triggers fired when an opportunity's stage
 * changes (e.g. to "Site Visit Booked" or "Job Won"), and uploads an
 * OFFLINE CONVERSION back to Google via the Data Manager API
 * (`v1/events:ingest`) — so Google can attribute the closed revenue to the
 * original click (gclid).
 *
 * The legacy ConversionUploadService.UploadClickConversions (Google Ads API
 * v22) path is deprecated and now rejected ("use the Data Manager API").
 * Data Manager uses a DIFFERENT OAuth scope
 * (https://www.googleapis.com/auth/datamanager) and has NO developer-token /
 * login-customer-id headers; the customer is addressed in-body via the
 * Destination.operatingAccount.
 *
 * GHL setup:
 *   Opportunities → Workflow → trigger "Opportunity Status Changed" /
 *   "Stage Changed" → action "Send Webhook" → POST to
 *   https://www.upgraderoofs.co.uk/api/ghl-webhook
 *   Include the contact's gclid custom field and the new stage name in the
 *   webhook payload (see expected body below).
 *
 * Expected GHL webhook payload (JSON) — tolerant of GHL's nesting:
 *   {
 *     "contact_id": "...",            // GHL contact id
 *     "stage": "Job Won",             // new stage name (or opportunity.stage.name)
 *     "gclid": "Cj0KCQ...",           // from contact custom field
 *     "value": 4500,                  // optional deal value (GBP)
 *     "email": "...", "phone": "..."  // optional, for logging
 *   }
 *
 * Env required (server):
 *   GOOGLE_ADS_CUSTOMER_ID                — addressed as destination operating account
 *   GOOGLE_DM_CLIENT_ID, GOOGLE_DM_CLIENT_SECRET, GOOGLE_DM_REFRESH_TOKEN
 *   (optional) GHL_WEBHOOK_SECRET         — shared secret to verify callers
 *   (optional) GADS_CONV_SITE_VISIT / GADS_CONV_JOB_WON — conversion action ids
 *                                                (defaults 7700922852 / 7700922855)
 */

// Data Manager ingest is a single host; injectable so tests can point the
// upload at a local mock without touching the real endpoint.
const DM_HOST = (process.env.DM_API_HOST || 'datamanager.googleapis.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
const DM_PROTOCOL = (process.env.DM_API_PROTOCOL || 'https').replace(/:\/\/$/, '');
const DM_BASE = `${DM_PROTOCOL}://${DM_HOST}`;
const DM_INGEST_PATH = '/v1/events:ingest';
const OAUTH_TOKEN_URL = process.env.DM_OAUTH_TOKEN_URL || process.env.GADS_OAUTH_TOKEN_URL || 'https://oauth2.googleapis.com/token';

/**
 * Stage names that trigger an offline conversion upload. Each maps to its own
 * Google Ads conversion action (created for offline import) so "Site Visit
 * Booked" and "Job Won" report as separate goals with their own values.
 * conversionActionId matches the live actions in customer 8479028400; the env
 * vars allow override without a code change.
 */
const STAGE_CONVERSIONS: Array<{ match: RegExp; label: string; defaultValue: number; conversionActionId: string }> = [
  {
    match: /site\s*visit\s*booked/i,
    label: 'Site Visit Booked',
    defaultValue: 50,
    conversionActionId: (process.env.GADS_CONV_SITE_VISIT || '7700922852'),
  },
  {
    match: /job\s*won/i,
    label: 'Job Won',
    defaultValue: 1200,
    conversionActionId: (process.env.GADS_CONV_JOB_WON || '7700922855'),
  },
];

const GCLID_RE = /^[A-Za-z0-9_-]{20,128}$/;

/**
 * Validate a Google Click ID BEFORE it is handed to the Data Manager
 * ingest endpoint. Data Manager fast-fails the ENTIRE request on a single
 * bad event (no partial-failure row), so we reject malformed / lowercased /
 * double-encoded / gbraid-shaped tokens here and log them locally instead.
 */
function validateGclid(raw: string): { ok: true; value: string } | { ok: false; reason: string } {
  const s = (raw || '').trim();
  if (!s) return { ok: false, reason: 'gclid is empty' };
  // A genuine gclid normally contains an uppercase char; an all-lowercase
  // token is almost always a .toLowerCase() transform upstream.
  if (s === s.toLowerCase() && s !== s.toUpperCase()) {
    return { ok: false, reason: 'gclid appears lowercased — gclid is case-sensitive' };
  }
  if (!GCLID_RE.test(s)) {
    return { ok: false, reason: 'gclid fails charset/length rule (' + s.length + ' chars)' };
  }
  return { ok: true, value: s };
}
function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/** Pull a field out of a GHL webhook payload tolerantly (flat or nested). */
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

// --- Data Manager auth + offline conversion upload --------------------------

async function getDmAccessToken(): Promise<string> {
  const { GOOGLE_DM_CLIENT_ID, GOOGLE_DM_CLIENT_SECRET, GOOGLE_DM_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_DM_CLIENT_ID || !GOOGLE_DM_CLIENT_SECRET || !GOOGLE_DM_REFRESH_TOKEN) {
    throw new Error('Data Manager OAuth env vars not configured (GOOGLE_DM_*)');
  }
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_DM_CLIENT_ID,
      client_secret: GOOGLE_DM_CLIENT_SECRET,
      refresh_token: GOOGLE_DM_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Data Manager token exchange failed: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data.access_token;
}

function dmHeaders(accessToken: string): Record<string, string> {
  // Data Manager uses only standard Bearer auth — NO developer-token and NO
  // login-customer-id header. The customer is addressed in the request body.
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Upload a click (offline) conversion to the Data Manager API
 * (`datamanager.events.ingest`), which replaced the deprecated
 * ConversionUploadService.UploadClickConversions.
 *
 * Body maps to IngestEventsRequest:
 *   destinations[0].operatingAccount.accountId  = Google Ads customer id
 *   destinations[0].operatingAccount.accountType = GOOGLE_ADS
 *   destinations[0].productDestinationId        = conversion action id
 *   events[0].adIdentifiers.gclid               = gclid
 *   events[0].eventTimestamp                    = conversion time (RFC-3339)
 *   events[0].conversionValue / currency        = value + currency
 */
async function uploadOfflineConversion(opts: {
  gclid: string;
  conversionActionId: string;
  eventTimestamp: string;
  value: number;
  currency?: string;
  transactionId?: string;
}): Promise<void> {
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
  if (!customerId) throw new Error('GOOGLE_ADS_CUSTOMER_ID not set');
  const accessToken = await getDmAccessToken();
  const headers = dmHeaders(accessToken);
  const currency = opts.currency || 'GBP';

  const body = {
    destinations: [
      {
        operatingAccount: {
          accountId: customerId,
          accountType: 'GOOGLE_ADS',
        },
        productDestinationId: opts.conversionActionId,
      },
    ],
    events: [
      {
        adIdentifiers: { gclid: opts.gclid },
        // Data Manager expects a stable idempotency key so retries don't
        // double-count the conversion. Derived from the raw gclid + the
        // conversion action so the same (gclid, stage) pair dedupes within
        // the 90-day window.
        transactionId: opts.transactionId || `${opts.gclid}:${opts.conversionActionId}`,
        eventTimestamp: opts.eventTimestamp,
        conversionValue: opts.value,
        currency,
      },
    ],
  };

  const res = await fetch(`${DM_BASE}${DM_INGEST_PATH}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Data Manager ingest failed: ${JSON.stringify(data).slice(0, 400)}`);
  }
}

/** Format an RFC-3339 UTC timestamp (with "Z") for the event timestamp. */
function dmDateTime(d: Date): string {
  return d.toISOString();
}

/**
 * Trigger a GHL workflow / conversation action for Voice AI follow-up when a
 * lead hits a key stage. GHL v2 has no direct "place Voice AI call" endpoint,
 * so we enqueue the contact into a GHL workflow (which owns the Voice AI
 * call step) via the conversations/workflow surface. Non-blocking.
 *
 * Configure the target workflow id via GHL_VOICE_AI_WORKFLOW_ID. If unset,
 * we just log the intent (no-op) so the webhook never fails on this path.
 */
async function triggerVoiceAiWorkflow(opts: { contactId?: string; stage: string; phone?: string; email?: string }) {
  const workflowId = (process.env.GHL_VOICE_AI_WORKFLOW_ID || '').trim();
  if (!opts.contactId) return { triggered: false, reason: 'no contactId' };
  if (!ghl.isConfigured()) return { triggered: false, reason: 'ghl not configured' };
  if (!workflowId) {
    return { triggered: false, reason: 'GHL_VOICE_AI_WORKFLOW_ID not set — set it to the workflow that owns the Voice AI call step' };
  }
  try {
    // Enroll the contact into the workflow that triggers the Voice AI call.
    const res = await ghl.post('/conversations/messages', {
      locationId: ghl.locationId(),
      contactId: opts.contactId,
      type: 'Workflow',
      workflowId,
      direction: 'outbound',
      message: `Voice AI follow-up for stage: ${opts.stage}`,
    });
    return { triggered: res.ok, status: res.status, reason: res.ok ? undefined : (res.error || 'workflow trigger rejected') };
  } catch (err) {
    return { triggered: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// --- Handler ------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  // Optional shared-secret verification (set GHL_WEBHOOK_SECRET and send it as
  // a header or ?secret= from the GHL workflow).
  //
  // Comparison is constant-time via the shared helper. Behaviour when the var is
  // UNSET is unchanged and deliberately stays fail-OPEN: a live GHL workflow
  // calls this route, so refusing every request on a missing env var would take
  // the conversion pipeline down — the opposite of the fix. The warning exists
  // so an unset var cannot be silent, which is how the call-tracking guard went
  // inert for its entire life.
  const expectedSecret = (process.env.GHL_WEBHOOK_SECRET || '').trim();
  if (expectedSecret) {
    const provided = readProvidedSecret(request, {
      headers: ['x-ghl-secret'],
      queryParam: 'secret',
      body,
      bodyFields: [['secret']],
    });
    if (!secretMatches(provided, expectedSecret)) {
      return jsonError('Unauthorized', 401);
    }
  } else {
    console.warn(
      '[ghl-webhook] GHL_WEBHOOK_SECRET is unset — this endpoint is accepting ' +
        'unauthenticated POSTs. Set it in Vercel and redeploy.',
    );
  }

  const stage = pick(body, ['stage'], ['opportunity', 'stage', 'name'], ['opportunity', 'stage'], ['new_stage'], ['status']);
  const gclid = pick(body, ['gclid'], ['contact', 'gclid'], ['customField', 'gclid'], ['customFields', 'gclid'], ['contact', 'customField', 'gclid']);
  const contactId = pick(body, ['contact_id'], ['contactId'], ['contact', 'id']);
  const email = pick(body, ['email'], ['contact', 'email']);
  const phone = pick(body, ['phone'], ['contact', 'phone']);
  const rawValue = pick(body, ['value'], ['opportunity', 'value'], ['deal_value'], ['monetary_value']);

  if (!stage) {
    return jsonError('No stage in payload — expected "stage" or opportunity.stage.name', 422);
  }

  // Log EVERY pipeline stage shift (not just conversion stages) for funnel
  // visibility, and fire Voice AI follow-up on conversion stages.
  const conv = STAGE_CONVERSIONS.find(c => c.match.test(stage));
  await emitFleetIngest({
    event_type: 'ghl_stage_shift',
    summary: `Pipeline stage → "${stage}" for ${contactId || email || phone || 'unknown contact'}${conv ? ' [conversion stage]' : ''}`,
    payload: { stage, isConversionStage: !!conv, contactId, email, phone, value: rawValue },
  });

  if (conv) {
    // Fire Voice AI follow-up (non-blocking — never blocks the conversion path).
    triggerVoiceAiWorkflow({ contactId, stage: conv.label, phone, email })
      .then(r => {
        if (!r.triggered) console.log(`[ghl-webhook] Voice AI not triggered: ${r.reason}`);
      })
      .catch(err => console.warn('[ghl-webhook] Voice AI trigger error:', err));
  }

  if (!conv) {
    // Not a stage we convert on — acknowledge so GHL doesn't retry, but do nothing.
    return NextResponse.json({ success: true, ignored: true, logged: true, reason: `stage "${stage}" not a conversion stage` }, { status: 200 });
  }

  if (!gclid) {
    await emitFleetIngest({
      event_type: 'ghl_offline_conversion_skipped',
      summary: `GHL "${conv.label}" for contact ${contactId || email || phone || 'unknown'} — no gclid, cannot upload offline conversion`,
      payload: { stage, contactId, email, phone },
    });
    return NextResponse.json({ success: true, ignored: true, reason: 'no gclid on contact — lead did not originate from a Google Ads click' }, { status: 200 });
  }

  // Reject malformed click ids BEFORE the ingest call so Google never sees a
  // bad event (which would fast-fail the whole request). Log it so we can
  // trace the upstream capture that corrupted it.
  const gclidCheck = validateGclid(gclid);
  if (!gclidCheck.ok) {
    console.error('[ghl-webhook] rejecting malformed gclid for "' + conv.label + '": ' + gclidCheck.reason);
    await emitFleetIngest({
      event_type: 'ghl_offline_conversion_skipped',
      summary: 'GHL "' + conv.label + '" — malformed gclid rejected (' + gclidCheck.reason + ') for ' + (contactId || email || phone || 'unknown'),
      payload: { stage, contactId, email, phone, gclid: (gclid || '').slice(0, 12) + '…', reason: gclidCheck.reason },
    });
    return NextResponse.json({ success: false, ignored: true, reason: 'malformed gclid: ' + gclidCheck.reason }, { status: 422 });
  }

  const value = rawValue != null && !isNaN(Number(rawValue)) ? Number(rawValue) : conv.defaultValue;

  try {
    // Route each stage to its own conversion action (Site Visit Booked / Job Won).
    await uploadOfflineConversion({
      gclid: gclidCheck.value,
      conversionActionId: conv.conversionActionId,
      eventTimestamp: dmDateTime(new Date()),
      value,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ghl-webhook] offline conversion upload failed:', msg);
    await emitFleetIngest({
      event_type: 'ghl_offline_conversion_error',
      summary: `Offline conversion upload FAILED for "${conv.label}" (gclid ${gclid.slice(0, 12)}…): ${msg}`,
      payload: { stage, gclid, value, error: msg },
    });
    return jsonError(`Upload failed: ${msg}`, 502);
  }

  await emitFleetIngest({
    event_type: 'ghl_offline_conversion',
    summary: `Offline conversion uploaded: "${conv.label}" — £${value} credited to gclid ${gclid.slice(0, 12)}…`,
    payload: { stage: conv.label, gclid, value, contactId, email, phone },
  });

  return NextResponse.json({
    success: true,
    conversion: { stage: conv.label, value, currency: 'GBP', gclid: gclid.slice(0, 12) + '…' },
  }, { status: 200 });
}

// GHL workflow testers sometimes probe with GET — answer usefully.
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'ghl-webhook',
    convertsOnStages: STAGE_CONVERSIONS.map(c => c.label),
    expects: 'POST { stage, gclid, value?, contact_id?, email?, phone? }',
  });
}
