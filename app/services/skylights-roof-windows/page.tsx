import type { Metadata } from 'next';
import { CheckCircle, Award, Clock, Shield } from 'lucide-react';
import { ServiceLeadForm } from '@/components/ServiceLeadForm';
import { ServiceAreaLinks } from '@/components/ServiceAreaLinks';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { SectionHeader } from '@/components/SectionHeader';
import { HeroKicker } from '@/components/HeroKicker';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import { TrustBadgeGrid, InspectionChecklist, FinalCta } from '@/components/SpecialOfferSections';

export const metadata: Metadata = {
  title: 'Skylights & Roof Windows Cheshire | VELUX Installation',
  description: 'Professional skylight and roof window installation in Cheshire. VELUX approved installers. Bring natural light into your home. Free quotes.',
  keywords: 'skylights Cheshire, roof windows, VELUX windows, skylight installation',
};

export default function SkylightsRoofWindowsPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative h-[300px] sm:h-[350px] md:h-[400px] lg:h-[500px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/10.jpeg)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-orange/20" />
        </div>

        <div className="container-custom relative z-10 px-4">
          <div className="max-w-3xl">
            <HeroKicker light className="mb-3 sm:mb-4">Natural Light</HeroKicker>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 px-2">Skylights & Roof Windows Cheshire</h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 px-2">
              Transform your home with natural light and expert installation
            </p>
            <div className="flex flex-col items-center sm:items-start gap-2">
              <ServiceLeadForm serviceName="Skylights & Roof Windows" />
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
                kicker="Expert Skylight Installation"
                title="Expert Skylight Installation"
              />
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-700 leading-relaxed">
                <p>
                  Skylights and roof windows are an excellent way to bring natural light into your home while adding value and improving energy efficiency.
                </p>
                <p>
                  As VELUX approved installers, we ensure perfect fitting, complete weatherproofing, and expert advice on the best solutions for your property.
                </p>
              </div>
            </div>

            <div className="overflow-hidden border border-brand-navy border-l-4 border-l-brand-orange order-1 lg:order-2">
              <img
                src="/images/10.jpeg"
                alt="VELUX skylight installation in a Cheshire loft conversion by Upgrade Roofs"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white border-l-4 border-l-brand-orange p-6 sm:p-8 md:p-12 mb-10 sm:mb-12 md:mb-16">
            <SectionHeader dark kicker="What We Do" title="Our Skylight Services" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              {[
                'VELUX window installation',
                'Flat roof skylights',
                'Electric and manual options',
                'Pitched roof windows',
                'Perfect weatherproofing',
                'Energy efficient glazing',
                'Blind and shade installation',
                'Repairs and maintenance',
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
                title: 'VELUX Approved',
                description: 'Certified installers with full manufacturer backing',
              },
              {
                icon: Shield,
                title: 'Perfect Sealing',
                description: 'Guaranteed weatherproof installation',
              },
              {
                icon: Clock,
                title: 'Energy Efficient',
                description: 'Reduce heating costs with modern glazing',
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
          'Existing roof structure and suitable window position',
          'Roof pitch, rafter spacing and opening size',
          'Best unit choice — VELUX fixed, hinged or flat-roof',
          'Flashing kit matched to your roof covering',
          'Suitable blinds, ventilation and glazing options',
          'A written quote with photos, so you can see for yourself',
        ]}
      />

      <ServiceAreaLinks serviceName="Skylights & Roof Windows" />

      {/* FAQ Section · visible details/summary accordions + matching FAQPage JSON-LD */}
      <section className="section-padding bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: "{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"FAQPage\",\n  \"mainEntity\": [\n    {\n      \"@type\": \"Question\",\n      \"name\": \"How much does skylight installation cost in Cheshire?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"Skylight and roof window installation in Cheshire typically ranges from £700 to £2,500 per unit, including the window and full waterproof flashing. VELUX windows cost more than budget alternatives but last longer and hold their value. We provide a free, itemised quote so there are no surprises.\"\n      }\n    },\n    {\n      \"@type\": \"Question\",\n      \"name\": \"Will my new skylight leak?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"No · as VELUX approved installers we fit fully watertight manufacturer flashing kits as standard, and every installation is weatherproofed and tested before we leave. Correct flashing is the single most important factor in preventing leaks, and it is included in every quote.\"\n      }\n    },\n    {\n      \"@type\": \"Question\",\n      \"name\": \"What warranty do you offer on skylight installation?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"Every skylight and roof window installation is backed by a 10-year workmanship guarantee, on top of VELUX's own manufacturer warranty on the unit. We are CORC certified and £10M insured, serving Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, and Holmes Chapel.\"\n      }\n    }\n  ]\n}" }}
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
                  question: "How much does skylight installation cost in Cheshire?",
                  answer: "Skylight and roof window installation in Cheshire typically ranges from £700 to £2,500 per unit, including the window and full waterproof flashing. VELUX windows cost more than budget alternatives but last longer and hold their value. We provide a free, itemised quote so there are no surprises.",
                },
                {
                  question: "Will my new skylight leak?",
                  answer: "No · as VELUX approved installers we fit fully watertight manufacturer flashing kits as standard, and every installation is weatherproofed and tested before we leave. Correct flashing is the single most important factor in preventing leaks, and it is included in every quote.",
                },
                {
                  question: "What warranty do you offer on skylight installation?",
                  answer: "Every skylight and roof window installation is backed by a 10-year workmanship guarantee, on top of VELUX's own manufacturer warranty on the unit. We are CORC certified and £10M insured, serving Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, and Holmes Chapel.",
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
                href="tel:01270897606"
                placement="faq_section"
                className="inline-flex items-center justify-center px-6 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Still have questions? Call Us: 01270 897 606
              </TrackedPhoneLink>
              <CtaSubMessage className="mt-3" />
            </div>
          </div>
        </div>
      </section>



      <FinalCta
        kicker="Get Started"
        title="Ready to Add Natural Light?"
        subtitle="Get a free quote for your skylight or roof window project in Cheshire"
        ctaLabel="Get Free Quote"
      />
    </div>
  );
}
