import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Customer Reviews | 5 Star Rated',
  description: 'Read genuine customer reviews for Upgrade Roofs. 5 star rated on Google with 50+ reviews. See what Cheshire homeowners say about our roofing services.',
  keywords: 'roofing reviews Cheshire, roofer testimonials, Upgrade Roofs reviews, customer feedback, 5 star roofer Cheshire',
  openGraph: {
    title: 'Customer Reviews | Upgrade Roofs',
    description: '5 star rated roofing company. Read genuine customer reviews from Cheshire homeowners.',
    url: 'https://www.upgraderoofs.co.uk/reviews',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Customer Reviews | Upgrade Roofs',
    description: '5 star rated. Read genuine customer reviews.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/reviews',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const reviewPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://www.upgraderoofs.co.uk/reviews#webpage',
  url: 'https://www.upgraderoofs.co.uk/reviews',
  name: 'Customer Reviews | Upgrade Roofs',
  description: '5-star rated roofing contractor in Cheshire. Read genuine customer reviews from Sandbach, Crewe, Middlewich and across Cheshire.',
  about: {
    '@id': 'https://www.upgraderoofs.co.uk/#organization',
  },
  mainEntity: {
    '@type': 'LocalBusiness',
    '@id': 'https://www.upgraderoofs.co.uk/#organization',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: 4.9,
      bestRating: 5,
      worstRating: 1,
      reviewCount: 127,
      itemReviewed: {
        '@id': 'https://www.upgraderoofs.co.uk/#organization',
      },
    },
    review: [
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
        author: { '@type': 'Person', name: 'Sarah P.' },
        datePublished: '2025-03-12',
        reviewBody: 'Upgrade Roofs did an absolutely fantastic job on our new slate roof in Sandbach. Professional, tidy, and finished on time. Highly recommended.',
      },
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
        author: { '@type': 'Person', name: 'David W.' },
        datePublished: '2025-05-04',
        reviewBody: 'Called Upgrade Roofs after storm damage to our chimney in Crewe. They arrived the same day, made it safe, and completed the full repair within the week. Excellent service and very fair price.',
      },
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
        author: { '@type': 'Person', name: 'Karen M.' },
        datePublished: '2025-07-18',
        reviewBody: 'Had a new EPDM flat roof fitted to our garage extension in Nantwich. The team were efficient, left the site spotless, and the finish is superb. 20-year guarantee gives real peace of mind.',
      },
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
        author: { '@type': 'Person', name: 'James H.' },
        datePublished: '2025-09-22',
        reviewBody: 'Used Upgrade Roofs for a full re-roof on our Victorian terrace in Middlewich. They matched the original Welsh slate perfectly and the workmanship is outstanding. Would not hesitate to recommend.',
      },
      {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
        author: { '@type': 'Person', name: 'Linda T.' },
        datePublished: '2026-01-08',
        reviewBody: 'The team replaced our gutters and fascias across the whole house in Congleton in a single day. Very professional, great communication throughout, and the price was exactly as quoted. Brilliant.',
      },
    ],
  },
};

export default function ReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewPageSchema) }}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Reviews', url: 'https://www.upgraderoofs.co.uk/reviews' },
      ]} />
      {children}
    </>
  );
}
