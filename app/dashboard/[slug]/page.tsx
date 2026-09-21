import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DashboardClient } from './DashboardClient';
import { isDashboardSlug } from '@/lib/dashboard-slug';

/**
 * /dashboard/[slug] — the private, no-login lead dashboard.
 *
 * ── The guard ────────────────────────────────────────────────────────────────
 *
 * `notFound()` unless the path segment matches DASHBOARD_MARCUS_SLUG. Unset var
 * means every path 404s (see lib/dashboard-slug.ts). The API route behind this
 * page enforces the same rule independently — this check is what stops the shell
 * rendering, that one is what stops the data leaving.
 *
 * ── Why force-dynamic ───────────────────────────────────────────────────────
 *
 * So the env var is read per request rather than baked at build time. Without it
 * a deployment could serve a page built when the slug was unset, or keep serving
 * a rotated slug until the next rebuild — and "the old URL still works" is
 * precisely the failure a slug rotation is meant to fix.
 *
 * ── Keeping it out of the index ─────────────────────────────────────────────
 *
 * Three independent signals, because any one of them can be missed: the `robots`
 * meta below, an `X-Robots-Tag` header set here, and a Disallow in robots.txt.
 * The slug reaching a search index would be the end of the access control.
 */

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const href = `/dashboard/${params.slug}`;
  return {
    title: 'Leads',
    description: 'Private lead dashboard.',
    robots: { index: false, follow: false, nocache: true },
    // `themeColor` lives on Metadata in Next 13.5 — the separate `viewport`
    // export that owns it (along with the Viewport type) only arrived in 14, so
    // declaring it there is a type error on this version. It colours the browser
    // and Android status bar to match the app, which is now the site's own light
    // grey-white. It was navy while the dashboard was a dark app; leaving it navy
    // would put a dark strip above a white screen.
    themeColor: '#FAFBFC',
    // No maximumScale cap: the site sets one, but pinching to read a figure is a
    // legitimate thing to want on a dashboard.
    viewport: { width: 'device-width', initialScale: 1 },
    // The manifest is slug-scoped so its start_url opens this page, not the site.
    manifest: `${href}/manifest.webmanifest`,
    // iOS reads none of the manifest's display fields; these are what make it
    // open full-screen from a home-screen icon on an iPhone.
    appleWebApp: {
      capable: true,
      title: 'Leads',
      // NOT 'black-translucent', which is what a dark app wants: it draws the
      // clock and battery in WHITE over whatever is behind them. On the light
      // background this app now has, that is white on white — invisible. The
      // default gives a standard bar with dark glyphs.
      statusBarStyle: 'default',
    },
    other: {
      // Belt and braces for older iOS, which predates the appleWebApp API.
      'mobile-web-app-capable': 'yes',
    },
  };
}

export default function DashboardPage({ params }: { params: { slug: string } }) {
  if (!isDashboardSlug(params.slug)) notFound();

  return <DashboardClient slug={params.slug} />;
}
