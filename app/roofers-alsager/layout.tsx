import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Alsager | Re-Roofing Specialists | 01270 897606',
  description: 'Trusted roofers serving Alsager ST7, just 5 miles from our Sandbach base. Concrete tile replacement experts. Roof repairs, new roofs, flat roofing, 24/7 emergency call-outs. CORC certified, £10M insured. Free quotes.',
  openGraph: {
    title: 'Roofers Alsager | Upgrade Roofs | 01270 897606',
    description: 'Alsager\'s trusted local roofers. 25+ years experience, CORC certified. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-alsager',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-alsager' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema
        town="Alsager"
        postcode="ST7"
        slug="roofers-alsager"
        lat={53.0951}
        lng={-2.3091}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Alsager', url: 'https://www.upgraderoofs.co.uk/roofers-alsager' },
      ]} />
      {children}
    </>
  );
}
