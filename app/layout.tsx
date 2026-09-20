import './globals.css';
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { StructuredData } from './structured-data';
import { ConditionalLayout } from '@/components/ConditionalLayout';
import { Analytics } from '@/components/Analytics';
import { ClientWidgets } from '@/components/ClientWidgets';
import { CookieBanner } from '@/components/CookieBanner';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'Trusted Roofers in Sandbach & Cheshire | Upgrade Roofs',
    template: '%s | Upgrade Roofs',
  },
  description: 'Upgrade Roofs · trusted roofers based in Sandbach, serving all of Cheshire. 25+ years experience, CORC certified, £10M insured. Call for a free quote!',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  icons: {
    // app/icon.png + app/apple-icon.png are auto-served by Next's file
    // convention; /favicon.ico covers legacy browsers. All built from
    // public/images/upgrade_logo.png.
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  authors: [{ name: 'Upgrade Roofs' }],
  creator: 'Upgrade Roofs',
  publisher: 'Upgrade Roofs',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://www.upgraderoofs.co.uk'),
  openGraph: {
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@upgraderoofing',
    creator: '@upgraderoofing',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'l8ZfvIY9wUeZiyzCRFhthl1KvzjwVCwP-tLXa4uQtZA',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `gtag('config', X)` takes an ACCOUNT/conversion id (`AW-17763560213`), never a
  // labelled conversion target. NEXT_PUBLIC_GADS_CONV_ID holds the labelled form
  // (`AW-17763560213/eU-fCJyQkPkcEJXWqZZC`) because that is what a conversion
  // `send_to` needs — so pass only the half before the slash. Splitting on "/" is
  // a no-op for a bare id, and prevents feeding gtag a malformed id.
  // components/Analytics.tsx already does this for its own `gtag('config')` call.
  //
  // The fallback is a bare ACCOUNT id, deliberately not a labelled target: see
  // the no-fallback policy in lib/tracking.ts. If the env var goes missing we want
  // the right account configured but NO conversion sent, rather than a hardcoded
  // label silently firing at whatever action it happened to name at the time.
  const gadsConvId = (process.env.NEXT_PUBLIC_GADS_CONV_ID || 'AW-17763560213').split('/')[0].trim();
  return (
    <html lang="en-GB" className={poppins.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        {/* Google Ads global site tag · rendered inline in <head> so the AW
            conversion id is present in the initial HTML for attribution. */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${gadsConvId}`}
        />
        <script
          dangerouslySetInnerHTML={{
            // The `config` call is skipped on the private dashboard. It is the
            // only measurement call left in this file, and firing it would send
            // a beacon to the Ads account from the one browser guaranteed to
            // open the dashboard every day — Marcus's own phone. A dashboard
            // that reports itself as site traffic is measuring the observer.
            //
            // `gtag` is still defined and the `js` call still made, so every
            // other page on the site behaves byte-for-byte as before; this guard
            // changes nothing except the dashboard. It is a client-side check
            // specifically so it cannot make this layout dynamic — a server-side
            // pathname read here would pull all ~106 pages out of static
            // generation.
            //
            // The loader <script> above is deliberately still emitted: it is
            // shared markup, and gtag.js sends nothing without a config or event
            // call. The remaining cost on the dashboard is one cached script
            // fetch, and the benefit is not perturbing the loading order that
            // attribution depends on. components/Analytics.tsx and
            // components/ClientWidgets.tsx opt out of the dashboard entirely, so
            // GTM, GA4 and the cookie banner never load there.
            __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); if (!location.pathname.startsWith('/dashboard')) { gtag('config', '${gadsConvId}'); }`,
          }}
        />
        <StructuredData />
      </head>
      <body className="font-sans antialiased">
        {/* The GTM <noscript> iframe is rendered by <Analytics /> rather than
            here, so that it opts out of the dashboard along with every other
            tag. See the note there. */}
        <Analytics />
        <ConditionalLayout>{children}</ConditionalLayout>
        <ClientWidgets />
        <CookieBanner />
      </body>
    </html>
  );
}
