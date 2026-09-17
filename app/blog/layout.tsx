import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Deliberately no `title` here. A layout that declares a plain-string title
  // RESETS the root layout's title template for every segment beneath it — Next
  // stashes the template after each item it merges and takes it from
  // `resolvedMetadata.title.template`, which a string title leaves null. This
  // layout sits two levels above each post, so declaring a title here stripped
  // "| Upgrade Roofs" off all ten blog posts. The /blog index title lives in
  // page.tsx instead, where it is templated like every other page.
  description: 'Expert roofing tips, advice and guides from Upgrade Roofs. Learn about roof maintenance, repairs, materials and more. Serving Cheshire homeowners.',
  keywords: 'roofing blog, roofing tips, roof maintenance advice, roofing guides Cheshire, roof repair tips, roofing materials guide',
  openGraph: {
    title: 'Roofing Blog | Tips & Advice | Upgrade Roofs',
    description: 'Expert roofing tips and advice from Cheshire roofing specialists.',
    url: 'https://www.upgraderoofs.co.uk/blog',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/7.jpeg',
        width: 1200,
        height: 630,
        alt: 'Roofing Blog · Expert Tips and Advice from Upgrade Roofs',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roofing Blog | Upgrade Roofs',
    description: 'Expert roofing tips and advice.',
    images: ['https://www.upgraderoofs.co.uk/images/7.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const blogCollectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': 'https://www.upgraderoofs.co.uk/blog',
  url: 'https://www.upgraderoofs.co.uk/blog',
  name: 'Roofing Blog | Upgrade Roofs',
  description: 'Expert roofing tips, advice, and guides for Cheshire homeowners from Upgrade Roofs.',
  inLanguage: 'en-GB',
  isPartOf: { '@id': 'https://www.upgraderoofs.co.uk/#website' },
  publisher: { '@id': 'https://www.upgraderoofs.co.uk/#organization' },
  hasPart: [
    { '@type': 'BlogPosting', headline: 'Emergency Roof Repairs in Cheshire: What to Do When Disaster Strikes', url: 'https://www.upgraderoofs.co.uk/blog/emergency-roof-repairs', datePublished: '2026-03-15' },
    { '@type': 'BlogPosting', headline: 'Complete Roof Maintenance Checklist for Cheshire Homeowners', url: 'https://www.upgraderoofs.co.uk/blog/roof-maintenance-checklist', datePublished: '2026-03-10' },
    { '@type': 'BlogPosting', headline: 'How Long Does a Roof Last? Complete UK Guide', url: 'https://www.upgraderoofs.co.uk/blog/how-long-does-roof-last', datePublished: '2026-03-08' },
    { '@type': 'BlogPosting', headline: 'Complete Guide to Gutter Maintenance in Cheshire', url: 'https://www.upgraderoofs.co.uk/blog/gutter-maintenance-guide', datePublished: '2026-03-05' },
    { '@type': 'BlogPosting', headline: 'Chimney Repairs in Cheshire: Complete Homeowner\'s Guide', url: 'https://www.upgraderoofs.co.uk/blog/chimney-repair-guide', datePublished: '2026-03-01' },
    { '@type': 'BlogPosting', headline: 'How to Choose a Reliable Roofing Contractor in Cheshire', url: 'https://www.upgraderoofs.co.uk/blog/choosing-roofing-contractor', datePublished: '2026-02-25' },
    { '@type': 'BlogPosting', headline: 'Skylight Installation Guide: Transform Your Home with Natural Light', url: 'https://www.upgraderoofs.co.uk/blog/skylight-installation-guide', datePublished: '2026-02-20' },
    { '@type': 'BlogPosting', headline: 'Common Flat Roof Problems and How to Fix Them', url: 'https://www.upgraderoofs.co.uk/blog/flat-roof-problems', datePublished: '2026-02-15' },
    { '@type': 'BlogPosting', headline: 'How to Spot Roof Damage Before It Gets Expensive', url: 'https://www.upgraderoofs.co.uk/blog/roof-damage-signs', datePublished: '2024-11-04' },
    { '@type': 'BlogPosting', headline: 'Flat vs. Tile Roofs – Which Lasts Longer in the UK?', url: 'https://www.upgraderoofs.co.uk/blog/flat-vs-tile-roofs', datePublished: '2024-10-28' },
  ],
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogCollectionSchema) }}
      />
      {children}
    </>
  );
}
