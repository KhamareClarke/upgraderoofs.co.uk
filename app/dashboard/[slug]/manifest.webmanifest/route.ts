import { NextRequest, NextResponse } from 'next/server';

import { isDashboardSlug } from '@/lib/dashboard-slug';

/**
 * GET /dashboard/[slug]/manifest.webmanifest
 *
 * The web app manifest that makes the dashboard installable.
 *
 * ── Why this is a route and not a file in public/ ────────────────────────────
 *
 * `start_url` and `scope` have to name the slug, and a static file in `public/`
 * would put the slug on disk — committed to git, and fetchable by anyone who
 * guessed the filename without knowing the secret. Serving it from a validated
 * route keeps the slug in the env var where it belongs, and means a request with
 * the wrong slug 404s like everything else.
 *
 * (The site already has a static public/manifest.json. It is unrelated and is
 * left alone: its scope is "/" and nothing links to it.)
 *
 * ── The fields that actually matter for "opens full-screen like an app" ─────
 *
 * `display: standalone` is what removes the browser chrome, and it is the whole
 * point. `start_url` is the dashboard itself, so tapping the icon does not land
 * on the marketing site. `scope` is the slug directory, so navigation outside it
 * escapes the installed app rather than trapping the user in a chrome-less
 * window with no way back.
 *
 * iOS does not read most of this — it uses the `apple-mobile-web-app-*` meta
 * tags set in the page instead. Both are needed; neither substitutes.
 */

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  if (!isDashboardSlug(params.slug)) {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const base = `/dashboard/${params.slug}`;

  const manifest = {
    name: 'Upgrade Roofs — Leads',
    short_name: 'Leads',
    description: 'Leads, calls and enquiries for Upgrade Roofs.',
    // The slug path, so the installed icon opens the dashboard rather than the
    // website. This is the reason the manifest is dynamic.
    start_url: base,
    scope: `${base}/`,
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0A1F44',
    theme_color: '#0A1F44',
    lang: 'en-GB',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/dashboard/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/dashboard/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // Maskable is a separate entry on purpose: Android crops maskable icons
        // to its own shape, so a logo that fills the frame gets its edges cut
        // off. The generator pads these with a bleed margin.
        src: '/dashboard/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      // The slug is in the URL, so this is per-URL safe to cache privately; but
      // the manifest is one small object and re-reading it costs nothing.
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
