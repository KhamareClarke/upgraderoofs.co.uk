import type { Metadata } from 'next';
import { AreaPageTemplate } from '@/components/AreaPageTemplate';
import { townData } from '@/lib/town-data';

export const dynamic = 'force-static';
export const revalidate = false;

const data = townData.congleton;

export const metadata: Metadata = {
  title: 'Roofers Congleton | CW12 Roofing Company',
  description: 'Professional roofers serving Congleton and the CW12 postcode. 6 miles from Sandbach base, 30–45 min emergency response. Period property specialists. CORC certified. Free quotes. 01270 897606.',
  keywords: 'roofers congleton, roofing company congleton, roof repair congleton, new roof congleton, emergency roofer congleton CW12, period property roofer congleton',
  openGraph: {
    title: 'Roofers Congleton | CW12 Roofing Experts | Upgrade Roofs',
    description: 'Professional roofers in Congleton, CW12. Period property specialists, 30–45 min emergency response. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-congleton',
    siteName: 'Upgrade Roofs',
    images: [{ url: 'https://www.upgraderoofs.co.uk/images/6.jpeg', width: 1200, height: 630, alt: 'Professional roofers serving Congleton, Cheshire' }],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roofers Congleton | Upgrade Roofs | 01270 897606',
    description: 'Local roofers in Congleton, CW12. Period property specialists, free quotes.',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-congleton' },
  robots: { index: true, follow: true },
};

export default function RoofersCongleton() {
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
