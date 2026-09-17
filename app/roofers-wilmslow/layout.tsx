import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Wilmslow | 5★ Rated | Free Quotes in 24hrs',
  description: 'Trusted roofers in Wilmslow (SK9) with 127 five-star reviews. Roof repairs, new roofs & flat roofing from a local CORC-certified team. 25+ yrs, £10M insured. Call 01270 897606 for a free no-obligation quote.',
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-wilmslow' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema town="Wilmslow" postcode="SK9" slug="roofers-wilmslow" lat={53.3259} lng={-2.2309} />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Wilmslow', url: 'https://www.upgraderoofs.co.uk/roofers-wilmslow' },
      ]} />
      {children}
    </>
  );
}