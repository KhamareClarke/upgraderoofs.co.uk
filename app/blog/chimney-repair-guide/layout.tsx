import type { Metadata } from 'next';
import { BlogArticleSchema } from '@/components/BlogArticleSchema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Chimney Repairs Cheshire | Repointing & Rebuilds Guide',
  description: 'Complete guide to chimney repairs in Cheshire. Repointing, flashing, rebuilds explained. Signs of damage, costs, and when to call professionals. Free inspections.',
  keywords: 'chimney repairs Cheshire, chimney repointing, chimney flashing, chimney rebuild, chimney leak repair Sandbach Crewe',
  openGraph: {
    title: 'Chimney Repairs in Cheshire: Complete Guide',
    description: 'Everything you need to know about chimney maintenance and repairs.',
    type: 'article',
    url: 'https://www.upgraderoofs.co.uk/blog/chimney-repair-guide',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chimney Repairs Guide | Upgrade Roofs',
    description: 'Chimney repair guide for Cheshire homeowners.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog/chimney-repair-guide',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Inspect and Maintain Your Chimney',
  description: 'Step-by-step guide to identifying chimney problems and knowing when to call a professional chimney repair contractor in Cheshire.',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Check mortar joints between bricks', text: 'Look for cracked, crumbling, or missing mortar between the bricks of your chimney stack. This is the most common sign that repointing is required.' },
    { '@type': 'HowToStep', position: 2, name: 'Inspect flashing where chimney meets roof', text: 'Check the lead flashing at the base of the chimney for cracks, lifting, or open joints. Failed flashing is the number one cause of chimney-related leaks.' },
    { '@type': 'HowToStep', position: 3, name: 'Check chimney pot and cowl', text: 'Ensure the chimney pot is intact and a cowl is fitted to prevent water, birds, and debris from entering. Cracked pots should be replaced promptly.' },
    { '@type': 'HowToStep', position: 4, name: 'Look for spalling bricks', text: 'Spalling is when the face of bricks flakes off due to frost damage. It exposes the porous inner brick to further water damage and requires repair.' },
    { '@type': 'HowToStep', position: 5, name: 'Check inside for water stains', text: 'Look at ceilings and walls near the chimney breast inside your home. Water stains or damp patches indicate the chimney is allowing water ingress.' },
    { '@type': 'HowToStep', position: 6, name: 'Schedule annual professional inspection', text: 'Have a qualified roofing contractor inspect your chimney annually, especially after severe weather events or if the chimney has not been inspected in over 3 years.' },
  ],
};

export default function ChimneyRepairGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlogArticleSchema
        title="Chimney Repairs in Cheshire: Complete Guide"
        description="Complete guide to chimney repairs. Repointing, flashing, rebuilds explained."
        url="https://www.upgraderoofs.co.uk/blog/chimney-repair-guide"
        datePublished="2026-03-01"
        dateModified="2026-06-11"
        image="/images/1.jpeg"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Blog', url: 'https://www.upgraderoofs.co.uk/blog' },
        { name: 'Chimney Repair Guide', url: 'https://www.upgraderoofs.co.uk/blog/chimney-repair-guide' },
      ]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      {children}
    </>
  );
}
