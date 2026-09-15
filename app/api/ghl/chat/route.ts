import { NextRequest, NextResponse } from 'next/server';
import { pushLeadToGhl } from '@/lib/ghl';
import { emitFleetIngest } from '@/lib/fleet-ingest';
import { requireGhlProxySecret } from '@/lib/ghl-proxy-auth';

const ghl = require('@/lib/ghl-client.js');

/**
 * app/api/ghl/chat/route.ts
 *
 * POST /api/ghl/chat
 * Sends a live-chat / web-lead message into GHL Conversations. Upserts the
 * contact (so the thread attaches to a CRM record with gclid), finds or
 * creates the conversation, then posts an inbound message. GHL can then
 * route it to SMS / the Conversations inbox for the team to answer.
 *
 * Auth: shared secret (GHL_PROXY_SECRET) — see lib/ghl-proxy-auth.ts. This route
 * had NO guard until 2026-09-15, so any anonymous caller could create contacts
 * and send SMS through our GHL account by setting `type: 'SMS'`.
 *
 * Body:
 *   {
 *     name:     string (required)
 *     message:  string (required)
 *     phone?:   string   (required for SMS delivery)
 *     email?:   string
 *     gclid?:   string
 *     type?:    'SMS' | 'Live_Chat' | 'Web_Chat'  (default 'Live_Chat')
 *   }
 */
export async function POST(request: NextRequest) {
  // Auth first — nothing below is reachable without the shared secret.
  const denied = requireGhlProxySecret(request);
  if (denied) return denied;

  if (!ghl.isConfigured()) {
    return NextResponse.json({ success: false, error: 'GHL not configured' }, { status: 503 });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, message } = body || {};
  if (!name || !message) {
    return NextResponse.json({ success: false, error: 'name and message are required' }, { status: 400 });
  }

  const locationId = ghl.locationId();
  const msgType = body.type || 'Live_Chat';

  // 1. Upsert the contact.
  const contactId = await pushLeadToGhl({
    name,
    email: body.email,
    phone: body.phone,
    gclid: body.gclid,
    tags: ['website-lead', 'live-chat', ...(body.gclid ? ['google-ads-lead'] : [])],
    source: 'live_chat',
    notes: message,
  });
  if (!contactId) {
    return NextResponse.json({ success: false, error: 'Could not create/find GHL contact for chat' }, { status: 502 });
  }

  // 2. Find or create the conversation for this contact.
  let conversationId: string | null = null;
  const search = await ghl.get(`/conversations/search?locationId=${encodeURIComponent(locationId)}&contactId=${encodeURIComponent(contactId)}`);
  if (search.ok) {
    const convos = (search.data && search.data.conversations) || [];
    if (convos.length) conversationId = convos[0].id;
  }
  if (!conversationId) {
    const created = await ghl.post('/conversations/', { locationId, contactId });
    if (created.ok) {
      conversationId = (created.data && (created.data.conversation && created.data.conversation.id)) || (created.data && created.data.id) || null;
    }
  }
  if (!conversationId) {
    return NextResponse.json({ success: false, error: 'Could not open a GHL conversation for this contact', contactId }, { status: 502 });
  }

  // 3. Post the inbound message into the conversation.
  const msgRes = await ghl.post('/conversations/messages', {
    type: msgType,
    conversationId,
    contactId,
    locationId,
    message,
    direction: 'inbound',
  });
  if (!msgRes.ok) {
    await emitFleetIngest({
      event_type: 'ghl_chat_error',
      summary: `Chat message FAILED for ${name}: ${msgRes.status}`,
      payload: { contactId, conversationId, status: msgRes.status, detail: msgRes.data },
    });
    return NextResponse.json({ success: false, error: `message send failed (${msgRes.status})`, detail: msgRes.data, contactId, conversationId }, { status: msgRes.status || 502 });
  }

  await emitFleetIngest({
    event_type: 'ghl_chat',
    summary: `Live chat from ${name}${body.phone ? ' (' + body.phone + ')' : ''}: ${message.slice(0, 80)}`,
    payload: { contactId, conversationId, type: msgType, gclid: body.gclid },
  });

  return NextResponse.json({ success: true, contactId, conversationId, delivered: msgType }, { status: 201 });
}
