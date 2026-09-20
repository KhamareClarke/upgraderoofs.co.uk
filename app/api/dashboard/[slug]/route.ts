import { NextRequest, NextResponse } from 'next/server';

import { getDashboardData } from '@/lib/dashboard-data';
import { isDashboardSlug } from '@/lib/dashboard-slug';

/**
 * GET /api/dashboard/[slug]
 *
 * The data behind the private dashboard. Read-only, no login — the slug in the
 * path is the whole credential (see lib/dashboard-slug.ts).
 *
 * ── Why a 404 and not a 401 ──────────────────────────────────────────────────
 *
 * A 401 would answer "this route exists and you got the secret wrong", which
 * confirms the endpoint is worth attacking and tells an enumerator their probe
 * reached a real guard. A 404 says nothing: a wrong slug and a route that was
 * never deployed are indistinguishable. With 96 bits of entropy the distinction
 * is academic, but it costs nothing to not hand it over.
 *
 * ── Why the guard is the FIRST statement ────────────────────────────────────
 *
 * Before the store is touched, before any Google call. A request with the wrong
 * slug must not be able to make this deployment do work — otherwise the endpoint
 * is a free amplifier for anyone who guesses at the path, and the Ads/GBP reads
 * behind it cost quota and latency.
 *
 * ── Caching ─────────────────────────────────────────────────────────────────
 *
 * `force-dynamic` plus an explicit `no-store, private`. These figures are
 * commercially sensitive and they change; a CDN-cached copy handed to a later
 * request would be both stale and, if Vercel ever keyed the cache more loosely
 * than the full path, a leak. The response also carries `X-Robots-Tag: noindex`
 * so the JSON cannot be indexed even if the page's meta tag is missed.
 */

export const dynamic = 'force-dynamic';

/** Never cached, never indexed. Applied to both the 404 and the payload. */
const PRIVATE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  if (!isDashboardSlug(params.slug)) {
    // Deliberately as terse as Next's own 404. Nothing here distinguishes
    // "wrong slug" from "no such route".
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: PRIVATE_HEADERS },
    );
  }

  const data = await getDashboardData();
  return NextResponse.json(data, { status: 200, headers: PRIVATE_HEADERS });
}
