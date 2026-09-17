import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Knutsford | WA16 Heritage Roofs',
  description: 'Heritage roofers in Knutsford (WA16). Experienced with listed buildings and conservation areas. CORC certified, £10M insured, 10-year guarantee.',
  keywords: 'roofers knutsford, roofer knutsford, roofing knutsford, roof repair knutsford, listed building roofing knutsford, heritage roofer cheshire',
  openGraph: {
    title: 'Roofers Knutsford | WA16 Heritage Roofing | Upgrade Roofs',
    description: 'Knutsford roofers experienced with listed buildings and conservation areas across WA16. Free written quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-knutsford',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-knutsford' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema town="Knutsford" postcode="WA16" slug="roofers-knutsford" lat={53.3017} lng={-2.377} />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Knutsford', url: 'https://www.upgraderoofs.co.uk/roofers-knutsford' },
      ]} />
      {children}
    </>
  );
}