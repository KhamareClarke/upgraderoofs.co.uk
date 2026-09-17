import type { Metadata } from 'next';
import { Hero } from '@/components/Hero';
import { Services } from '@/components/Services';
import { WhyChooseUs } from '@/components/WhyChooseUs';
import { CTABanner } from '@/components/CTABanner';
import { GalleryBlock, FAQBlock, ContactBlock } from '@/components/HomepageSections';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import { ServiceAreaGrid } from '@/components/ServiceAreaGrid';
import { orderAreaLinks } from '@/lib/service-areas';
import { Button } from '@/components/ui/button';
import { ReviewsSection } from '@/components/ReviewsSection';
import { MapPin, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  // The homepage is the root segment, so the root layout's title template does
  // NOT reach it: Next only stashes the template for items before the last two
  // (resolve-metadata.js: `if (i < metadataItems.length - 2)`), and here there
  // are only two items — the root layout and this page. So the brand has to be
  // written out in full here, unlike every other page.
  title: 'Trusted Roofers in Sandbach & Cheshire | Upgrade Roofs',
  description: 'Upgrade Roofs offers expert roof repair, new roofs, and flat roofing in Sandbach, Crewe, and across Cheshire. CORC-certified with 25+ years of experience. Get your free quote today.',
  openGraph: {
    title: 'Upgrade Roofs | Trusted Roofers in Sandbach & Cheshire',
    description: '25+ years experience, CORC certified, £10M insured. We offer roof repairs, new roofs, and more. Free quotes available.',
    url: 'https://www.upgraderoofs.co.uk',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/og-image.jpg', // Using a dedicated OG image is better
        width: 1200,
        height: 630,
        alt: 'A newly installed roof by Upgrade Roofs in Cheshire',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upgrade Roofs | Trusted Roofers in Sandbach & Cheshire',
    description: 'Your local, certified roofing experts for repairs, new roofs, and more in Sandbach & Cheshire.',
    images: ['https://www.upgraderoofs.co.uk/twitter-image.jpg'], // Using a dedicated Twitter image
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk',
  },
};

export default function Home() {
  return (
    <>
      <section id="hero">
        <Hero />
      </section>

      {/* Trust & Credibility · official accreditation badges */}
      <section className="border-b border-gray-200 bg-white">
        <div className="container-custom">
          <div className="py-10 sm:py-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Accredited &amp; Insured</span>
                <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">
                Trusted &amp; Approved
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Recognised by leading industry bodies and trusted by thousands of customers
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 items-center">
              {[
                { src: '/images/corc_logo-1024x549.webp', alt: 'CORC certified member logo', width: 1024, height: 549, label: 'CORC Certified', meta: 'Approved member', priority: true },
                { src: '/images/badge-light@2x.png', alt: 'MyApproved verified member badge', width: 760, height: 284, label: '£10M Insured', meta: 'Public liability cover', priority: false },
                { src: '/images/badge-light@2x.png', alt: 'Insurance Backed Guarantee badge', width: 760, height: 284, label: 'IBG Guarantee', meta: 'Insurance-backed work', priority: false },
                { src: '/images/Google-Review-Emblem-500x281.png', alt: 'Google reviews emblem with 5 star rating', width: 500, height: 281, label: '5-Star Rated', meta: 'Google · MyApproved verified', priority: false },
              ].map((item, index) => (
                <div key={index} className="group flex flex-col items-center text-center">
                  <div className="relative w-full max-w-[190px] h-24 flex items-center justify-center bg-white border border-gray-200 rounded-lg shadow-sm p-3 transition-transform duration-300 group-hover:scale-105">
                    <Image
                      src={item.src}
                      alt={item.alt}
                      width={item.width}
                      height={item.height}
                      className="w-full h-full object-contain"
                      priority={item.priority}
                    />
                  </div>
                  <p className="mt-5 text-sm sm:text-base font-bold text-brand-navy tracking-wide">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">{item.meta}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <TrackedPhoneLink
                href="tel:01270897606"
                placement="trust_badges"
                className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
              >
                Get a Free Quote
              </TrackedPhoneLink>
              <CtaSubMessage className="mt-2" />
            </div>
          </div>
        </div>
      </section>
      
      <section id="services">
        <Services />
      </section>
      <section id="about">
        <WhyChooseUs />
      </section>

      {/* Live customer reviews · reputationhub widget */}
      <section id="reviews">
        <ReviewsSection />
      </section>
      <div className="bg-gradient-to-b from-white via-gray-50 to-gray-100">
        <section id="gallery">
          <GalleryBlock />
        </section>
        <FAQBlock />
      </div>
      <CTABanner />

      {/* Local Service Areas · Internal Linking Hub */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
              <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Where We Work</span>
              <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-3">
              Roofing Services Across <span className="text-brand-orange">Cheshire</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              Based in Sandbach, we serve homeowners and businesses throughout south and mid-Cheshire.
            </p>
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-white border border-gray-300 border-t-2 border-t-brand-orange">
              <MapPin className="w-5 h-5 text-brand-orange" />
              <span className="text-sm font-semibold text-brand-navy">
                Looking for{' '}
                <Link href="/roofers-sandbach" className="text-brand-orange hover:underline font-bold">
                  roofers in Cheshire
                </Link>
                ?
              </span>
            </div>
          </div>
          <ServiceAreaGrid
            areas={orderAreaLinks({ lead: '/roofers-sandbach' })}
            className="mb-8"
          />
          <div className="text-center">
            <Button
              size="lg"
              className="group bg-brand-orange hover:bg-brand-navy-light text-white font-semibold px-7 sm:px-8 h-12 sm:h-14 rounded-lg shadow-lg shadow-black/20 ring-1 ring-white/10 transition-colors duration-300 inline-flex items-center gap-2.5"
              asChild
            >
              <Link href="/service-areas" className="flex items-center justify-center gap-2.5">
                View all service areas
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="contact">
        <ContactBlock />
      </section>

      {/* BreadcrumbList Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.upgraderoofs.co.uk' }
            ]
          })
        }}
      />

      {/* Speakable Schema · key sections for AI/voice assistants */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            '@id': 'https://www.upgraderoofs.co.uk/#webpage',
            url: 'https://www.upgraderoofs.co.uk',
            name: 'Trusted Roofers in Sandbach & Cheshire | Upgrade Roofs',
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['#entity-citation', '#hero', '#services', '#about']
            },
            isPartOf: { '@id': 'https://www.upgraderoofs.co.uk/#website' }
          })
        }}
      />
    </>
  );
}
