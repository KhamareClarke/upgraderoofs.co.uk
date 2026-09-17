import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { ServiceSchema } from '@/components/ServiceSchema';
import { getService } from '@/lib/service-data';

const service = getService('tile-slate-roofing')!;

export const metadata: Metadata = {
  title: 'Tile & Slate Roofing Cheshire',
  description: 'Professional tile and slate roofing in Cheshire. Expert installation, repairs and restoration. Traditional craftsmanship, 50+ year lifespan. CORC certified, £10M insured. Free quotes. Call 01270 897606.',
  keywords: 'tile roofing Cheshire, slate roofing Cheshire, tile roof repair, slate roof installation, clay tiles Cheshire, concrete tiles, heritage roofing, listed building roofers',
  openGraph: {
    title: 'Tile & Slate Roofing Cheshire | Expert Installation & Repairs',
    description: 'Professional tile and slate roofing services. Traditional craftsmanship, premium materials, 10-year guarantee. Call 01270 897606.',
    url: 'https://www.upgraderoofs.co.uk/services/tile-slate-roofing',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tile & Slate Roofing Cheshire | 01270 897606',
    description: 'Expert tile and slate roofing in Cheshire. Free quotes, 10-year guarantee.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/services/tile-slate-roofing',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TileSlateRoofingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Services', url: 'https://www.upgraderoofs.co.uk/services' },
        { name: 'Tile & Slate Roofing', url: 'https://www.upgraderoofs.co.uk/services/tile-slate-roofing' },
      ]} />
      <ServiceSchema service={service} />
      {children}
    </>
  );
}
