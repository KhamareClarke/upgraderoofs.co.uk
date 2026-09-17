import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { ServiceSchema } from '@/components/ServiceSchema';
import { getService } from '@/lib/service-data';

const service = getService('gutters-fascias')!;

export const metadata: Metadata = {
  title: 'Gutters & Fascias Cheshire',
  description: 'Professional gutter and fascia installation in Cheshire. uPVC, cast iron, aluminium systems. Soffits, bargeboards, leaf guards. CORC certified, £10M insured. Call 01270 897606.',
  keywords: 'gutters Cheshire, fascias Cheshire, gutter installation, fascia boards, soffits, uPVC guttering, cast iron gutters, gutter repair Cheshire',
  openGraph: {
    title: 'Gutters & Fascias Cheshire | Installation & Repairs',
    description: 'Professional gutter and fascia services. uPVC, cast iron, aluminium. Free quotes. Call 01270 897606.',
    url: 'https://www.upgraderoofs.co.uk/services/gutters-fascias',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gutters & Fascias Cheshire | 01270 897606',
    description: 'Expert gutter and fascia installation in Cheshire. Free quotes.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/services/gutters-fascias',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function GuttersFasciasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Services', url: 'https://www.upgraderoofs.co.uk/services' },
        { name: 'Gutters & Fascias', url: 'https://www.upgraderoofs.co.uk/services/gutters-fascias' },
      ]} />
      <ServiceSchema service={service} />
      {children}
    </>
  );
}
