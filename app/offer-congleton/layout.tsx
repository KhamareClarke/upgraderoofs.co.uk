import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Roof Inspection Congleton',
  description: 'FREE roof inspection in Congleton, Cheshire. Local roofers with 25+ years experience. Emergency roof repairs, leak fixes, new roofs. Same day quotes. CORC certified, £10M insured. Call 01270 897606.',
  keywords: 'roof inspection Congleton, roofers Congleton, roof repair Congleton, roofing company Congleton, emergency roofer Congleton, flat roof Congleton, tile roof repair Congleton, Cheshire roofers',
  openGraph: {
    title: 'Free Roof Inspection Congleton | Local Expert Roofers',
    description: 'Claim your FREE roof inspection in Congleton. 25+ years experience, same day quotes, £10M insured. Call 01270 897606.',
    url: 'https://www.upgraderoofs.co.uk/offer-congleton',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/4.jpeg',
        width: 1200,
        height: 630,
        alt: 'Professional Roofing Services Congleton Cheshire - Free Inspection',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Roof Inspection Congleton | 01270 897606',
    description: 'FREE roof inspection in Congleton. Expert local roofers, 25+ years experience. Call now!',
    images: ['https://www.upgraderoofs.co.uk/images/4.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/offer-congleton',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function OfferCongletonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
