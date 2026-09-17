import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Middlewich | 3 Miles Away | 01270 897606',
  description: 'Your closest qualified roofers to Middlewich CW10 · based just 3 miles away in Sandbach. Roof repairs, new roofs, flat roofing, 24/7 emergency call-outs. CORC certified, £10M insured. Free quotes.',
  openGraph: {
    title: 'Roofers Middlewich | Upgrade Roofs | 01270 897606',
    description: 'Middlewich\'s trusted local roofers. 25+ years experience, CORC certified. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-middlewich',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-middlewich' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema
        town="Middlewich"
        postcode="CW10"
        slug="roofers-middlewich"
        lat={53.1860}
        lng={-2.4447}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Middlewich', url: 'https://www.upgraderoofs.co.uk/roofers-middlewich' },
      ]} />
      {children}
    </>
  );
}
