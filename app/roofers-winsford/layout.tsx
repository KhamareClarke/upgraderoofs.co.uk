import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Winsford | 01270 897606',
  description: 'Local roofers in Winsford (CW7). CORC certified, £10M insured, 10-year guarantee. Flat roofing, tiles, chimney repairs, gutters, skylights & cladding. Free quotes.',
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-winsford' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema town="Winsford" postcode="CW7" slug="roofers-winsford" lat={53.184} lng={-2.5222} />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Winsford', url: 'https://www.upgraderoofs.co.uk/roofers-winsford' },
      ]} />
      {children}
    </>
  );
}