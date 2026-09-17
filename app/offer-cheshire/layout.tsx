import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Roof Inspection Cheshire',
  description: 'FREE roof inspection across Cheshire and North West England. Local roofers with 25+ years experience. Emergency roof repairs, leak fixes, new roofs. Same day quotes. CORC certified, £10M insured. Call 01270 897606.',
  keywords: 'roof inspection Cheshire, roofers Cheshire, roof repair Cheshire, roofing company Cheshire, emergency roofer Cheshire, flat roof Cheshire, tile roof repair Cheshire, North West roofers, Sandbach, Crewe, Middlewich, Congleton',
  openGraph: {
    title: 'Free Roof Inspection Cheshire | Local Expert Roofers',
    description: 'Claim your FREE roof inspection in Cheshire. 25+ years experience, same day quotes, £10M insured. Call 01270 897606.',
    url: 'https://www.upgraderoofs.co.uk/offer-cheshire',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/6.jpeg',
        width: 1200,
        height: 630,
        alt: 'Professional Roofing Services Cheshire - Free Inspection',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Roof Inspection Cheshire | 01270 897606',
    description: 'FREE roof inspection in Cheshire. Expert local roofers, 25+ years experience. Call now!',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/offer-cheshire',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function OfferCheshireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
