import type { Metadata } from 'next';
import { AreaPageTemplate } from '@/components/AreaPageTemplate';
import { townData } from '@/lib/town-data';

export const dynamic = 'force-static';
export const revalidate = false;

const data = townData.middlewich;

export const metadata: Metadata = {
  title: 'Roofers Middlewich | CW10 Roofing Experts',
  description: 'Trusted roofers in Middlewich, CW10. Based just 3 miles away in Sandbach · emergency response within 20–30 minutes. Roof repairs, new roofs, flat roofing. Free quotes. 01270 897606.',
  keywords: 'roofers middlewich, roofing company middlewich, roof repair middlewich, new roof middlewich, flat roofing middlewich, emergency roofer middlewich CW10',
  openGraph: {
    title: 'Roofers Middlewich | CW10 Roofing Experts | Upgrade Roofs',
    description: 'Trusted roofers in Middlewich, CW10. 3 miles from Sandbach base, 20–30 min emergency response. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-middlewich',
    siteName: 'Upgrade Roofs',
    images: [{ url: 'https://www.upgraderoofs.co.uk/images/6.jpeg', width: 1200, height: 630, alt: 'Professional roofers serving Middlewich, CW10' }],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roofers Middlewich | Upgrade Roofs | 01270 897606',
    description: 'Local roofers in Middlewich, CW10. 3 miles from base, fast response. Free quotes.',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-middlewich' },
  robots: { index: true, follow: true },
};

export default function RoofersMiddlewichPage() {
  return (
    <AreaPageTemplate
      town={data.town}
      postcode={data.postcode}
      postcodeAreas={data.postcodeAreas}
      localContext={data.localContext}
      roofingChallenges={data.roofingChallenges}
      landmarks={data.landmarks}
      propertyTypes={data.propertyTypes}
      commonProblems={data.commonProblems}
      proofPoint={data.proofPoint}
      ctaLine={data.ctaLine}
      faqs={data.faqs}
      nearbyAreas={data.nearbyAreas}
    />
  );
}
