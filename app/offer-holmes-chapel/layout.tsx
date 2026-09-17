import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Roof Inspection Holmes Chapel',
  description: 'FREE roof inspection in Holmes Chapel, Cheshire. Local roofers with 25+ years experience. Emergency roof repairs, leak fixes, new roofs. Same day quotes. CORC certified, £10M insured. Call 01270 897606.',
  keywords: 'roof inspection Holmes Chapel, roofers Holmes Chapel, roof repair Holmes Chapel, roofing company Holmes Chapel, emergency roofer Holmes Chapel, flat roof Holmes Chapel, tile roof repair Holmes Chapel, Cheshire roofers',
  openGraph: {
    title: 'Free Roof Inspection Holmes Chapel | Local Expert Roofers',
    description: 'Claim your FREE roof inspection in Holmes Chapel. 25+ years experience, same day quotes, £10M insured. Call 01270 897606.',
    url: 'https://www.upgraderoofs.co.uk/offer-holmes-chapel',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/10.jpeg',
        width: 1200,
        height: 630,
        alt: 'Professional Roofing Services Holmes Chapel Cheshire - Free Inspection',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Roof Inspection Holmes Chapel | 01270 897606',
    description: 'FREE roof inspection in Holmes Chapel. Expert local roofers, 25+ years experience. Call now!',
    images: ['https://www.upgraderoofs.co.uk/images/10.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/offer-holmes-chapel',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function OfferHolmesChapelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
