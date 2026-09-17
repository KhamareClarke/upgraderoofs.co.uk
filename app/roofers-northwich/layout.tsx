import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Northwich | CW8 & CW9 Roofing',
  description: 'Roofers covering Northwich (CW8 & CW9) from our Sandbach base. Victorian terraces to modern estates. CORC certified, £10M insured, 10-year guarantee.',
  keywords: 'roofers northwich, roofer northwich, roofing northwich, roof repair northwich, flat roofing northwich, emergency roofer northwich',
  openGraph: {
    title: 'Roofers Northwich | CW8 & CW9 Roofing | Upgrade Roofs',
    description: 'Northwich roofers covering CW8 and CW9. Repairs, re-roofing and flat roofing. Free written quotes, no obligation.',
    url: 'https://www.upgraderoofs.co.uk/roofers-northwich',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-northwich' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema town="Northwich" postcode="CW8" slug="roofers-northwich" lat={53.2593} lng={-2.5123} />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Northwich', url: 'https://www.upgraderoofs.co.uk/roofers-northwich' },
      ]} />
      {children}
    </>
  );
}