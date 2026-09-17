import type { Metadata } from 'next';
import { BlogArticleSchema } from '@/components/BlogArticleSchema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Emergency Roof Repairs Cheshire | 24/7',
  description: 'Need emergency roof repairs in Cheshire? 24/7 storm damage response. Leaks, missing tiles, wind damage. Fast response across Sandbach, Crewe, Middlewich. Call 01270 897606.',
  keywords: 'emergency roof repairs Cheshire, storm damage roof, 24/7 roofer, roof leak emergency, urgent roof repair Sandbach Crewe',
  openGraph: {
    title: 'Emergency Roof Repairs Cheshire | 24/7 Response',
    description: 'Fast emergency roof repairs across Cheshire. Storm damage, leaks, missing tiles.',
    type: 'article',
    url: 'https://www.upgraderoofs.co.uk/blog/emergency-roof-repairs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Emergency Roof Repairs Cheshire | 24/7',
    description: 'Fast emergency roof repairs across Cheshire.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog/emergency-roof-repairs',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'What to Do in a Roofing Emergency',
  description: 'Step-by-step guide to handling a roofing emergency safely and minimising damage to your home while waiting for professional help.',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Ensure safety first', text: 'Move family members away from affected areas. If water is near electrical fittings, turn off electricity at the fuse box. Place buckets to catch dripping water and move valuables to safety.' },
    { '@type': 'HowToStep', position: 2, name: 'Document the damage', text: 'Take photographs and video of all visible damage, both inside and outside. Note the time and weather conditions. Keep any fallen materials if safe to do so · this evidence helps with insurance claims.' },
    { '@type': 'HowToStep', position: 3, name: 'Call a 24/7 emergency roofer immediately', text: 'Contact a qualified roofing contractor immediately. Upgrade Roofs covers all of Cheshire 24/7 · call 01270 897606. A professional will assess severity over the phone and dispatch a team.' },
    { '@type': 'HowToStep', position: 4, name: 'Allow temporary weatherproofing to be installed', text: 'The emergency team will install tarpaulins or waterproof sheets to prevent further water ingress into your home until permanent repairs can be completed.' },
    { '@type': 'HowToStep', position: 5, name: 'Get a full damage assessment', text: 'Once the property is made safe, a thorough inspection identifies the full extent of damage. A written repair quote is provided, which can also be submitted to your insurer.' },
    { '@type': 'HowToStep', position: 6, name: 'Schedule permanent repairs', text: 'Permanent repairs are arranged at your convenience once temporary protection is in place. The roofer can liaise directly with your insurer if required, handling documentation and sign-off.' },
  ],
};

export default function EmergencyRoofRepairsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlogArticleSchema
        title="Emergency Roof Repairs in Cheshire: What to Do When Disaster Strikes"
        description="Need emergency roof repairs in Cheshire? 24/7 storm damage response. Leaks, missing tiles, wind damage."
        url="https://www.upgraderoofs.co.uk/blog/emergency-roof-repairs"
        datePublished="2026-03-15"
        dateModified="2026-06-11"
        image="/images/1.jpeg"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Blog', url: 'https://www.upgraderoofs.co.uk/blog' },
        { name: 'Emergency Roof Repairs', url: 'https://www.upgraderoofs.co.uk/blog/emergency-roof-repairs' },
      ]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      {children}
    </>
  );
}
