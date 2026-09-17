import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Newcastle-under-Lyme | 01270 897606',
  description: 'Local roofers in Newcastle-under-Lyme (ST5). CORC certified, £10M insured, 10-year guarantee. Flat roofing, tiles, chimney repairs, gutters, skylights & cladding. Free quotes.',
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-newcastle-under-lyme' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema town="Newcastle-under-Lyme" postcode="ST5" slug="roofers-newcastle-under-lyme" lat={53.0105} lng={-2.2276} addressRegion="Staffordshire" />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Newcastle-under-Lyme', url: 'https://www.upgraderoofs.co.uk/roofers-newcastle-under-lyme' },
      ]} />
      {children}
    </>
  );
}