'use client';

import { CheckCircle, Award, Clock, Shield, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { QuoteForm } from '@/components/QuoteForm';
import { Button } from '@/components/ui/button';
import { ServiceAreaLinks } from '@/components/ServiceAreaLinks';
import { SectionHeader } from '@/components/SectionHeader';
import { HeroKicker } from '@/components/HeroKicker';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import { TrustBadgeGrid, InspectionChecklist, FinalCta } from '@/components/SpecialOfferSections';
import { useState } from 'react';

export default function TileSlateRoofingPage() {
  const [currentGalleryImage, setCurrentGalleryImage] = useState(0);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const beforeAfterImages = [
    {
      before: '/images/1.jpeg',
      after: '/images/6.jpeg',
      title: 'Complete Slate Roof Restoration',
      description: 'Historic property in Sandbach - restored to original beauty'
    },
    {
      before: '/images/3.jpeg',
      after: '/images/7.jpeg',
      title: 'Clay Tile Roof Replacement',
      description: 'Modern home in Crewe - enhanced with premium clay tiles'
    }
  ];

  const faqs = [
    {
      question: 'How long do tile and slate roofs last?',
      answer: 'With proper installation and maintenance, slate roofs can last 75-100 years, while clay and concrete tiles typically last 50-75 years. This makes them one of the most cost-effective roofing solutions long-term.'
    },
    {
      question: 'What are the benefits of tile and slate roofing?',
      answer: 'Tile and slate roofs offer exceptional durability, fire resistance, energy efficiency, and timeless aesthetic appeal. They also increase property value and require minimal maintenance when properly installed.'
    },
    {
      question: 'Can you repair individual tiles or slates?',
      answer: 'Yes, we can replace individual damaged tiles or slates without needing to replace the entire roof. We keep a stock of common materials and can source matching tiles for older properties.'
    },
    {
      question: 'Do you work on heritage and listed buildings?',
      answer: 'Absolutely. We have extensive experience working on heritage properties and listed buildings, ensuring all work meets conservation requirements while preserving the historical integrity of the structure.'
    },
    {
      question: 'What warranty do you provide?',
      answer: 'We provide a comprehensive 10-year guarantee on all workmanship, plus manufacturer warranties on materials. We also offer annual maintenance checks to ensure your roof stays in perfect condition.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="relative min-h-[300px] sm:min-h-[350px] md:min-h-[400px] lg:min-h-[500px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/6.jpeg)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-orange/20" />
        </div>

        <div className="container-custom relative z-10 px-4">
          <div className="max-w-3xl">
            <HeroKicker light className="mb-3 sm:mb-4">Premium Service</HeroKicker>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 px-2">
              Tile & Slate Roofing Cheshire
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 px-2">
              Traditional craftsmanship meets modern techniques for beautiful, long-lasting roofs
            </p>
            <div className="flex flex-col items-center sm:items-start gap-2">
              <QuoteForm
                trigger={
                  <Button
                    size="lg"
                    className="group relative bg-brand-orange hover:bg-brand-navy-light text-white font-semibold px-8 text-sm sm:text-base tracking-wide h-12 sm:h-14 rounded-lg shadow-lg shadow-black/20 ring-1 ring-white/10 transition-colors duration-300 inline-flex items-center gap-2.5"
                  >
                    Get Your Free Quote
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                }
              />
              <CtaSubMessage dark />
            </div>
          </div>
        </div>
      </section>

      <TrustBadgeGrid />

      <section className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center mb-10 sm:mb-12 md:mb-16">
            <div className="order-2 lg:order-1">
              <SectionHeader
                align="left"
                kicker="Expert Tile & Slate Installation"
                title="Expert Tile & Slate Installation"
              />
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-700 leading-relaxed">
                <p>
                  Tile and slate roofing represents the pinnacle of traditional roofing craftsmanship. With proper installation and maintenance, these beautiful roofing materials can last 50-100 years, making them an excellent long-term investment for your property.
                </p>
                <p>
                  Our experienced team specializes in both new installations and expert repairs of tile and slate roofs. We work with a wide range of materials including clay tiles, concrete tiles, natural slate, and synthetic slate alternatives. For <Link href="/roofers-sandbach" className="text-brand-orange font-semibold hover:underline">tile and slate roofing in Sandbach</Link>, we're based locally on Crewe Road and have completed hundreds of projects across CW11.
                </p>
                <p>
                  Whether you're looking to restore a historic property or add timeless elegance to a new build, our craftsmen have the skills and experience to deliver exceptional results.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 order-1 lg:order-2">
              <div className="space-y-3 sm:space-y-4">
                <div className="aspect-square overflow-hidden border border-brand-navy border-l-4 border-l-brand-orange">
                  <img
                    src="/images/6.jpeg"
                    alt="Natural clay tile roof installation on a Cheshire property by Upgrade Roofs"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 md:pt-8">
                <div className="aspect-square overflow-hidden border border-brand-navy border-l-4 border-l-brand-orange">
                  <img
                    src="/images/7.jpeg"
                    alt="Welsh slate roof restoration on a period home in Sandbach by Upgrade Roofs"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white border-l-4 border-l-brand-orange p-6 sm:p-8 md:p-12 mb-10 sm:mb-12 md:mb-16">
            <SectionHeader dark kicker="What We Do" title="What We Offer" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              {[
                'New tile and slate roof installations',
                'Roof repairs and maintenance',
                'Re-roofing and replacements',
                'Storm damage repairs',
                'Ridge and hip tile replacements',
                'Valley repairs and installations',
                'Flashing and waterproofing',
                'Heritage and conservation work',
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-brand-orange flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base break-words">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 md:gap-8">
            {[
              {
                icon: Award,
                title: '50+ Year Lifespan',
                description: 'Quality materials and expert installation ensure decades of protection',
              },
              {
                icon: Shield,
                title: 'Insurance-Backed Guarantee',
                description: 'All workmanship backed by an IBG insurance-backed guarantee',
              },
              {
                icon: Clock,
                title: 'Fast Response',
                description: 'Emergency repairs available within 24 hours',
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-brand-orange/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-brand-orange" />
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-brand-navy mb-1 sm:mb-2">{feature.title}</h4>
                  <p className="text-sm sm:text-base text-gray-600 px-2">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Before/After Gallery */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionHeader
            kicker="Our Work"
            title="Before & After Gallery"
            subtitle="See the transformation we bring to homes across Cheshire with our expert tile and slate roofing services."
          />

          <div className="relative max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">Before</h3>
                <div className="aspect-video overflow-hidden border border-brand-navy border-l-4 border-l-brand-orange">
                  <img
                    src={beforeAfterImages[currentGalleryImage].before}
                    alt="Damaged roof before restoration by Upgrade Roofs in Cheshire"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-brand-orange">After</h3>
                <div className="aspect-video overflow-hidden border border-brand-navy border-l-4 border-l-brand-orange">
                  <img
                    src={beforeAfterImages[currentGalleryImage].after}
                    alt="Completed tile roof restoration by Upgrade Roofs in Cheshire"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="text-center">
              <h4 className="text-xl font-semibold text-brand-navy mb-2">
                {beforeAfterImages[currentGalleryImage].title}
              </h4>
              <p className="text-gray-600 mb-6">
                {beforeAfterImages[currentGalleryImage].description}
              </p>

              <div className="flex justify-center gap-2">
                {beforeAfterImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentGalleryImage(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentGalleryImage 
                        ? 'bg-brand-orange scale-125' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding bg-brand-grey">
        <div className="container-custom">
          <SectionHeader
            kicker="FAQs"
            title="Frequently Asked Questions"
            subtitle="Get answers to common questions about our tile and slate roofing services."
          />

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white border border-gray-200 border-l-4 border-l-brand-navy">
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-semibold text-brand-navy">{faq.question}</h3>
                  <ChevronRight 
                    className={`w-5 h-5 text-brand-orange transition-transform duration-300 ${
                      openFAQ === index ? 'rotate-90' : ''
                    }`} 
                  />
                </button>
                {openFAQ === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <InspectionChecklist
        items={[
          'Existing roof covering, slates and tile condition',
          'Batten condition, fixings and any slipped units',
          'Ridge, hip and valley detailing for leaks',
          'Underfelt or membrane condition and breathability',
          'Best material match — slate, clay or concrete tile',
          'A written quote with photos, so you can see for yourself',
        ]}
      />

      <ServiceAreaLinks serviceName="Tile & Slate Roofing" />

      <FinalCta
        kicker="Get Started"
        title="Ready to Start Your Roofing Project?"
        subtitle="Get a free, no-obligation quote for your tile or slate roofing project"
        ctaLabel="Get Free Quote"
      />
    </div>
  );
}
