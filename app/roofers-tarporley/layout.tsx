import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

export const metadata: Metadata = {
  title: 'Roofers Tarporley | CW6 Rural Roofing',
  description: 'Roofers across Tarporley (CW6), from the High Street to rural properties at Bunbury and Peckforton. CORC certified, £10M insured. Free quotes.',
  keywords: 'roofers tarporley, roofer tarporley, roofing tarporley, roof repair tarporley, rural roofing cheshire, listed building roofing tarporley',
  openGraph: {
    title: 'Roofers Tarporley | CW6 Rural Roofing | Upgrade Roofs',
    description: 'Tarporley roofers covering CW6, from the High Street to rural properties at Bunbury and Peckforton. Free written quotes.',
    url: 'https://www.upgraderoofs.co.uk/roofers-tarporley',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/roofers-tarporley' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TownLocalBusinessSchema town="Tarporley" postcode="CW6" slug="roofers-tarporley" lat={53.1663} lng={-2.6553} />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Tarporley', url: 'https://www.upgraderoofs.co.uk/roofers-tarporley' },
      ]} />
      {children}
    </>
  );
}