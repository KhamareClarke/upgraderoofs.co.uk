import type { Metadata } from 'next';
import Image from 'next/image';
import { Home, Layers, Flame, Droplets, Sun, Square, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { QuoteForm } from '@/components/QuoteForm';
import { SectionHeader } from '@/components/SectionHeader';
import { CtaSubMessage } from '@/components/CtaSubMessage';
export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Roofing Services Cheshire',
  description: 'Complete roofing services in Cheshire. Tile & slate roofs, flat roofing, chimney repairs, gutters, fascias, skylights, cladding. 10-year guarantee, £10M insured. Free quotes. Call 01270 897606.',
  keywords: 'roofing services Cheshire, roof installation Cheshire, roof repairs, tile roofing, flat roofing, chimney repairs, gutter installation, skylights, cladding',
  openGraph: {
    title: 'Roofing Services Cheshire | Expert Installation & Repairs',
    description: 'Complete roofing solutions. Tile, slate, flat roofs, chimneys, gutters, skylights. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/services',
    siteName: 'Upgrade Roofs',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roofing Services Cheshire | 01270 897606',
    description: 'Expert roofing services. Free quotes, 10-year guarantee.',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/services',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const services = [
  {
    title: 'Tile & Slate Roofs',
    slug: 'tile-slate-roofing',
    description: 'Expert installation and repair of traditional tile and slate roofing. Weather resistant, durable, and aesthetically pleasing for your home.',
    icon: Home,
    image: '/images/6.jpeg',
    features: ['Traditional craftsmanship', 'Premium materials', 'Weather resistant', '50+ year lifespan'],
  },
  {
    title: 'Flat Roofs',
    slug: 'flat-roofing',
    description: 'Modern flat roofing solutions with superior waterproofing. Perfect for extensions, garages, and commercial properties.',
    icon: Layers,
    image: '/images/3.jpeg',
    features: ['EPDM rubber systems', 'GRP fibreglass', 'Felt roofing', '20-year warranty'],
  },
  {
    title: 'Chimney Repairs',
    slug: 'chimney-repairs',
    description: 'Professional chimney maintenance and repair services. From repointing to full rebuilds, we keep your chimney safe and functional.',
    icon: Flame,
    image: '/images/1.jpeg',
    features: ['Stack repairs', 'Repointing', 'Lead flashing', 'Cowl installation'],
  },
  {
    title: 'Gutters & Fascias',
    slug: 'gutters-fascias',
    description: 'Complete gutter and fascia installation, repair, and maintenance. Protect your property from water damage with quality materials.',
    icon: Droplets,
    image: '/images/2.jpeg',
    features: ['uPVC systems', 'Cast iron gutters', 'Leaf guards', 'Fascia boards'],
  },
  {
    title: 'Skylights & Roof Windows',
    slug: 'skylights-roof-windows',
    description: 'Bring natural light into your home with professionally installed skylights and roof windows. Expert fitting and weatherproofing guaranteed.',
    icon: Sun,
    image: '/images/10.jpeg',
    features: ['VELUX approved', 'Energy efficient', 'Perfect sealing', 'Electric options'],
  },
  {
    title: 'Cladding Installations',
    slug: 'cladding',
    description: 'Transform your property with modern cladding solutions. Weather-resistant materials installed to the highest standards.',
    icon: Square,
    image: '/images/4.jpeg',
    features: ['uPVC cladding', 'Timber cladding', 'Modern finishes', 'Low maintenance'],
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative h-[300px] sm:h-[350px] md:h-[400px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/6.jpeg)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-navy/70" />
        </div>

        <div className="container-custom relative z-10 text-center px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 px-2">Our Services</h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto px-2">
            Comprehensive roofing solutions for every need
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <SectionHeader
            kicker="Our Services"
            title={<>Professional Roofing <span className="text-brand-orange">Services</span></>}
            subtitle="From installation to repairs, we provide expert roofing services tailored to your needs"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={index}
                  className="group bg-white border border-gray-200 border-l-4 border-l-brand-navy overflow-hidden hover:border-brand-orange/50 transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
                    <Image
                      src={service.image}
                      alt={service.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      loading="lazy"
                      quality={60}
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/50 to-transparent" />

                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-14 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                      </div>
                    </div>

                    <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{service.title}</h3>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 md:p-6">
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4 sm:mb-6">{service.description}</p>

                    <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-600">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Link href={`/services/${service.slug}`}>
                      <Button
                        variant="ghost"
                        className="w-full justify-between text-brand-navy hover:text-brand-orange hover:bg-brand-orange/5 font-semibold text-sm sm:text-base"
                      >
                        <span>Learn More</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white">
        <div className="container-custom text-center px-2">
          <SectionHeader
            dark
            kicker="Bespoke Roofing"
            title="Need a Custom Solution?"
            subtitle="Contact us for a free consultation and quote tailored to your specific requirements"
          />
          <div className="flex flex-col items-center gap-2">
            <QuoteForm trigger={
              <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-6 sm:px-8 md:px-10 h-12 sm:h-14 text-base sm:text-lg w-full sm:w-auto max-w-xs sm:max-w-none mx-auto">
                Get Free Quote
              </Button>
            } />
            <CtaSubMessage dark />
          </div>
        </div>
      </section>
    </div>
  );
}
