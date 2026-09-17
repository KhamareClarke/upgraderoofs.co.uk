import type { Metadata } from 'next';
import { AreaPageTemplate } from '@/components/AreaPageTemplate';
import { townData } from '@/lib/town-data';

export const dynamic = 'force-static';
export const revalidate = false;

const data = townData.alsager;

export const metadata: Metadata = {
  title: 'Roofers Alsager | ST7 Roofing Company',
  description: 'Professional roofers in Alsager, ST7. Based 5 miles away in Sandbach · emergency response within 25–35 minutes. Roof repairs, re-roofing, chimney repairs, flat roofing. Free quotes. 01270 897606.',
  keywords: 'roofers alsager, roofing company alsager, roof repair alsager, new roof alsager, flat roofing alsager, emergency roofer alsager ST7',
  openGraph: {
    title: 'Roofers Alsager | ST7 Roofing Experts | Upgrade Roofs',
    description: 'Professional roofers in Alsager, ST7. 5 miles from Sandbach, fast response, CORC certified. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-alsager',
    siteName: 'Upgrade Roofs',
    images: [{ url: 'https://www.upgraderoofs.co.uk/images/6.jpeg', width: 1200, height: 630, alt: 'Professional roofers serving Alsager, Cheshire' }],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roofers Alsager | Upgrade Roofs | 01270 897606',
    description: 'Local roofers in Alsager, ST7. Fast response, 10-year guarantee. Free quotes.',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-alsager' },
  robots: { index: true, follow: true },
};

export default function RoofersAlsagerPage() {
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
