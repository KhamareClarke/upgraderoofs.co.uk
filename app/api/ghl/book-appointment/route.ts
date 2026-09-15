import { NextRequest, NextResponse } from 'next/server';
import { pushLeadToGhl } from '@/lib/ghl';
import { emitFleetIngest } from '@/lib/fleet-ingest';
import { requireGhlProxySecret } from '@/lib/ghl-proxy-auth';

const ghl = require('@/lib/ghl-client.js');

/**
 * app/api/ghl/book-appointment/route.ts
 *
 * POST /api/ghl/book-appointment
 * Books a roof-inspection appointment into a GHL Calendar. Upserts the
 * contact first (so the appointment is linked to a CRM record, with gclid
 * for attribution), then creates the appointment.
 *
 * Auth: shared secret (GHL_PROXY_SECRET) — see lib/ghl-proxy-auth.ts. Unguarded
 * until 2026-09-15, so an anonymous caller could book appointments against any
 * calendarId and fill the calendar with junk.
 *
 * Body:
 *   {
 *     calendarId: string (required)
 *     startTime:  string (required, ISO 8601, e.g. "2026-07-30T10:00:00+01:00")
 *     endTime:    string (optional — defaults to +30min)
 *     name:       string (required)
 *     phone:      string (required)
 *     email?:     string
 *     postcode?:  string
 *     address?:   string
 *     notes?:     string   e.g. roof type / issue
 *     gclid?:     string
 *     title?:     string   appointment title (default "Roof Inspection")
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

  const { calendarId, startTime, name, phone } = body || {};
  if (!calendarId || !startTime || !name || !phone) {
    return NextResponse.json({ success: false, error: 'calendarId, startTime, name and phone are required' }, { status: 400 });
  }

  const locationId = ghl.locationId();
  const title = body.title || 'Roof Inspection';
  const endTime = body.endTime || new Date(new Date(startTime).getTime() + 30 * 60000).toISOString();

  // 1. Upsert the contact (carries gclid + tags for attribution).
  const contactId = await pushLeadToGhl({
    name,
    email: body.email,
    phone,
    postcode: body.postcode,
    gclid: body.gclid,
    tags: ['website-lead', 'booking', 'roof-inspection', ...(body.gclid ? ['google-ads-lead'] : [])],
    source: 'online_booking',
    notes: body.notes || `Roof inspection booked for ${startTime}`,
  });
  if (!contactId) {
    return NextResponse.json({ success: false, error: 'Could not create/find GHL contact for booking' }, { status: 502 });
  }

  // 2. Create the appointment.
  const apptPayload: Record<string, unknown> = {
    calendarId,
    locationId,
    contactId,
    startTime,
    endTime,
    title,
    appointmentStatus: 'confirmed',
  };
  if (body.address) apptPayload.address = body.address;
  if (body.notes) apptPayload.notes = body.notes;

  const res = await ghl.post('/calendars/events/appointments', apptPayload);
  if (!res.ok) {
    await emitFleetIngest({
      event_type: 'ghl_booking_error',
      summary: `Appointment booking FAILED for ${name} (${phone}) at ${startTime}: ${res.status}`,
      payload: { calendarId, startTime, contactId, status: res.status, detail: res.data },
    });
    return NextResponse.json({ success: false, error: `appointment create failed (${res.status})`, detail: res.data, contactId }, { status: res.status || 502 });
  }

  const appt = res.data && (res.data.appointment || res.data);
  await emitFleetIngest({
    event_type: 'ghl_booking',
    summary: `Roof inspection booked: ${name} (${phone}) — ${startTime}${body.postcode ? ' — ' + body.postcode : ''}`,
    payload: { calendarId, startTime, endTime, contactId, appointmentId: appt && appt.id, postcode: body.postcode, gclid: body.gclid },
  });

  return NextResponse.json({
    success: true,
    appointmentId: appt && appt.id,
    contactId,
    startTime,
    endTime,
    title,
  }, { status: 201 });
}
