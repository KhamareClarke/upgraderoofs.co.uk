import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Roof Inspection Nantwich',
  description: 'FREE roof inspection in Nantwich, Cheshire. Local roofers with 25+ years experience. Emergency roof repairs, leak fixes, new roofs. Same day quotes. CORC certified, £10M insured. Call 01270 897606.',
  keywords: 'roof inspection Nantwich, roofers Nantwich, roof repair Nantwich, roofing company Nantwich, emergency roofer Nantwich, flat roof Nantwich, tile roof repair Nantwich, Cheshire roofers',
  openGraph: {
    title: 'Free Roof Inspection Nantwich | Local Expert Roofers',
    description: 'Claim your FREE roof inspection in Nantwich. 25+ years experience, same day quotes, £10M insured. Call 01270 897606.',
    url: 'https://www.upgraderoofs.co.uk/offer-nantwich',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/5.jpeg',
        width: 1200,
        height: 630,
        alt: 'Professional Roofing Services Nantwich Cheshire - Free Inspection',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Roof Inspection Nantwich | 01270 897606',
    description: 'FREE roof inspection in Nantwich. Expert local roofers, 25+ years experience. Call now!',
    images: ['https://www.upgraderoofs.co.uk/images/5.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/offer-nantwich',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function OfferNantwichLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
