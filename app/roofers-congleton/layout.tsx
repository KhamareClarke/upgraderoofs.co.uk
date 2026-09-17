import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Congleton | Period & Modern Roofing | 01270 897606',
  description: 'Expert roofers serving Congleton CW12 from nearby Sandbach. Period property specialists. Roof repairs, new roofs, flat roofing, 24/7 emergency call-outs. CORC certified, £10M insured. Free quotes.',
  openGraph: {
    title: 'Roofers Congleton | Upgrade Roofs | 01270 897606',
    description: 'Congleton\'s trusted local roofers. 25+ years experience, CORC certified. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-congleton',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-congleton' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema
        town="Congleton"
        postcode="CW12"
        slug="roofers-congleton"
        lat={53.1628}
        lng={-2.2168}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Congleton', url: 'https://www.upgraderoofs.co.uk/roofers-congleton' },
      ]} />
      {children}
    </>
  );
}
