import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Roof Inspection Sandbach',
  description: 'FREE roof inspection in Sandbach, Cheshire. Local roofers with 25+ years experience. Emergency roof repairs, leak fixes, new roofs. Same day quotes. CORC certified, £10M insured. Call 01270 897606.',
  keywords: 'roof inspection Sandbach, roofers Sandbach, roof repair Sandbach, roofing company Sandbach, emergency roofer Sandbach, flat roof Sandbach, tile roof repair Sandbach, Cheshire roofers',
  openGraph: {
    title: 'Free Roof Inspection Sandbach | Local Expert Roofers',
    description: 'Claim your FREE roof inspection in Sandbach. 25+ years experience, same day quotes, £10M insured. Call 01270 897606.',
    url: 'https://www.upgraderoofs.co.uk/offer-sandbach',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/6.jpeg',
        width: 1200,
        height: 630,
        alt: 'Professional Roofing Services Sandbach Cheshire - Free Inspection',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Roof Inspection Sandbach | 01270 897606',
    description: 'FREE roof inspection in Sandbach. Expert local roofers, 25+ years experience. Call now!',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/offer-sandbach',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function OfferSandbachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
