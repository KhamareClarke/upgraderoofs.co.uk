import type { Metadata } from 'next';
import { BlogArticleSchema } from '@/components/BlogArticleSchema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Spot Roof Damage Before It Gets Expensive',
  description: 'A homeowner\'s checklist for identifying early signs of roof damage from the ground and inside the property.',
  totalTime: 'PT30M',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Inspect from ground level', text: 'Stand back and look at the roof from each side of the property. Look for missing tiles, sagging sections, displaced ridge tiles, and debris in gutters or on the roof surface. Use binoculars for a closer view without climbing.' },
    { '@type': 'HowToStep', position: 2, name: 'Check gutters and downspouts', text: 'Blocked gutters are the most visible sign of roof maintenance being overdue. Also look for granule deposits from deteriorating roof tiles collecting in gutters · a sign tiles are nearing end of life.' },
    { '@type': 'HowToStep', position: 3, name: 'Inspect the loft after heavy rain', text: 'After a rain event, access your loft with a torch. Look for daylight entering through the roof, water staining on rafters, wet insulation, or active drips. These confirm active water ingress.' },
    { '@type': 'HowToStep', position: 4, name: 'Look for water stains on ceilings', text: 'Brown rings or damp patches on upstairs ceilings are often the first sign homeowners notice. These indicate water has been entering the roof structure and needs prompt investigation.' },
    { '@type': 'HowToStep', position: 5, name: 'Check chimney and flashing areas', text: 'If you have a chimney, inspect the lead flashing where the chimney meets the roof. Lifted, cracked, or missing flashing is among the most common causes of roof leaks.' },
    { '@type': 'HowToStep', position: 6, name: 'Note the age of the roof', text: 'Most tile roofs last 50–80 years; felt flat roofs 10–20 years; EPDM and GRP flat roofs 20–50 years. If your roof is approaching the end of its expected lifespan, arrange a professional inspection even with no visible signs of damage.' },
  ],
};

export const metadata: Metadata = {
  title: 'Signs of Roof Damage | When to Call a Roofer',
  description: 'Learn the warning signs of roof damage. Missing tiles, leaks, sagging, moss growth. Know when to call a professional roofer. Expert advice from Upgrade Roofs.',
  keywords: 'roof damage signs, when to repair roof, roof leak signs, missing roof tiles, roof inspection needed, roof damage Cheshire',
  openGraph: {
    title: 'Signs of Roof Damage | When to Call a Roofer',
    description: 'Learn the warning signs of roof damage and when to call a professional.',
    url: 'https://www.upgraderoofs.co.uk/blog/roof-damage-signs',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Signs of Roof Damage | Upgrade Roofs',
    description: 'Learn the warning signs of roof damage.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog/roof-damage-signs',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RoofDamageSignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <BlogArticleSchema
        title="Signs of Roof Damage: When to Call a Roofer"
        description="Learn the warning signs of roof damage. Missing tiles, leaks, sagging, moss growth."
        url="https://www.upgraderoofs.co.uk/blog/roof-damage-signs"
        datePublished="2024-11-04"
        dateModified="2026-06-11"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Blog', url: 'https://www.upgraderoofs.co.uk/blog' },
        { name: 'Signs of Roof Damage', url: 'https://www.upgraderoofs.co.uk/blog/roof-damage-signs' },
      ]} />
      {children}
    </>
  );
}
