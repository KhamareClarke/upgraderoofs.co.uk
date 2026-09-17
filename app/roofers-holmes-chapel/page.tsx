import type { Metadata } from 'next';
import { AreaPageTemplate } from '@/components/AreaPageTemplate';
import { townData } from '@/lib/town-data';

export const dynamic = 'force-static';
export const revalidate = false;

const data = townData['holmes-chapel'];

export const metadata: Metadata = {
  title: 'Roofers Holmes Chapel | CW4 Local Roofing',
  description: 'Trusted roofers in Holmes Chapel, CW4. Just 4 miles from our Sandbach base · emergency response within 20–30 minutes. Roof repairs, period property specialists, free quotes. 01270 897606.',
  keywords: 'roofers holmes chapel, roofing company holmes chapel, roof repair holmes chapel, new roof holmes chapel CW4, emergency roofer holmes chapel',
  openGraph: {
    title: 'Roofers Holmes Chapel | CW4 Roofing Experts | Upgrade Roofs',
    description: 'Trusted roofers in Holmes Chapel, CW4. 4 miles from Sandbach, 20–30 min emergency response. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-holmes-chapel',
    siteName: 'Upgrade Roofs',
    images: [{ url: 'https://www.upgraderoofs.co.uk/images/6.jpeg', width: 1200, height: 630, alt: 'Professional roofers serving Holmes Chapel, Cheshire' }],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roofers Holmes Chapel | Upgrade Roofs | 01270 897606',
    description: 'Local roofers in Holmes Chapel, CW4. Fast response, free quotes.',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-holmes-chapel' },
  robots: { index: true, follow: true },
};

export default function RoofersHolmesChapelPage() {
  return (
    <AreaPageTemplate
      town={data.town}
      postcode={data.postcode}
      distanceFromBase={data.distanceFromBase}
      emergencyResponseTime={data.emergencyResponseTime}
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
