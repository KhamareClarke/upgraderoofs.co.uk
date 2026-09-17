import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Roof Inspection Middlewich',
  description: 'FREE roof inspection in Middlewich, Cheshire. Local roofers with 25+ years experience. Emergency roof repairs, leak fixes, new roofs. Same day quotes. CORC certified, £10M insured. Call 01270 897606.',
  keywords: 'roof inspection Middlewich, roofers Middlewich, roof repair Middlewich, roofing company Middlewich, emergency roofer Middlewich, flat roof Middlewich, tile roof repair Middlewich, Cheshire roofers',
  openGraph: {
    title: 'Free Roof Inspection Middlewich | Local Expert Roofers',
    description: 'Claim your FREE roof inspection in Middlewich. 25+ years experience, same day quotes, £10M insured. Call 01270 897606.',
    url: 'https://www.upgraderoofs.co.uk/offer-middlewich',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/3.jpeg',
        width: 1200,
        height: 630,
        alt: 'Professional Roofing Services Middlewich Cheshire - Free Inspection',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Roof Inspection Middlewich | 01270 897606',
    description: 'FREE roof inspection in Middlewich. Expert local roofers, 25+ years experience. Call now!',
    images: ['https://www.upgraderoofs.co.uk/images/3.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/offer-middlewich',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function OfferMiddlewichLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
