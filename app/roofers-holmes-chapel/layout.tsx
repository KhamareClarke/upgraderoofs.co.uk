import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Holmes Chapel | Village Roofing Experts | 01270 897606',
  description: 'Quality roofers serving Holmes Chapel CW4, just 4 miles from our Sandbach base. Cottage and period property specialists. Roof repairs, new roofs, flat roofing, 24/7 emergency. CORC certified, £10M insured.',
  openGraph: {
    title: 'Roofers Holmes Chapel | Upgrade Roofs | 01270 897606',
    description: 'Holmes Chapel\'s trusted local roofers. 25+ years experience, CORC certified. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-holmes-chapel',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-holmes-chapel' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema
        town="Holmes Chapel"
        postcode="CW4"
        slug="roofers-holmes-chapel"
        lat={53.1964}
        lng={-2.3574}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Holmes Chapel', url: 'https://www.upgraderoofs.co.uk/roofers-holmes-chapel' },
      ]} />
      {children}
    </>
  );
}
