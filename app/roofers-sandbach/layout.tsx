import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { TownLocalBusinessSchema } from '@/components/TownLocalBusinessSchema';

// The root layout's title template appends "| Upgrade Roofs", so `title` must
// not carry the brand itself — the rest of the site currently does, and every
// one of those pages renders the brand twice.
export const metadata: Metadata = {
  title: 'Free Roof Inspection Sandbach | No Obligation',
  description: 'Free roof inspection in Sandbach (CW11) from a local team based on Crewe Road. 127 five-star reviews, 25+ years, £10M insured. No obligation.',
  keywords: 'free roof inspection sandbach, roof inspection sandbach, free roof check sandbach, roof survey sandbach, roofers sandbach, roofer sandbach, roofing sandbach, roofing company sandbach, roof repair sandbach',
  openGraph: {
    title: 'Free Roof Inspection Sandbach | Upgrade Roofs',
    description: 'Free, no-obligation roof inspection in Sandbach. 127 five-star reviews, 25+ years, CORC certified, £10M insured.',
    url: 'https://www.upgraderoofs.co.uk/roofers-sandbach',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/6.jpeg',
        width: 1200,
        height: 630,
        alt: 'Professional roofers in Sandbach, Cheshire - Upgrade Roofs',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Roof Inspection Sandbach | Upgrade Roofs',
    description: 'Free, no-obligation roof inspection in Sandbach. 127 five-star reviews, 25+ years · 01270 897606.',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/roofers-sandbach',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RoofersSandbachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TownLocalBusinessSchema
        town="Sandbach"
        postcode="CW11 4NE"
        slug="roofers-sandbach"
        lat={53.1461}
        lng={-2.3679}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Service Areas', url: 'https://www.upgraderoofs.co.uk/service-areas' },
        { name: 'Roofers Sandbach', url: 'https://www.upgraderoofs.co.uk/roofers-sandbach' },
      ]} />
      {children}
    </>
  );
}
