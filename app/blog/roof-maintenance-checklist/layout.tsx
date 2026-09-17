import type { Metadata } from 'next';
import { BlogArticleSchema } from '@/components/BlogArticleSchema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Roof Maintenance Checklist Cheshire',
  description: 'Complete roof maintenance checklist for Cheshire homeowners. Spring and autumn tasks, monthly checks, and when to call professionals. Extend your roof lifespan.',
  keywords: 'roof maintenance checklist, roof care Cheshire, seasonal roof maintenance, roof inspection guide, prevent roof damage',
  openGraph: {
    title: 'Roof Maintenance Checklist for Cheshire Homeowners',
    description: 'Keep your roof in top condition with our seasonal maintenance guide.',
    type: 'article',
    url: 'https://www.upgraderoofs.co.uk/blog/roof-maintenance-checklist',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roof Maintenance Checklist | Upgrade Roofs',
    description: 'Seasonal roof maintenance guide for Cheshire.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog/roof-maintenance-checklist',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Maintain Your Roof in Cheshire',
  description: 'A seasonal roof maintenance guide for homeowners across Cheshire. Follow these steps twice a year to extend your roof lifespan and prevent costly repairs.',
  totalTime: 'PT3H',
  supply: [
    { '@type': 'HowToSupply', name: 'Binoculars for ground-level inspection' },
    { '@type': 'HowToSupply', name: 'Torch for loft inspection' },
    { '@type': 'HowToSupply', name: 'Ladder (single-storey only, with safety training)' },
  ],
  step: [
    {
      '@type': 'HowToSection',
      name: 'Spring Maintenance',
      itemListElement: [
        { '@type': 'HowToStep', position: 1, name: 'Inspect for winter storm damage', text: 'Walk around your property and look from ground level for missing tiles, broken gutters, or debris on the roof. Use binoculars for a closer look.' },
        { '@type': 'HowToStep', position: 2, name: 'Check and clean gutters', text: 'Clear leaves, moss, and debris from gutters. Ensure downspouts flow freely and check for leaking joints or sagging sections.' },
        { '@type': 'HowToStep', position: 3, name: 'Look for loose or missing tiles', text: 'Identify any tiles that appear displaced, cracked, or missing. Pay attention to ridge and hip tiles which are most vulnerable.' },
        { '@type': 'HowToStep', position: 4, name: 'Inspect chimney flashing', text: 'Check lead flashing at the base of chimneys and around skylights for cracks, lifting, or open joints that could allow water entry.' },
        { '@type': 'HowToStep', position: 5, name: 'Check for moss or algae growth', text: 'Green or black patches indicate moss or algae. These lift tiles and cause water damage if untreated. Consider professional moss treatment.' },
        { '@type': 'HowToStep', position: 6, name: 'Examine roof valleys for debris', text: 'Roof valleys channel rainwater off the roof. Clear accumulated debris that could block water flow and cause ponding.' },
      ],
    },
    {
      '@type': 'HowToSection',
      name: 'Autumn Maintenance',
      itemListElement: [
        { '@type': 'HowToStep', position: 7, name: 'Clear leaves from gutters and roof', text: 'Clear gutters thoroughly in October or November before winter rains arrive. Autumn leaf fall is the biggest cause of gutter blockages.' },
        { '@type': 'HowToStep', position: 8, name: 'Trim overhanging branches', text: 'Cut back branches hanging over your roof. In storms these can damage tiles or deposit large amounts of debris.' },
        { '@type': 'HowToStep', position: 9, name: 'Check seals around vents and skylights', text: 'Inspect rubber seals and flashing around all roof penetrations. Failed seals are a common source of winter leaks.' },
        { '@type': 'HowToStep', position: 10, name: 'Inspect chimney cap and flashing', text: "Check chimney pots are intact and cowls are in place. Inspect lead flashing for cracks before winter's freeze-thaw cycles begin." },
        { '@type': 'HowToStep', position: 11, name: 'Look for cracked or damaged tiles', text: 'Frost-damaged tiles often crack in autumn after a summer of expansion. Replace cracked tiles before they allow water ingress during winter.' },
        { '@type': 'HowToStep', position: 12, name: 'Ensure downspouts are clear', text: 'Test downspouts with water to confirm they drain freely. Clear blockages and ensure they discharge correctly away from foundations.' },
      ],
    },
  ],
};

export default function RoofMaintenanceChecklistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlogArticleSchema
        title="Roof Maintenance Checklist for Cheshire Homeowners"
        description="Complete roof maintenance checklist for Cheshire homeowners. Seasonal tasks and when to call professionals."
        url="https://www.upgraderoofs.co.uk/blog/roof-maintenance-checklist"
        datePublished="2026-03-10"
        dateModified="2026-06-11"
        image="/images/6.jpeg"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Blog', url: 'https://www.upgraderoofs.co.uk/blog' },
        { name: 'Roof Maintenance Checklist', url: 'https://www.upgraderoofs.co.uk/blog/roof-maintenance-checklist' },
      ]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      {children}
    </>
  );
}
