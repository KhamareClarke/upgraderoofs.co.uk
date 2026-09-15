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
            __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gadsConvId}');`,
          }}
        />
        <StructuredData />
      </head>
      <body className="font-sans antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5LMDG3F7"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <Analytics />
        <ConditionalLayout>{children}</ConditionalLayout>
        <ClientWidgets />
        <CookieBanner />
      </body>
    </html>
  );
}
