import type { Metadata } from 'next';
import { CheckCircle, Award, Clock, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { QuoteForm } from '@/components/QuoteForm';
import { Button } from '@/components/ui/button';
import { ServiceAreaLinks } from '@/components/ServiceAreaLinks';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { SectionHeader } from '@/components/SectionHeader';
import { HeroKicker } from '@/components/HeroKicker';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import { TrustBadgeGrid, InspectionChecklist, FinalCta } from '@/components/SpecialOfferSections';

export const metadata: Metadata = {
  title: 'Flat Roofing Cheshire | EPDM & GRP',
  description: 'Expert flat roofing in Cheshire. EPDM rubber, GRP fibreglass, felt roofing. 20-year warranty. Perfect for extensions, garages, commercial properties.',
  keywords: 'flat roofing Cheshire, EPDM roofing, GRP fibreglass, flat roof repairs',
};

export default function FlatRoofingPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative min-h-[300px] sm:min-h-[350px] md:min-h-[400px] lg:min-h-[500px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/3.jpeg)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-orange/20" />
        </div>

        <div className="container-custom relative z-10 px-4">
          <div className="max-w-3xl">
            <HeroKicker light className="mb-3 sm:mb-4">Modern Solutions</HeroKicker>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 px-2">Flat Roofing Cheshire</h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 px-2">
              Superior waterproofing with modern materials and expert installation
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
              <div className="prose prose-lg max-w-none">
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4 sm:mb-6">
                  Whether you need a new flat roof for your extension, garage, or commercial property, we deliver reliable, long-lasting solutions using the latest materials and techniques. For homeowners looking for <Link href="/roofers-sandbach" className="text-brand-orange font-semibold hover:underline">flat roof specialists in Sandbach</Link>, we're based on Crewe Road and serve all CW11 areas.
                </p>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  From EPDM rubber systems to GRP fibreglass, our experienced team ensures your flat roof is watertight and built to last.
                </p>
              </div>
            </div>

            <div className="overflow-hidden border border-brand-navy border-l-4 border-l-brand-orange order-1 lg:order-2">
              <img
                src="/images/3.jpeg"
                alt="EPDM rubber flat roof installation on a garage extension in Cheshire by Upgrade Roofs"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white border-l-4 border-l-brand-orange p-6 sm:p-8 md:p-12 mb-10 sm:mb-12 md:mb-16">
            <SectionHeader dark kicker="What We Do" title="Our Flat Roofing Services" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              {[
                'EPDM rubber roofing systems',
                'GRP fibreglass installation',
                'Traditional felt roofing',
                'Flat roof repairs and maintenance',
                'Re-roofing and replacements',
                'Waterproofing solutions',
                'Commercial flat roofing',
                'Emergency leak repairs',
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
                title: '20-Year Warranty',
                description: 'Comprehensive warranty on all flat roofing installations',
              },
              {
                icon: Shield,
                title: 'Superior Waterproofing',
                description: 'Advanced materials for complete weather protection',
              },
              {
                icon: Clock,
                title: 'Fast Installation',
                description: 'Efficient installation with minimal disruption',
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

      <InspectionChecklist
        items={[
          'Existing flat roof covering, seams and flashings',
          'Ponding areas and drainage outlet condition',
          'Deck integrity and any soft or sagging spots',
          'Best membrane choice — EPDM, GRP or felt',
          'Insulation and upstand detailing',
          'A written report with photos, so you can see for yourself',
        ]}
      />

      <ServiceAreaLinks serviceName="Flat Roofing" />

      {/* FAQ Section · visible details/summary accordions + matching FAQPage JSON-LD */}
      <section className="section-padding bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: "{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"FAQPage\",\n  \"mainEntity\": [\n    {\n      \"@type\": \"Question\",\n      \"name\": \"How much does a flat roof cost in Cheshire?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"Flat roof costs in Cheshire typically range from £800 to £2,000 depending on size, access, and the membrane you choose. EPDM rubber and GRP fibreglass are long-lasting options; felt is the most budget-friendly. We provide a free, itemised written quote so you know the exact cost before any work starts.\"\n      }\n    },\n    {\n      \"@type\": \"Question\",\n      \"name\": \"Which flat roof material lasts the longest?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"GRP fibreglass and EPDM rubber are the most durable flat roof materials, both routinely lasting 25 to 30 years or more. Felt roofs are cheaper up front but generally last 10 to 15 years. We recommend EPDM or GRP for extensions, garages, and commercial buildings across Cheshire.\"\n      }\n    },\n    {\n      \"@type\": \"Question\",\n      \"name\": \"What guarantee do you offer on flat roofing work?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"Every flat roof we install is covered by a 20-year waterproof warranty on the membrane plus a 10-year workmanship guarantee. As a CORC certified, £10M insured roofer, we also offer Insurance Backed Guarantees for full peace of mind throughout Sandbach, Crewe, and wider Cheshire.\"\n      }\n    }\n  ]\n}" }}
        />
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <SectionHeader
              kicker="FAQs"
              title="Frequently Asked Questions"
              subtitle="Answers to common questions about our service across Cheshire."
            />
            <div className="space-y-3 sm:space-y-4">
              {[
                {
                  question: "How much does a flat roof cost in Cheshire?",
                  answer: "Flat roof costs in Cheshire typically range from £800 to £2,000 depending on size, access, and the membrane you choose. EPDM rubber and GRP fibreglass are long-lasting options; felt is the most budget-friendly. We provide a free, itemised written quote so you know the exact cost before any work starts.",
                },
                {
                  question: "Which flat roof material lasts the longest?",
                  answer: "GRP fibreglass and EPDM rubber are the most durable flat roof materials, both routinely lasting 25 to 30 years or more. Felt roofs are cheaper up front but generally last 10 to 15 years. We recommend EPDM or GRP for extensions, garages, and commercial buildings across Cheshire.",
                },
                {
                  question: "What guarantee do you offer on flat roofing work?",
                  answer: "Every flat roof we install is covered by a 20-year waterproof warranty on the membrane plus a 10-year workmanship guarantee. As a CORC certified, £10M insured roofer, we also offer Insurance Backed Guarantees for full peace of mind throughout Sandbach, Crewe, and wider Cheshire.",
                },
              ].map((faq, index) => (
                <details
                  key={index}
                  className="group bg-white border border-gray-200 border-l-4 border-l-brand-navy overflow-hidden hover:border-brand-orange/50 transition-colors"
                  open={index === 0}
                >
                  <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4">
                    <span className="font-semibold text-brand-navy text-base group-hover:text-brand-orange transition-colors text-left pr-2">
                      {faq.question}
                    </span>
                    <CheckCircle className="w-5 h-5 text-brand-orange flex-shrink-0 transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </details>
              ))}
            </div>
            <div className="mt-8 text-center">
              <TrackedPhoneLink
                placement="faq_section"
                prefix="Still have questions? Call Us: "
                className="inline-flex items-center justify-center px-6 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-lg transition-colors text-sm"
              />
              <CtaSubMessage className="mt-3" />
            </div>
          </div>
        </div>
      </section>



      <FinalCta
        kicker="Get Started"
        title="Ready to Start Your Flat Roofing Project?"
        subtitle="Get a free, no-obligation quote for your flat roofing project in Cheshire"
        ctaLabel="Get Free Quote"
      />
    </div>
  );
}
