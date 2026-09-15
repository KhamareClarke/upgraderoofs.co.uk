/**
 * GET /api/health/lead-pipeline
 *
 * Reports whether leads are still being captured, and whether each downstream
 * channel (GHL, SMTP, owner SMS) is still succeeding. Returns:
 *
 *   200 — every channel healthy within the silence window
 *   503 — something is stale or unreadable; `alerts` says what
 *
 * A non-200 here is the machine-readable version of "the thing that broke for
 * 19 days". Point any uptime monitor at this URL and it becomes an alert; it is
 * also safe to hit from a browser, since it exposes no customer data.
 *
 * Auth: optional. Set LEAD_HEALTH_SECRET and callers must send
 * `?secret=` or `x-health-secret`. Left open when unset, because the response
 * contains only channel names, timestamps and counts.
 *
 * Wiring it to an alert: `vercel.json` schedules a daily request to this path,
 * and a 503 also pushes a fleet-ingest event, so the owner's hub hears about it
 * even if nobody is reading Vercel's cron log.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLeadPipelineHealth } from '@/lib/lead-health';
import { emitFleetIngest } from '@/lib/fleet-ingest';
import { secretMatches, readProvidedSecret } from '@/lib/shared-secret';

export const dynamic = 'force-dynamic';

function isAuthorised(request: NextRequest): boolean {
  const secret = (process.env.LEAD_HEALTH_SECRET || '').trim();
  if (!secret) return true; // unauthenticated by design — see the header note
  const provided = readProvidedSecret(request, {
    headers: ['x-health-secret'],
    queryParam: 'secret',
  });
  return secretMatches(provided, secret);
}

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const health = await getLeadPipelineHealth();

  // Escalate to the owner's hub only on a real problem. The cron hitting this
  // endpoint daily would otherwise emit a heartbeat nobody reads, and a noisy
  // alert channel is one that gets ignored — which is how the original outage
  // stayed invisible.
  if (!health.healthy) {
    void emitFleetIngest({
      event_type: 'lead_pipeline_unhealthy',
      summary: `Lead pipeline unhealthy — ${health.alerts.join(' | ')}`,
      payload: {
        store: health.store,
        window_days: health.windowDays,
        channels: health.channels,
      },
    });
  }

  return NextResponse.json(health, { status: health.healthy ? 200 : 503 });
}
