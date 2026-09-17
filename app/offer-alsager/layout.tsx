import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Roof Inspection Alsager',
  description: 'FREE roof inspection in Alsager, Cheshire. Local roofers with 25+ years experience. Emergency roof repairs, leak fixes, new roofs. Same day quotes. CORC certified, £10M insured. Call 01270 897606.',
  keywords: 'roof inspection Alsager, roofers Alsager, roof repair Alsager, roofing company Alsager, emergency roofer Alsager, flat roof Alsager, tile roof repair Alsager, Cheshire roofers',
  openGraph: {
    title: 'Free Roof Inspection Alsager | Local Expert Roofers',
    description: 'Claim your FREE roof inspection in Alsager. 25+ years experience, same day quotes, £10M insured. Call 01270 897606.',
    url: 'https://www.upgraderoofs.co.uk/offer-alsager',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/7.jpeg',
        width: 1200,
        height: 630,
        alt: 'Professional Roofing Services Alsager Cheshire - Free Inspection',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Roof Inspection Alsager | 01270 897606',
    description: 'FREE roof inspection in Alsager. Expert local roofers, 25+ years experience. Call now!',
    images: ['https://www.upgraderoofs.co.uk/images/7.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/offer-alsager',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function OfferAlsagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
