import type { Metadata } from 'next';
import { BlogArticleSchema } from '@/components/BlogArticleSchema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Choose a Reliable Roofing Contractor',
  description: 'Step-by-step guide to finding and vetting a trustworthy roofer in Cheshire and avoiding cowboy builders.',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Check for trade body membership', text: 'Look for membership of recognised trade bodies such as CORC (Confederation of Roofing Contractors), NFRC (National Federation of Roofing Contractors), or TrustMark. These require contractors to meet quality and insurance standards.' },
    { '@type': 'HowToStep', position: 2, name: 'Verify public liability insurance', text: 'Any reputable roofing contractor must carry public liability insurance · ideally £5M or more. Ask to see the certificate and confirm it is current before work begins.' },
    { '@type': 'HowToStep', position: 3, name: 'Request multiple written quotes', text: 'Obtain at least three written, itemised quotes. Be wary of quotes that are extremely cheap or offered verbally without specifics · these are common tactics of rogue traders.' },
    { '@type': 'HowToStep', position: 4, name: 'Check reviews and references', text: 'Look for reviews on Google, Checkatrade, or Trustpilot. A reputable contractor should have a history of verified customer reviews. If possible, ask for references from recent local jobs.' },
    { '@type': 'HowToStep', position: 5, name: 'Confirm they are local and established', text: 'Choose a contractor with a local, verifiable address and phone number. Long-established local firms have a reputation to protect and are far less likely to disappear after taking a deposit.' },
    { '@type': 'HowToStep', position: 6, name: 'Never pay the full amount upfront', text: 'A trustworthy contractor will not demand full payment before work starts. A small deposit (typically 10–25%) is normal; the balance is paid on satisfactory completion. Full upfront payments are a major red flag.' },
  ],
};

export const metadata: Metadata = {
  title: 'Choosing a Roofing Contractor in Cheshire',
  description: 'Expert guide to choosing a reliable roofing contractor in Cheshire. Red flags, green flags, questions to ask. Protect yourself from rogue traders.',
  keywords: 'choose roofing contractor, reliable roofer Cheshire, avoid cowboy builders, roofing contractor checklist, hire roofer safely',
  openGraph: {
    title: 'How to Choose a Reliable Roofing Contractor',
    description: 'Avoid cowboy builders with our expert guide to hiring roofers.',
    type: 'article',
    url: 'https://www.upgraderoofs.co.uk/blog/choosing-roofing-contractor',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Choosing a Roofing Contractor | Upgrade Roofs',
    description: 'Expert guide to hiring reliable roofers.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog/choosing-roofing-contractor',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ChoosingRoofingContractorLayout({
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
        title="How to Choose a Reliable Roofing Contractor in Cheshire"
        description="Expert guide to choosing a reliable roofing contractor. Red flags, green flags, questions to ask."
        url="https://www.upgraderoofs.co.uk/blog/choosing-roofing-contractor"
        datePublished="2026-02-25"
        dateModified="2026-06-11"
        image="/images/6.jpeg"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Blog', url: 'https://www.upgraderoofs.co.uk/blog' },
        { name: 'Choosing a Roofing Contractor', url: 'https://www.upgraderoofs.co.uk/blog/choosing-roofing-contractor' },
      ]} />
      {children}
    </>
  );
}
