import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Roofing Case Studies Sandbach & Cheshire | Before & After',
  description: 'Real roofing projects in Sandbach, Crewe, Middlewich & Cheshire. Before/after photos, customer reviews. Re-roofs, flat roofs, chimney repairs, emergency work. 25+ years experience.',
  keywords: 'roofing case studies Sandbach, before after roofing Cheshire, roofing projects CW11, roof replacement examples, roofing testimonials Sandbach',
  openGraph: {
    title: 'Roofing Case Studies | Before & After Photos',
    description: 'Real roofing projects completed across Cheshire with customer testimonials.',
    url: 'https://www.upgraderoofs.co.uk/case-studies',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roofing Case Studies | Upgrade Roofs',
    description: 'Before and after roofing projects in Cheshire.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/case-studies',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const caseStudiesSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Roofing Case Studies · Upgrade Roofs',
  description: 'Real roofing projects completed across Sandbach, Crewe, Middlewich and Cheshire with before and after photographs.',
  url: 'https://www.upgraderoofs.co.uk/case-studies',
  numberOfItems: 6,
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Full Re-Roof in Sandbach · Welsh Slate',
      url: 'https://www.upgraderoofs.co.uk/case-studies',
      image: {
        '@type': 'ImageObject',
        url: 'https://www.upgraderoofs.co.uk/images/1.jpeg',
        description: 'Before and after Welsh slate re-roof on a semi-detached house in Sandbach, Cheshire',
      },
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'EPDM Flat Roof Replacement · Garage Extension',
      url: 'https://www.upgraderoofs.co.uk/case-studies',
      image: {
        '@type': 'ImageObject',
        url: 'https://www.upgraderoofs.co.uk/images/3.jpeg',
        description: 'EPDM flat roof replacement on a garage extension in Crewe, Cheshire',
      },
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Chimney Rebuild and Repointing · Nantwich',
      url: 'https://www.upgraderoofs.co.uk/case-studies',
      image: {
        '@type': 'ImageObject',
        url: 'https://www.upgraderoofs.co.uk/images/2.jpeg',
        description: 'Chimney rebuild and repointing on a period property in Nantwich',
      },
    },
    {
      '@type': 'ListItem',
      position: 4,
      name: 'Emergency Storm Damage Repair · Crewe',
      url: 'https://www.upgraderoofs.co.uk/case-studies',
      image: {
        '@type': 'ImageObject',
        url: 'https://www.upgraderoofs.co.uk/images/7.jpeg',
        description: 'Emergency storm damage repair on a Victorian terrace in Crewe',
      },
    },
    {
      '@type': 'ListItem',
      position: 5,
      name: 'Velux Skylight Installation · Holmes Chapel',
      url: 'https://www.upgraderoofs.co.uk/case-studies',
      image: {
        '@type': 'ImageObject',
        url: 'https://www.upgraderoofs.co.uk/images/10.jpeg',
        description: 'Velux skylight installation into a pitched roof in Holmes Chapel',
      },
    },
    {
      '@type': 'ListItem',
      position: 6,
      name: 'Gutters and Fascias Replacement · Alsager',
      url: 'https://www.upgraderoofs.co.uk/case-studies',
      image: {
        '@type': 'ImageObject',
        url: 'https://www.upgraderoofs.co.uk/images/6.jpeg',
        description: 'Full uPVC gutters and fascias replacement on a detached property in Alsager',
      },
    },
  ],
};

export default function CaseStudiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(caseStudiesSchema) }}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Case Studies', url: 'https://www.upgraderoofs.co.uk/case-studies' },
      ]} />
      {children}
    </>
  );
}
