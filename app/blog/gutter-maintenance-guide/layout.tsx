import type { Metadata } from 'next';
import { BlogArticleSchema } from '@/components/BlogArticleSchema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Gutter Maintenance Guide Cheshire | Cleaning & Repairs',
  description: 'Complete guide to gutter maintenance in Cheshire. When to clean, signs of problems, DIY vs professional. Gutter services in Sandbach, Crewe, Middlewich.',
  keywords: 'gutter maintenance Cheshire, gutter cleaning, blocked gutters, gutter repair, fascia soffit Cheshire',
  openGraph: {
    title: 'Complete Guide to Gutter Maintenance in Cheshire',
    description: 'Keep your gutters flowing freely and protect your home from water damage.',
    type: 'article',
    url: 'https://www.upgraderoofs.co.uk/blog/gutter-maintenance-guide',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gutter Maintenance Guide | Upgrade Roofs',
    description: 'Gutter care guide for Cheshire homeowners.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog/gutter-maintenance-guide',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Maintain Your Gutters in Cheshire',
  description: 'A seasonal gutter maintenance guide for Cheshire homeowners to prevent water damage and extend gutter lifespan.',
  totalTime: 'PT2H',
  step: [
    {
      '@type': 'HowToSection',
      name: 'Autumn Gutter Maintenance (October–November)',
      itemListElement: [
        { '@type': 'HowToStep', position: 1, name: 'Clear fallen leaves and debris', text: 'After the main leaf fall, clear all gutters by hand or with a scoop. This is the most critical maintenance task of the year · blocked gutters in winter can cause serious water damage to fascias and walls.' },
        { '@type': 'HowToStep', position: 2, name: 'Check downspout flow', text: 'Pour water into each gutter section and confirm it flows freely to the downspout and away from the property. Slow drainage indicates a blockage below that needs clearing.' },
        { '@type': 'HowToStep', position: 3, name: 'Inspect for damage before winter', text: 'Check for sagging sections, leaking joints, cracks, or brackets that have pulled away from the fascia. Make any repairs before winter to prevent escalating damage.' },
      ],
    },
    {
      '@type': 'HowToSection',
      name: 'Spring Gutter Maintenance (March–April)',
      itemListElement: [
        { '@type': 'HowToStep', position: 4, name: 'Remove winter debris', text: 'Winter storms deposit grit, moss, and debris in gutters. Clear everything thoroughly and flush with water to check flow before spring rains arrive.' },
        { '@type': 'HowToStep', position: 5, name: 'Check for ice damage', text: 'Ice formation in gutters can distort sections, crack joints, and pull brackets from fascias. Inspect carefully for any deformation caused by winter ice.' },
        { '@type': 'HowToStep', position: 6, name: 'Inspect brackets and fixings', text: 'Check that all gutter brackets are secure and the gutter has the correct fall toward downspouts. Replace any corroded or broken fixings immediately.' },
        { '@type': 'HowToStep', position: 7, name: 'Test water flow', text: 'Use a hose to run water through the full gutter system. Confirm every section drains correctly, all joints are watertight, and downspouts discharge freely away from foundations.' },
      ],
    },
  ],
};

export default function GutterMaintenanceGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlogArticleSchema
        title="Complete Guide to Gutter Maintenance in Cheshire"
        description="Complete guide to gutter maintenance. When to clean, signs of problems, DIY vs professional."
        url="https://www.upgraderoofs.co.uk/blog/gutter-maintenance-guide"
        datePublished="2026-03-05"
        dateModified="2026-06-11"
        image="/images/2.jpeg"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Blog', url: 'https://www.upgraderoofs.co.uk/blog' },
        { name: 'Gutter Maintenance Guide', url: 'https://www.upgraderoofs.co.uk/blog/gutter-maintenance-guide' },
      ]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      {children}
    </>
  );
}
