import type { Metadata } from 'next';
import { CheckCircle, Award, Clock, Shield, ArrowRight } from 'lucide-react';
import { QuoteForm } from '@/components/QuoteForm';
import { Button } from '@/components/ui/button';
import { ServiceAreaLinks } from '@/components/ServiceAreaLinks';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { SectionHeader } from '@/components/SectionHeader';
import { HeroKicker } from '@/components/HeroKicker';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import { TrustBadgeGrid, InspectionChecklist, FinalCta } from '@/components/SpecialOfferSections';

export const metadata: Metadata = {
  title: 'Gutters & Fascias Cheshire',
  description: 'Professional gutter and fascia services in Cheshire. uPVC systems, cast iron gutters, repairs, replacements. Protect your property from water damage.',
  keywords: 'gutters Cheshire, fascia boards, gutter installation, gutter repairs, uPVC gutters',
};

export default function GuttersFasciasPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative min-h-[300px] sm:min-h-[350px] md:min-h-[400px] lg:min-h-[500px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/2.jpeg)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-orange/20" />
        </div>

        <div className="container-custom relative z-10 px-4">
          <div className="max-w-3xl">
            <HeroKicker light className="mb-3 sm:mb-4">Essential Protection</HeroKicker>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 px-2">Gutters & Fascias Cheshire</h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 px-2">
              Protect your property from water damage with quality materials
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
                kicker="Complete Gutter Solutions"
                title="Complete Gutter Solutions"
              />
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-700 leading-relaxed">
                <p>
                  Properly functioning gutters and fascias are crucial for protecting your property from water damage. We provide complete installation, repair, and maintenance services.
                </p>
                <p>
                  From modern uPVC systems to traditional cast iron gutters, we work with all materials and styles to match your property perfectly.
                </p>
              </div>
            </div>

            <div className="overflow-hidden border border-brand-navy border-l-4 border-l-brand-orange order-1 lg:order-2">
              <img
                src="/images/2.jpeg"
                alt="uPVC gutter and fascia installation on a Cheshire home by Upgrade Roofs"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white border-l-4 border-l-brand-orange p-6 sm:p-8 md:p-12 mb-10 sm:mb-12 md:mb-16">
            <SectionHeader dark kicker="What We Do" title="Our Gutter & Fascia Services" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              {[
                'uPVC gutter systems',
                'Cast iron gutter installation',
                'Fascia board replacement',
                'Soffit installation',
                'Gutter cleaning and maintenance',
                'Leaf guard installation',
                'Downpipe repairs',
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
                title: 'Quality Materials',
                description: 'Premium uPVC and cast iron systems built to last',
              },
              {
                icon: Shield,
                title: 'Weatherproof',
                description: 'Complete protection from water damage',
              },
              {
                icon: Clock,
                title: 'Quick Installation',
                description: 'Efficient fitting with minimal disruption',
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
          'Existing gutters, joints and downpipes for leaks',
          'Fascia and soffit boards for rot, cracks or discolouration',
          'Falls and drainage so water flows to every downpipe',
          'Bracket fixings and general security of the run',
          'Best material choice — uPVC, cast iron or aluminium',
          'A written report with photos, so you can see for yourself',
        ]}
      />

      <ServiceAreaLinks serviceName="Gutters & Fascias" />

      {/* FAQ Section · visible details/summary accordions + matching FAQPage JSON-LD */}
      <section className="section-padding bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: "{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"FAQPage\",\n  \"mainEntity\": [\n    {\n      \"@type\": \"Question\",\n      \"name\": \"How much do new guttering and fascias cost in Cheshire?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"New uPVC guttering and fascias for a typical Cheshire semi-detached home usually cost between £800 and £2,500 including removal of the old system and disposal. The final price depends on the run length, height, and whether you choose uPVC, cast iron, or aluminium. We offer free written quotes with no hidden costs.\"\n      }\n    },\n    {\n      \"@type\": \"Question\",\n      \"name\": \"Which gutter and fascia material lasts the longest?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"Aluminium and cast iron are the most durable, lasting 30 years or more, while uPVC is the most cost-effective and typically lasts 20 to 25 years with minimal maintenance. We'll advise on the best material for your property's age, style, and budget across Cheshire.\"\n      }\n    },\n    {\n      \"@type\": \"Question\",\n      \"name\": \"Are your gutter and fascia installations guaranteed?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"All our gutter and fascia installations carry a 10-year workmanship guarantee, with manufacturer warranties on the materials. We are CORC certified and £10M insured, covering Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, and Holmes Chapel.\"\n      }\n    }\n  ]\n}" }}
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
                  question: "How much do new guttering and fascias cost in Cheshire?",
                  answer: "New uPVC guttering and fascias for a typical Cheshire semi-detached home usually cost between £800 and £2,500 including removal of the old system and disposal. The final price depends on the run length, height, and whether you choose uPVC, cast iron, or aluminium. We offer free written quotes with no hidden costs.",
                },
                {
                  question: "Which gutter and fascia material lasts the longest?",
                  answer: "Aluminium and cast iron are the most durable, lasting 30 years or more, while uPVC is the most cost-effective and typically lasts 20 to 25 years with minimal maintenance. We'll advise on the best material for your property's age, style, and budget across Cheshire.",
                },
                {
                  question: "Are your gutter and fascia installations guaranteed?",
                  answer: "All our gutter and fascia installations carry a 10-year workmanship guarantee, with manufacturer warranties on the materials. We are CORC certified and £10M insured, covering Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, and Holmes Chapel.",
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
        title="Need New Gutters or Fascias in Cheshire?"
        subtitle="Get a free quote for your gutter and fascia project"
        ctaLabel="Get Free Quote"
      />
    </div>
  );
}
