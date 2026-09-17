import type { Metadata } from 'next';
import { BlogArticleSchema } from '@/components/BlogArticleSchema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Flat vs Tile Roofs | Which is Best?',
  description: 'Comparing flat roofs vs tile roofs. Pros, cons, costs, lifespan and maintenance. Expert guide to help you choose the right roofing for your property.',
  keywords: 'flat roof vs tile roof, roof comparison, best roof type, flat roof pros cons, tile roof benefits, roofing materials comparison',
  openGraph: {
    title: 'Flat vs Tile Roofs | Which is Best for Your Home?',
    description: 'Expert comparison of flat roofs vs tile roofs. Pros, cons, costs.',
    url: 'https://www.upgraderoofs.co.uk/blog/flat-vs-tile-roofs',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flat vs Tile Roofs | Upgrade Roofs',
    description: 'Expert comparison of flat roofs vs tile roofs.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog/flat-vs-tile-roofs',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FlatVsTileRoofsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlogArticleSchema
        title="Flat vs Tile Roofs: Which is Best for Your Home?"
        description="Comparing flat roofs vs tile roofs. Pros, cons, costs, lifespan and maintenance."
        url="https://www.upgraderoofs.co.uk/blog/flat-vs-tile-roofs"
        datePublished="2024-11-04"
        dateModified="2026-06-11"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Blog', url: 'https://www.upgraderoofs.co.uk/blog' },
        { name: 'Flat vs Tile Roofs', url: 'https://www.upgraderoofs.co.uk/blog/flat-vs-tile-roofs' },
      ]} />
      {children}
    </>
  );
}
