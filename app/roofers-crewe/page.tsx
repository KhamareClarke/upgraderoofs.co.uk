import type { Metadata } from 'next';
import { AreaPageTemplate } from '@/components/AreaPageTemplate';
import { townData } from '@/lib/town-data';

export const dynamic = 'force-static';
export const revalidate = false;

const data = townData.crewe;

export const metadata: Metadata = {
  title: 'Roofers Crewe | CW1 & CW2 Roofing',
  description: 'Expert roofers in Crewe serving CW1 & CW2. Based just 4 miles away in Sandbach · same-day inspections available. Roof repairs, new roofs, flat roofing. CORC certified, £10M insured. Free quotes.',
  keywords: 'roofers crewe, roofing company crewe, roof repair crewe, new roof crewe, flat roofing crewe, emergency roofer crewe, CW1 CW2 roofer',
  openGraph: {
    title: 'Roofers Crewe | Local Roofing Experts | Upgrade Roofs',
    description: 'Expert roofers in Crewe, CW1 & CW2. 25+ years experience, CORC certified, same-day inspections. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-crewe',
    siteName: 'Upgrade Roofs',
    images: [{ url: 'https://www.upgraderoofs.co.uk/images/6.jpeg', width: 1200, height: 630, alt: 'Professional roofers serving Crewe, Cheshire' }],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roofers Crewe | Upgrade Roofs | 01270 897606',
    description: 'Local roofers in Crewe, CW1 & CW2. Same-day inspections, 25+ years experience. Free quotes.',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-crewe' },
  robots: { index: true, follow: true },
};

export default function RoofersCrewePage() {
  return (
    <AreaPageTemplate
      town={data.town}
      postcode={data.postcode}
      intro={data.intro}
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
