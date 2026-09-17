import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Roof Inspection Crewe',
  description: 'FREE roof inspection in Crewe, Cheshire. Local roofers with 25+ years experience. Emergency roof repairs, leak fixes, new roofs. Same day quotes. CORC certified, £10M insured. Call 01270 897606.',
  keywords: 'roof inspection Crewe, roofers Crewe, roof repair Crewe, roofing company Crewe, emergency roofer Crewe, flat roof Crewe, tile roof repair Crewe, Cheshire roofers',
  openGraph: {
    title: 'Free Roof Inspection Crewe | Local Expert Roofers',
    description: 'Claim your FREE roof inspection in Crewe. 25+ years experience, same day quotes, £10M insured. Call 01270 897606.',
    url: 'https://www.upgraderoofs.co.uk/offer-crewe',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/2.jpeg',
        width: 1200,
        height: 630,
        alt: 'Professional Roofing Services Crewe Cheshire - Free Inspection',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Roof Inspection Crewe | 01270 897606',
    description: 'FREE roof inspection in Crewe. Expert local roofers, 25+ years experience. Call now!',
    images: ['https://www.upgraderoofs.co.uk/images/2.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/offer-crewe',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function OfferCreweLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
