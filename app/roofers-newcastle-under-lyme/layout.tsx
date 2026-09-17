import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Newcastle-under-Lyme | ST5 Roofing',
  description: 'Roofers covering Newcastle-under-Lyme (ST5). Victorian terraces, post-war estates and flat roofs. CORC certified, £10M insured, 10-year guarantee.',
  keywords: 'roofers newcastle-under-lyme, roofer newcastle under lyme, roofing st5, roof repair newcastle-under-lyme, flat roofing staffordshire',
  openGraph: {
    title: 'Roofers Newcastle-under-Lyme | ST5 Roofing | Upgrade Roofs',
    description: 'Newcastle-under-Lyme roofers covering ST5. Victorian terraces, post-war estates and flat roofing. Free written quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-newcastle-under-lyme',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-newcastle-under-lyme' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema town="Newcastle-under-Lyme" postcode="ST5" slug="roofers-newcastle-under-lyme" lat={53.0105} lng={-2.2276} addressRegion="Staffordshire" />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Newcastle-under-Lyme', url: 'https://www.upgraderoofs.co.uk/roofers-newcastle-under-lyme' },
      ]} />
      {children}
    </>
  );
}