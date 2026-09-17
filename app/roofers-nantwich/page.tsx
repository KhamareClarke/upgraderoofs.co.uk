import type { Metadata } from 'next';
import { AreaPageTemplate } from '@/components/AreaPageTemplate';
import { townData } from '@/lib/town-data';

export const dynamic = 'force-static';
export const revalidate = false;

const data = townData.nantwich;

export const metadata: Metadata = {
  title: 'Roofers Nantwich | Heritage & Listed Building Specialists CW5',
  description: 'Expert roofers in Nantwich, CW5. Specialists in heritage, listed, and period property roofing. 25+ years experience. Based 8 miles from Nantwich. CORC certified. Free quotes. 01270 897606.',
  keywords: 'roofers nantwich, roofing company nantwich, roof repair nantwich, listed building roofer nantwich, heritage roofing nantwich CW5',
  openGraph: {
    title: 'Roofers Nantwich | Heritage Roofing Specialists | Upgrade Roofs',
    description: 'Expert roofers in Nantwich, CW5. Period & listed building specialists. 25+ years experience. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-nantwich',
    siteName: 'Upgrade Roofs',
    images: [{ url: 'https://www.upgraderoofs.co.uk/images/6.jpeg', width: 1200, height: 630, alt: 'Professional roofers serving Nantwich, Cheshire' }],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roofers Nantwich | Upgrade Roofs | 01270 897606',
    description: 'Heritage roofing specialists in Nantwich, CW5. Free quotes.',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-nantwich' },
  robots: { index: true, follow: true },
};

export default function RoofersNantwichPage() {
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
