import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Macclesfield | 5★ Rated',
  description: 'Trusted roofers in Macclesfield (SK10) with 127 five-star reviews. Roof repairs, new roofs & flat roofing from a local CORC-certified team. 25+ yrs, £10M insured. Call 01270 897606 for a free no-obligation quote.',
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-macclesfield' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema town="Macclesfield" postcode="SK10" slug="roofers-macclesfield" lat={53.2588} lng={-2.1282} />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Macclesfield', url: 'https://www.upgraderoofs.co.uk/roofers-macclesfield' },
      ]} />
      {children}
    </>
  );
}