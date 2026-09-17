import type { Metadata } from 'next';
import { BlogArticleSchema } from '@/components/BlogArticleSchema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Identify and Fix Common Flat Roof Problems',
  description: 'Step-by-step guide to diagnosing flat roof issues and deciding whether to repair or replace.',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Check for standing water (ponding)', text: 'After rain, inspect the roof surface for water that remains more than 48 hours after rainfall. Ponding accelerates membrane degradation and is a sign of inadequate falls or a blocked drain.' },
    { '@type': 'HowToStep', position: 2, name: 'Look for blistering or bubbling', text: 'Bubbles or raised areas in a felt or EPDM surface indicate trapped air or moisture beneath the membrane. Small blisters may be monitored; large or spreading blisters require professional repair.' },
    { '@type': 'HowToStep', position: 3, name: 'Inspect seams and edges', text: 'Check where the membrane meets walls, parapets, and edges. Failed seams are the most common source of flat roof leaks. Look for lifting, cracking, or open joints in the flashing and upstands.' },
    { '@type': 'HowToStep', position: 4, name: 'Assess surface cracking', text: 'Fine surface cracks in felt or asphalt surfaces indicate age-related embrittlement. If cracks are deep or widespread, replacement is more cost-effective than patching.' },
    { '@type': 'HowToStep', position: 5, name: 'Check interior ceilings below the flat roof', text: 'Water staining, damp patches, or mould on ceilings beneath a flat roof confirm active water ingress. Identify the entry point externally before carrying out repairs.' },
    { '@type': 'HowToStep', position: 6, name: 'Decide: repair or replace', text: 'Roofs under 10 years old with isolated issues are good candidates for repair. Roofs over 15 years old with widespread blistering, cracking, or multiple leak points are better replaced with a modern EPDM or GRP system.' },
  ],
};

export const metadata: Metadata = {
  title: 'Common Flat Roof Problems & Solutions',
  description: 'Guide to common flat roof problems: ponding, blistering, cracking, leaks. When to repair vs replace. EPDM, GRP, felt roofing experts in Cheshire.',
  keywords: 'flat roof problems, flat roof repair, flat roof leaking, EPDM roof, GRP fibreglass roof, flat roof replacement Cheshire',
  openGraph: {
    title: 'Common Flat Roof Problems and How to Fix Them',
    description: 'Expert guide to flat roof issues and solutions.',
    type: 'article',
    url: 'https://www.upgraderoofs.co.uk/blog/flat-roof-problems',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flat Roof Problems Guide | Upgrade Roofs',
    description: 'Common flat roof issues and solutions.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog/flat-roof-problems',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FlatRoofProblemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <BlogArticleSchema
        title="Common Flat Roof Problems and How to Fix Them"
        description="Guide to common flat roof problems: ponding, blistering, cracking, leaks. When to repair vs replace."
        url="https://www.upgraderoofs.co.uk/blog/flat-roof-problems"
        datePublished="2026-02-15"
        dateModified="2026-06-11"
        image="/images/3.jpeg"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Blog', url: 'https://www.upgraderoofs.co.uk/blog' },
        { name: 'Flat Roof Problems', url: 'https://www.upgraderoofs.co.uk/blog/flat-roof-problems' },
      ]} />
      {children}
    </>
  );
}
