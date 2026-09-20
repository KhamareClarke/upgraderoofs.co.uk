/**
 * fix-remaining-service-faqs.ts
 *
 * AEO completion patch for the 5 remaining service subpages that lack FAQ
 * parity. For each service, this script:
 *
 *   1. Injects a self-contained <section> after the <ServiceAreaLinks /> line
 *      that renders three visible <details>/<summary> accordions AND emits a
 *      matching FAQPage JSON-LD block (1:1 with the visible text).
 *   2. Adds the `TrackedPhoneLink` import when not already present.
 *
 * The FAQ section it emits ends in a `<TrackedPhoneLink>` that carries NO href
 * and NO number in its children, and puts "Call Us: " in `prefix` instead. That
 * is deliberate and load-bearing: the component renders the live number itself,
 * so Google's call-tracking number swap can reach it. A hardcoded href or a
 * number typed as children would look correct and silently dial the real line
 * on every ad visit. If you edit the template below, keep it that way.
 *
 * The three Q&As per page cover costs, durability/materials, and guarantees —
 * all written with local (Cheshire) intent to maximise answer-engine capture.
 *
 * Targeted files (correct on-disk paths under app/services/):
 *   - flat-roofing
 *   - chimney-repairs
 *   - gutters-fascias
 *   - skylights-roof-windows
 *   - cladding
 *
 * NOTE: The user's original prompt referenced bare app/<slug>/page.tsx paths.
 * The real files live under app/services/<slug>/page.tsx (bare paths are redirect
 * stubs or do not exist). This script targets the app/services/ locations.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

interface ServiceFAQ {
  slug: string;
  serviceNameLine: string;
  faqs: { question: string; answer: string }[];
}

const PHONE_LINK_IMPORT =
  "import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';";

const SERVICES: ServiceFAQ[] = [
  {
    slug: 'flat-roofing',
    serviceNameLine: '<ServiceAreaLinks serviceName="Flat Roofing" />',
    faqs: [
      {
        question: 'How much does a flat roof cost in Cheshire?',
        answer:
          'Flat roof costs in Cheshire typically range from £800 to £2,000 depending on size, access, and the membrane you choose. EPDM rubber and GRP fibreglass are long-lasting options; felt is the most budget-friendly. We provide a free, itemised written quote so you know the exact cost before any work starts.',
      },
      {
        question: 'Which flat roof material lasts the longest?',
        answer:
          'GRP fibreglass and EPDM rubber are the most durable flat roof materials, both routinely lasting 25 to 30 years or more. Felt roofs are cheaper up front but generally last 10 to 15 years. We recommend EPDM or GRP for extensions, garages, and commercial buildings across Cheshire.',
      },
      {
        question: 'What guarantee do you offer on flat roofing work?',
        answer:
          'Every flat roof we install is covered by a 20-year waterproof warranty on the membrane plus a 10-year workmanship guarantee. As a CORC certified, £10M insured roofer, we also offer Insurance Backed Guarantees for full peace of mind throughout Sandbach, Crewe, and wider Cheshire.',
      },
    ],
  },
  {
    slug: 'chimney-repairs',
    serviceNameLine: '<ServiceAreaLinks serviceName="Chimney Repairs" />',
    faqs: [
      {
        question: 'How much do chimney repairs cost in Cheshire?',
        answer:
          'Chimney repairs in Cheshire typically start from around £150 for minor repointing and rise to £1,500 or more for a full chimney stack rebuild. The price depends on height, access, and the extent of the damage. We provide a free, no-obligation inspection and written quote before any work begins.',
      },
      {
        question: 'How do I know if my chimney needs repointing or rebuilding?',
        answer:
          'Crumbling mortar, loose or missing bricks, damp patches around the chimney breast, and leaning stacks all point to repointing or a rebuild. We inspect the flaunching, flashing, and brickwork, then recommend the most cost-effective fix — repointing where the mortar is sound, a rebuild where the stack is structurally unsafe.',
      },
      {
        question: 'Is your chimney repair work guaranteed?',
        answer:
          'Yes. All our chimney repairs are backed by a 10-year workmanship guarantee, and we are CORC certified and £10M insured. We serve Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, and Holmes Chapel, so your chimney is covered long after the work is done.',
      },
    ],
  },
  {
    slug: 'gutters-fascias',
    serviceNameLine: '<ServiceAreaLinks serviceName="Gutters & Fascias" />',
    faqs: [
      {
        question: 'How much do new guttering and fascias cost in Cheshire?',
        answer:
          'New uPVC guttering and fascias for a typical Cheshire semi-detached home usually cost between £800 and £2,500 including removal of the old system and disposal. The final price depends on the run length, height, and whether you choose uPVC, cast iron, or aluminium. We offer free written quotes with no hidden costs.',
      },
      {
        question: 'Which gutter and fascia material lasts the longest?',
        answer:
          "Aluminium and cast iron are the most durable, lasting 30 years or more, while uPVC is the most cost-effective and typically lasts 20 to 25 years with minimal maintenance. We'll advise on the best material for your property's age, style, and budget across Cheshire.",
      },
      {
        question: 'Are your gutter and fascia installations guaranteed?',
        answer:
          'All our gutter and fascia installations carry a 10-year workmanship guarantee, with manufacturer warranties on the materials. We are CORC certified and £10M insured, covering Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, and Holmes Chapel.',
      },
    ],
  },
  {
    slug: 'skylights-roof-windows',
    serviceNameLine: '<ServiceAreaLinks serviceName="Skylights & Roof Windows" />',
    faqs: [
      {
        question: 'How much does skylight installation cost in Cheshire?',
        answer:
          'Skylight and roof window installation in Cheshire typically ranges from £700 to £2,500 per unit, including the window and full waterproof flashing. VELUX windows cost more than budget alternatives but last longer and hold their value. We provide a free, itemised quote so there are no surprises.',
      },
      {
        question: 'Will my new skylight leak?',
        answer:
          'No — as VELUX approved installers we fit fully watertight manufacturer flashing kits as standard, and every installation is weatherproofed and tested before we leave. Correct flashing is the single most important factor in preventing leaks, and it is included in every quote.',
      },
      {
        question: 'What warranty do you offer on skylight installation?',
        answer:
          "Every skylight and roof window installation is backed by a 10-year workmanship guarantee, on top of VELUX's own manufacturer warranty on the unit. We are CORC certified and £10M insured, serving Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, and Holmes Chapel.",
      },
    ],
  },
  {
    slug: 'cladding',
    serviceNameLine: '<ServiceAreaLinks serviceName="Cladding" />',
    faqs: [
      {
        question: 'How much does exterior cladding cost in Cheshire?',
        answer:
          'Exterior cladding in Cheshire typically costs between £60 and £120 per square metre supplied and fitted, depending on whether you choose timber, composite, or metal. A full house front often totals £3,000 to £8,000. We provide a free, itemised written quote tailored to your property.',
      },
      {
        question: 'Which cladding material lasts the longest?',
        answer:
          "Metal and composite cladding are the most durable, lasting 30 to 40 years with minimal upkeep. Timber cladding looks classic but needs periodic treatment, typically lasting 25 to 30 years when well maintained. We'll recommend the right material for your home's style and exposure across Cheshire.",
      },
      {
        question: 'Is your cladding installation guaranteed?',
        answer:
          'Yes. All our cladding installations are covered by a 10-year workmanship guarantee, with manufacturer warranties on the materials. As a CORC certified, £10M insured contractor, we cover Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, and Holmes Chapel.',
      },
    ],
  },
];

function buildFaqSection(faqs: { question: string; answer: string }[]): string {
  const faqJson = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
    null,
    2,
  );

  const faqItems = faqs
    .map(
      (faq) => `                {
                  question: ${JSON.stringify(faq.question)},
                  answer: ${JSON.stringify(faq.answer)},
                },`,
    )
    .join('\n');

  return `      {/* FAQ Section — visible details/summary accordions + matching FAQPage JSON-LD */}
      <section className="section-padding bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ${JSON.stringify(faqJson)} }}
        />
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-navy mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600">
                Answers to common questions about our service across Cheshire.
              </p>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {[
${faqItems}
              ].map((faq, index) => (
                <details
                  key={index}
                  className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-brand-orange/50 transition-colors"
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
              <p className="text-sm text-gray-600 mb-3">Still have questions?</p>
              <TrackedPhoneLink
                placement="faq_section"
                prefix="Call Us: "
                className="inline-flex items-center justify-center px-6 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-lg transition-colors text-sm"
              />
            </div>
          </div>
        </div>
      </section>

`;
}

let completed = 0;
for (const service of SERVICES) {
  const pagePath = resolve(ROOT, 'app', 'services', service.slug, 'page.tsx');
  let source = readFileSync(pagePath, 'utf8');

  if (!source.includes(service.serviceNameLine)) {
    throw new Error(
      `Anchor not found in ${pagePath}: ${service.serviceNameLine}`,
    );
  }

  if (source.includes('Frequently Asked Questions')) {
    console.log(`[skip] ${service.slug} already has an FAQ section`);
    continue;
  }

  // 1. Add TrackedPhoneLink import if missing.
  if (!source.includes(PHONE_LINK_IMPORT)) {
    source = source.replace(
      "import { ServiceAreaLinks } from '@/components/ServiceAreaLinks';",
      `import { ServiceAreaLinks } from '@/components/ServiceAreaLinks';\n${PHONE_LINK_IMPORT}`,
    );
  }

  // 2. Inject FAQ section immediately after the ServiceAreaLinks line.
  const faqSection = buildFaqSection(service.faqs);
  source = source.replace(
    service.serviceNameLine,
    `${service.serviceNameLine}\n\n${faqSection}`,
  );

  writeFileSync(pagePath, source, 'utf8');
  completed += 1;
  console.log(`[patched] ${service.slug} — added 3 Q&As + FAQPage JSON-LD`);
}

console.log(`\nDone. Patched ${completed}/${SERVICES.length} service pages.`);
