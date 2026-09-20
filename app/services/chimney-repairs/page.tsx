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
  title: 'Chimney Repairs Cheshire',
  description: 'Professional chimney repairs in Cheshire. Stack repairs, repointing, rebuilds, lead flashing. Keep your chimney safe and functional. Free quotes.',
  keywords: 'chimney repairs Cheshire, chimney repointing, chimney stack repairs, lead flashing',
};

export default function ChimneyRepairsPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative min-h-[300px] sm:min-h-[350px] md:min-h-[400px] lg:min-h-[500px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/1.jpeg)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-orange/20" />
        </div>

        <div className="container-custom relative z-10 px-4">
          <div className="max-w-3xl">
            <HeroKicker light className="mb-3 sm:mb-4">Specialist Service</HeroKicker>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 px-2">Chimney Repairs Cheshire</h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 px-2">
              Expert maintenance and repair to keep your chimney safe and functional
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
                kicker="Professional Chimney Services"
                title="Professional Chimney Services"
              />
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-700 leading-relaxed">
                <p>
                  A well-maintained chimney is essential for safety and functionality. We provide comprehensive chimney repair and maintenance services for residential and commercial properties. For <Link href="/roofers-sandbach" className="text-brand-orange font-semibold hover:underline">chimney repairs in Sandbach</Link>, we offer fast local response times and have extensive experience with older Cheshire properties.
                </p>
                <p>
                  From minor repointing to complete rebuilds, our skilled craftsmen use traditional techniques combined with modern materials for lasting results.
                </p>
              </div>
            </div>

            <div className="overflow-hidden border border-brand-navy border-l-4 border-l-brand-orange order-1 lg:order-2">
              <img
                src="/images/1.jpeg"
                alt="Professional chimney stack repointing and repair in Cheshire by Upgrade Roofs"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white border-l-4 border-l-brand-orange p-6 sm:p-8 md:p-12 mb-10 sm:mb-12 md:mb-16">
            <SectionHeader dark kicker="What We Do" title="Our Chimney Services" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              {[
                'Chimney stack repairs and rebuilds',
                'Professional repointing',
                'Lead flashing installation',
                'Chimney cowl fitting',
                'Brick replacement',
                'Weatherproofing solutions',
                'Structural assessments',
                'Emergency repairs',
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
                title: 'Expert Craftsmen',
                description: 'Skilled professionals with decades of experience',
              },
              {
                icon: Shield,
                title: 'Safety First',
                description: 'All work meets building regulations and safety standards',
              },
              {
                icon: Clock,
                title: 'Prompt Service',
                description: 'Fast response for emergency repairs',
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
          'Chimney stack condition and structural stability',
          'Mortar joints, flaunching and crown integrity',
          'Lead flashing and weathering checked for leaks',
          'Brickwork for spalling, cracks and movement',
          'Cowl, pot and bird-guard condition',
          'A written report with photos, so you can see for yourself',
        ]}
      />

      <ServiceAreaLinks serviceName="Chimney Repairs" />

      {/* FAQ Section · visible details/summary accordions + matching FAQPage JSON-LD */}
      <section className="section-padding bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: "{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"FAQPage\",\n  \"mainEntity\": [\n    {\n      \"@type\": \"Question\",\n      \"name\": \"How much do chimney repairs cost in Cheshire?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"Chimney repairs in Cheshire typically start from around £150 for minor repointing and rise to £1,500 or more for a full chimney stack rebuild. The price depends on height, access, and the extent of the damage. We provide a free, no-obligation inspection and written quote before any work begins.\"\n      }\n    },\n    {\n      \"@type\": \"Question\",\n      \"name\": \"How do I know if my chimney needs repointing or rebuilding?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"Crumbling mortar, loose or missing bricks, damp patches around the chimney breast, and leaning stacks all point to repointing or a rebuild. We inspect the flaunching, flashing, and brickwork, then recommend the most cost-effective fix · repointing where the mortar is sound, a rebuild where the stack is structurally unsafe.\"\n      }\n    },\n    {\n      \"@type\": \"Question\",\n      \"name\": \"Is your chimney repair work guaranteed?\",\n      \"acceptedAnswer\": {\n        \"@type\": \"Answer\",\n        \"text\": \"Yes. All our chimney repairs are backed by a 10-year workmanship guarantee, and we are CORC certified and £10M insured. We serve Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, and Holmes Chapel, so your chimney is covered long after the work is done.\"\n      }\n    }\n  ]\n}" }}
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
                  question: "How much do chimney repairs cost in Cheshire?",
                  answer: "Chimney repairs in Cheshire typically start from around £150 for minor repointing and rise to £1,500 or more for a full chimney stack rebuild. The price depends on height, access, and the extent of the damage. We provide a free, no-obligation inspection and written quote before any work begins.",
                },
                {
                  question: "How do I know if my chimney needs repointing or rebuilding?",
                  answer: "Crumbling mortar, loose or missing bricks, damp patches around the chimney breast, and leaning stacks all point to repointing or a rebuild. We inspect the flaunching, flashing, and brickwork, then recommend the most cost-effective fix · repointing where the mortar is sound, a rebuild where the stack is structurally unsafe.",
                },
                {
                  question: "Is your chimney repair work guaranteed?",
                  answer: "Yes. All our chimney repairs are backed by a 10-year workmanship guarantee, and we are CORC certified and £10M insured. We serve Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, and Holmes Chapel, so your chimney is covered long after the work is done.",
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
        title="Need Chimney Repairs in Cheshire?"
        subtitle="Contact us for a free inspection and quote"
        ctaLabel="Get Free Quote"
      />
    </div>
  );
}
