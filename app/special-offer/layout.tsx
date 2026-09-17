import type { Metadata } from 'next';

// Cheshire-wide by design. The town-specific offers live on the town pages —
// /roofers-sandbach owns "free roof inspection Sandbach" — so Sandbach is
// deliberately absent from this title, description and keyword list, leaving
// this page as the county-level catch-all. It is noindex (lib/routes.ts), so
// none of this competes with the indexable pages regardless.
//
// The root layout's title template appends "| Upgrade Roofs", so `title` does
// not carry the brand itself.
export const metadata: Metadata = {
  title: 'Free Roof Inspection Cheshire | 10-Minute Callback',
  description: 'Claim your FREE roof inspection anywhere in Cheshire. 25+ years experience, CORC certified, £10M insured. No obligation, 10-minute callback.',
  keywords: [
    'free roof inspection Cheshire',
    'free roof inspection near me',
    'roof repairs near me',
    'roofing contractors Cheshire',
    'roof inspection Crewe',
    'roof inspection Congleton',
    'roof inspection Middlewich',
    'roofing company near me'
  ],
  authors: [{ name: 'Upgrade Roofs' }],
  creator: 'Upgrade Roofs',
  publisher: 'Upgrade Roofs',
  metadataBase: new URL('https://www.upgraderoofs.co.uk'),
  alternates: {
    canonical: '/special-offer',
  },
  openGraph: {
    title: 'Free Roof Inspection | Limited Time Offer - Upgrade Roofs',
    description: 'Get a FREE professional roof inspection from experienced roofers. Serving homeowners across Cheshire. No obligation, no hidden fees.',
    url: 'https://www.upgraderoofs.co.uk/special-offer',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/6.jpeg',
        width: 1200,
        height: 630,
        alt: 'Free Roof Inspection Offer · Upgrade Roofs',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Roof Inspection | Limited Time Offer - Upgrade Roofs',
    description: 'Get a FREE professional roof inspection. No obligation, no hidden fees. Trusted roofers across Cheshire.',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  robots: {
    index: false,
    follow: true,
  },
  other: {},
};

import Script from 'next/script';

export default function SpecialOfferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Structured Data for Special Offer */}
      <Script
        id="special-offer-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Offer',
            name: 'Free Roof Inspection',
            description: 'Professional roof inspection with no obligation and no hidden fees',
            price: '0',
            priceCurrency: 'GBP',
            availability: 'https://schema.org/LimitedAvailability',
            validThrough: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            seller: {
              '@type': 'LocalBusiness',
              name: 'Upgrade Roofs',
              address: {
                '@type': 'PostalAddress',
                streetAddress: '20 Crewe Road',
                addressLocality: 'Sandbach',
                addressRegion: 'Cheshire',
                postalCode: 'CW11 4NE',
                addressCountry: 'GB'
              },
              telephone: '+441270897606',
              url: 'https://www.upgraderoofs.co.uk'
            },
            areaServed: [
              {
                '@type': 'City',
                name: 'Cheshire'
              },
              {
                '@type': 'City',
                name: 'Sandbach'
              },
              {
                '@type': 'City',
                name: 'Crewe'
              },
              {
                '@type': 'City',
                name: 'Congleton'
              },
              {
                '@type': 'City',
                name: 'Middlewich'
              }
            ]
          })
        }}
      />
      
      {/* LocalBusiness Schema */}
      <Script
        id="local-business-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': ['LocalBusiness', 'RoofingContractor'],
            name: 'Upgrade Roofs',
            image: 'https://www.upgraderoofs.co.uk/images/6.jpeg',
            '@id': 'https://www.upgraderoofs.co.uk/#organization',
            url: 'https://www.upgraderoofs.co.uk/special-offer',
            telephone: '+441270897606',
            address: {
              '@type': 'PostalAddress',
              streetAddress: '20 Crewe Road',
              addressLocality: 'Sandbach',
              addressRegion: 'Cheshire',
              postalCode: 'CW11 4NE',
              addressCountry: 'GB'
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: 53.1461,
              longitude: -2.3679
            },
            openingHoursSpecification: [
              {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                opens: '08:00',
                closes: '18:00'
              }
            ],
            priceRange: '££',
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              reviewCount: '127'
            }
          })
        }}
      />

      {/* Facebook Pixel Conversion Tracking */}
      <Script
        id="facebook-pixel-tracking"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof fbq !== 'undefined') {
              fbq('track', 'ViewContent', {
                content_type: 'product',
                content_ids: ['roof-inspection-offer'],
                content_name: 'Free Roof Inspection Offer',
                content_category: 'Roofing Services',
                value: 150,
                currency: 'GBP'
              });
            }
          `
        }}
      />
      {children}
    </>
  );
}
