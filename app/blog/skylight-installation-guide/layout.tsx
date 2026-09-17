import type { Metadata } from 'next';
import { BlogArticleSchema } from '@/components/BlogArticleSchema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Skylight Installation Guide Cheshire | Velux & Sun Tunnels',
  description: 'Complete guide to skylight installation in Cheshire. Velux, sun tunnels, flat roof skylights. Types, costs, benefits. Professional installation across Cheshire.',
  keywords: 'skylight installation Cheshire, Velux installer, sun tunnel, roof window, flat roof skylight, natural light',
  openGraph: {
    title: 'Skylight Installation Guide: Transform Your Home',
    description: 'Everything about adding skylights to your Cheshire home.',
    type: 'article',
    url: 'https://www.upgraderoofs.co.uk/blog/skylight-installation-guide',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skylight Installation Guide | Upgrade Roofs',
    description: 'Complete skylight guide for Cheshire homeowners.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog/skylight-installation-guide',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How a Skylight is Installed by Professional Roofers',
  description: 'The professional skylight installation process used by Upgrade Roofs across Cheshire, from survey through to finished installation.',
  totalTime: 'PT8H',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Survey and planning', text: 'A qualified roofer assesses your roof structure, identifies the best position for the skylight, checks for rafters and obstacles, and recommends the correct size and type for your needs.' },
    { '@type': 'HowToStep', position: 2, name: 'Preparation', text: 'The interior space is protected with dust sheets. Scaffolding or safe access equipment is erected externally where needed to comply with safety regulations.' },
    { '@type': 'HowToStep', position: 3, name: 'Opening creation', text: 'Tiles or slates are carefully removed and the roof covering is cut back. Rafters may be trimmed or a structural lintel installed to create a safe, sound opening.' },
    { '@type': 'HowToStep', position: 4, name: 'Frame installation', text: 'The skylight frame is secured to the roof timbers using appropriate fixings. The frame is levelled and aligned before the glazed unit is fitted into position.' },
    { '@type': 'HowToStep', position: 5, name: 'Weatherproofing', text: 'A manufacturer-specific flashing kit is installed around the skylight to create a fully watertight seal. Tiles are refitted carefully around the flashing collar.' },
    { '@type': 'HowToStep', position: 6, name: 'Finishing', text: 'Internal trim, reveal liners, and any required plastering are completed. The installation is tested for correct operation and checked for water tightness before sign-off.' },
  ],
};

export default function SkylightInstallationGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlogArticleSchema
        title="Skylight Installation Guide: Transform Your Cheshire Home"
        description="Complete guide to skylight installation. Velux, sun tunnels, flat roof skylights. Types, costs, benefits."
        url="https://www.upgraderoofs.co.uk/blog/skylight-installation-guide"
        datePublished="2026-02-20"
        dateModified="2026-06-11"
        image="/images/10.jpeg"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Blog', url: 'https://www.upgraderoofs.co.uk/blog' },
        { name: 'Skylight Installation Guide', url: 'https://www.upgraderoofs.co.uk/blog/skylight-installation-guide' },
      ]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      {children}
    </>
  );
}
