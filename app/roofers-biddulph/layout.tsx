import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Biddulph | ST8 Roofing Company',
  description: 'Roofers in Biddulph (ST8), 12 miles from Sandbach. Specified for exposed moorland conditions. CORC certified, £10M insured, 10-year guarantee.',
  keywords: 'roofers biddulph, roofer biddulph, roofing biddulph, roof repair biddulph, flat roofing biddulph, emergency roofer staffordshire',
  openGraph: {
    title: 'Roofers Biddulph | ST8 Roofing | Upgrade Roofs',
    description: 'Biddulph roofers covering ST8, specified for exposed moorland conditions. Free written quotes, no obligation.',
    url: 'https://www.upgraderoofs.co.uk/roofers-biddulph',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-biddulph' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema town="Biddulph" postcode="ST8" slug="roofers-biddulph" lat={53.1148} lng={-2.1696} addressRegion="Staffordshire" />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Biddulph', url: 'https://www.upgraderoofs.co.uk/roofers-biddulph' },
      ]} />
      {children}
    </>
  );
}