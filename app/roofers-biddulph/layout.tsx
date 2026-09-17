import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Biddulph | 01270 897606',
  description: 'Local roofers in Biddulph (ST8). CORC certified, £10M insured, 10-year guarantee. Flat roofing, tiles, chimney repairs, gutters, skylights & cladding. Free quotes.',
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