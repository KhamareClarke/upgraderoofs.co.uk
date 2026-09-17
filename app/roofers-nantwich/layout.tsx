import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Nantwich | Heritage & Listed Buildings | 01270 897606',
  description: 'Heritage roofing specialists serving Nantwich CW5. Listed building experience, natural slate and clay tile experts. Roof repairs, new roofs, 24/7 emergency call-outs. CORC certified, £10M insured. Free quotes.',
  openGraph: {
    title: 'Roofers Nantwich | Upgrade Roofs | 01270 897606',
    description: 'Nantwich\'s trusted local roofers. 25+ years experience, CORC certified. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-nantwich',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-nantwich' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema
        town="Nantwich"
        postcode="CW5"
        slug="roofers-nantwich"
        lat={53.0674}
        lng={-2.5240}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Nantwich', url: 'https://www.upgraderoofs.co.uk/roofers-nantwich' },
      ]} />
      {children}
    </>
  );
}
