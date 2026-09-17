import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Winsford | CW7 Roofing Experts',
  description: 'Local roofers in Winsford (CW7), 8 miles from our Sandbach base. 25+ years, CORC certified, £10M insured, 10-year guarantee. Free written quotes.',
  keywords: 'roofers winsford, roofer winsford, roofing winsford, roof repair winsford, flat roofing winsford, emergency roofer winsford',
  openGraph: {
    title: 'Roofers Winsford | CW7 Roofing | Upgrade Roofs',
    description: 'Winsford roofers covering CW7 from our Sandbach base. Flat roofing, tiles, chimney repairs and gutters. Free written quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-winsford',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
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