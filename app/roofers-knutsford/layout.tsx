import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Knutsford | 01270 897606',
  description: 'Local roofers in Knutsford (WA16). CORC certified, £10M insured, 10-year guarantee. Flat roofing, tiles, chimney repairs, gutters, skylights & cladding. Free quotes.',
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-knutsford' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema town="Knutsford" postcode="WA16" slug="roofers-knutsford" lat={53.3017} lng={-2.377} />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Knutsford', url: 'https://www.upgraderoofs.co.uk/roofers-knutsford' },
      ]} />
      {children}
    </>
  );
}