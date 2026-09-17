import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Crewe | 5★ Rated | Free Quotes in 24hrs',
  description: 'Trusted roofers serving Crewe (CW1 & CW2) with 127 five-star reviews. Roof repairs, new roofs & flat roofing. 25+ yrs, CORC certified, £10M insured, 24/7 emergency call-outs. Call 01270 897606 for a free no-obligation quote.',
  keywords: 'roofers crewe, roofer crewe, roofing crewe, roofing contractors crewe, roofing company crewe, roof repair crewe, new roofs crewe, emergency roofer crewe, flat roofing crewe',
  openGraph: {
    title: 'Roofers Crewe | 5★ Rated Local Roofers | Upgrade Roofs',
    description: 'Crewe\'s trusted local roofers. 127 five-star reviews, 25+ years, CORC certified. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-crewe',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-crewe' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema
        town="Crewe"
        postcode="CW1"
        slug="roofers-crewe"
        lat={53.0985}
        lng={-2.4396}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Crewe', url: 'https://www.upgraderoofs.co.uk/roofers-crewe' },
      ]} />
      {children}
    </>
  );
}
