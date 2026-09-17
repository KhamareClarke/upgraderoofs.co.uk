import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { Gallery as GalleryComponent } from '@/components/Gallery';
import { SectionHeader } from '@/components/SectionHeader';
import { HeroKicker } from '@/components/HeroKicker';

export const metadata: Metadata = {
  title: 'Roofing Gallery | Completed Projects',
  description: 'View our portfolio of completed roofing projects across Cheshire. Before and after photos. Tile roofs, flat roofs, chimneys, gutters. Quality workmanship showcase.',
  keywords: 'roofing gallery Cheshire, completed roofing projects, roofing portfolio, before after roofing, Cheshire roofing examples, roof transformation',
  openGraph: {
    title: 'Roofing Gallery | Completed Projects Cheshire',
    description: 'View our portfolio of completed roofing projects. Before and after photos.',
    url: 'https://www.upgraderoofs.co.uk/gallery',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roofing Gallery | Upgrade Roofs',
    description: 'View our completed roofing projects across Cheshire.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/gallery',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function GalleryPage() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Gallery', url: 'https://www.upgraderoofs.co.uk/gallery' },
      ]} />
      <div className="min-h-screen bg-white">
      <section className="relative h-[300px] sm:h-[350px] md:h-[400px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-navy/70" />
        </div>

        <div className="container-custom relative z-10 text-center px-4">
          <HeroKicker light align="center" className="mb-3 sm:mb-4">Our Work</HeroKicker>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 px-2">Project Gallery</h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto px-2">
            Explore our completed roofing projects across Cheshire
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <SectionHeader
            kicker="Our Work"
            title={<>Our <span className="text-brand-orange">Portfolio</span></>}
            subtitle="Browse through our extensive portfolio of roofing projects showcasing quality craftsmanship"
          />

          <GalleryComponent />
        </div>
      </section>
    </div>
    </>
  );
}
