import { NextRequest, NextResponse } from 'next/server';
import { requireGhlProxySecret } from '@/lib/ghl-proxy-auth';

const ghl = require('@/lib/ghl-client.js');

/**
 * app/api/ghl/calendar-slots/route.ts
 *
 * GET /api/ghl/calendar-slots?calendarId=<id>&startDate=<epoch_ms>&endDate=<epoch_ms>
 *     [&timezone=Europe/London]
 *
 * Returns the available booking slots for a GHL calendar so the site can
 * render an online roof-inspection booking picker. Read-only.
 *
 * If calendarId is omitted, lists the location's calendars so the caller
 * can discover the right one.
 *
 * Auth: shared secret (GHL_PROXY_SECRET) — see lib/ghl-proxy-auth.ts. Unguarded
 * until 2026-09-15; read-only, but it proxies GHL with our token for any
 * calendarId the caller names, so it is a quota-burn and enumeration surface.
 */
export async function GET(request: NextRequest) {
  // Auth first — nothing below is reachable without the shared secret.
  const denied = requireGhlProxySecret(request);
  if (denied) return denied;

  if (!ghl.isConfigured()) {
    return NextResponse.json({ success: false, error: 'GHL not configured' }, { status: 503 });
  }
  const locationId = ghl.locationId();
  const { searchParams } = new URL(request.url);
  const calendarId = searchParams.get('calendarId');

  // Discovery mode: list calendars for the location.
  if (!calendarId) {
    const res = await ghl.get(`/calendars/?locationId=${encodeURIComponent(locationId)}`);
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `calendars list failed (${res.status})`, detail: res.data }, { status: res.status || 502 });
    }
    const calendars = (res.data && res.data.calendars) || [];
    return NextResponse.json({
      success: true,
      calendars: calendars.map((c: any) => ({ id: c.id, name: c.name, description: c.description, isActive: c.isActive })),
    });
  }

  // Slots mode: fetch free slots for a window.
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const timezone = searchParams.get('timezone') || 'Europe/London';
  if (!startDate || !endDate) {
    return NextResponse.json({ success: false, error: 'startDate and endDate (epoch ms) are required' }, { status: 400 });
  }

  const res = await ghl.get(
    `/calendars/${encodeURIComponent(calendarId)}/free-slots?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&timezone=${encodeURIComponent(timezone)}`
  );
  if (!res.ok) {
    return NextResponse.json({ success: false, error: `free-slots failed (${res.status})`, detail: res.data }, { status: res.status || 502 });
  }

  // GHL returns slots keyed by date: { "2026-07-29": { slots: [...] }, ... }
  const data = res.data || {};
  const days = Object.keys(data).filter(k => k !== 'traceId');
  const slotsByDay: Record<string, string[]> = {};
  for (const day of days) {
    const entry = data[day];
    slotsByDay[day] = (entry && entry.slots) || [];
  }

  return NextResponse.json({ success: true, calendarId, timezone, slots: slotsByDay });
}
