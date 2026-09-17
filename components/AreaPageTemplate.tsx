import Link from 'next/link';
import { MobileContactBar } from '@/components/MobileContactBar';
import { MapPin, ArrowRight } from 'lucide-react';
import { FaqAccordion, type FaqAccordionItem } from '@/components/FaqAccordion';
import { ReviewsSection } from '@/components/ReviewsSection';
import { AreaHero } from '@/components/AreaHero';
import { Services } from '@/components/Services';
import {
  TrustBadgeGrid,
  InspectionChecklist,
  FinalCta,
  ServiceAreaHub,
} from '@/components/SpecialOfferSections';
import { orderAreaLinks } from '@/lib/service-areas';

interface AreaFAQ {
  q: string;
  a: string;
}

interface CommonProblem {
  problem: string;
  solution: string;
}

interface CaseStudy {
  title: string;
  service: string;
  location: string;
  issue: string;
  solution: string;
  result: string;
  href: string;
  serviceLabel: string;
}

interface AreaPageProps {
  town: string;
  /**
   * Rendered inside the coverage answer, not as a fact panel — see the comment
   * on the coverage question below.
   */
  postcode: string;
  /**
   * Accepted but not rendered — the hero carries no paragraph (see AreaHero).
   * Kept on the type so the per-town `intro` copy in lib/town-data.ts stays
   * reachable for reuse rather than being deleted from the data source.
   */
  intro?: string;
  localContext: string;
  roofingChallenges: string;
  landmarks?: string[];
  propertyTypes?: string[];
  commonProblems?: CommonProblem[];
  proofPoint?: string;
  ctaLine?: string;
  faqs: AreaFAQ[];
  nearbyAreas: { name: string; href: string }[];
  localProse?: string[];
  caseStudies?: CaseStudy[];
  /** Overrides the default `Roofers in <town>` H1 — see AreaHero. */
  heading?: React.ReactNode;
  /** Overrides the default `Free Roof Inspection · <town>` kicker. */
  kicker?: string;
}

/**
 * Shared template for every /roofers-<town> page.
 *
 * Section order, components and styling deliberately mirror the special-offer
 * page: Hero → TrustBadgeGrid → Services (navy) → InspectionChecklist → FinalCta
 * → ReviewsSection → FAQ → ServiceAreaHub.
 *
 * The town-only content (local guide, common problems, local facts, case studies)
 * has no counterpart on the offer page, so it lives inside the FAQ section as
 * groups within the one question-and-answer list rather than as sections of its
 * own. That keeps the offer page's skeleton intact and keeps every question on
 * the page in one place.
 */
export function AreaPageTemplate({
  town, postcode, localContext,
  roofingChallenges, landmarks, propertyTypes, commonProblems, proofPoint, ctaLine,
  faqs, nearbyAreas, localProse, caseStudies, heading, kicker,
}: AreaPageProps) {
  // Migrate long-form local prose into structured FAQ items so the page body
  // carries no redundant text duplication (directive #2). These derived FAQs
  // also flow into the FAQPage JSON-LD below.
  //
  // `roofingChallenges`, `landmarks` and `propertyTypes` are rendered *only*
  // here, inside the FAQs — showing them again as body copy would duplicate the
  // same sentences twice on one page.
  const allFaqs: AreaFAQ[] = [...faqs];

  if (propertyTypes && propertyTypes.length > 0) {
    allFaqs.push({
      q: `What types of roofs do you work on in ${town}?`,
      a: `We cover every property type in ${town}, including ${propertyTypes.join(', ').toLowerCase()}.`,
    });
  }

  if (roofingChallenges) {
    allFaqs.push({
      q: `How do local weather conditions affect roofs in ${town}?`,
      a: `${roofingChallenges}`,
    });
  }

  if (landmarks && landmarks.length > 0) {
    allFaqs.push({
      q: `Which parts of ${town} do you cover?`,
      // The postcode rides here rather than in a separate fact panel: every
      // town's own FAQs already answer distance and response time in prose, so a
      // table repeating those figures was a second answer to the same question.
      a: `We cover the whole of ${town} and the surrounding area, including ${landmarks.join(', ')} — the ${postcode} postcode area.`,
    });
  }

  allFaqs.push({
    q: 'Are you insured and guaranteed?',
    a: 'Yes. Upgrade Roofs is CORC certified and holds £10 million public liability insurance. Every job is covered by a 10-year workmanship guarantee. We are based at 20 Crewe Road, Sandbach CW11 4NE, and cover Cheshire and the surrounding area.',
  });

  // Nothing is asked twice. Every question on the page funnels through this one
  // list, so where a town's own FAQ and a derived question cover the same ground
  // the repeat is dropped rather than shown as two near-identical rows.
  const asked = new Set<string>();
  const uniqueFaqs = allFaqs.filter((faq) => {
    const key = faq.q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (asked.has(key)) return false;
    asked.add(key);
    return true;
  });

  const selfHref = `/roofers-${town.toLowerCase().replace(/\s+/g, '-')}`;
  const prose = localProse && localProse.length > 0 ? localProse : [localContext];

  // Local proof. One question, and only where the town has a real proof point —
  // "We have completed over 50 roofing projects in CW1 and CW2" is the kind of
  // line a reader cannot get anywhere else on the page.
  //
  // There is deliberately no companion table of postcode, distance and response
  // time: all fifteen towns already answer those in their own FAQs above, so it
  // was the same answer twice. The postcode is carried by the coverage question.
  const proofItems = proofPoint
    ? [{
        q: `Why do ${town} homeowners choose Upgrade Roofs?`,
        a: (
          <>
            <p>{proofPoint}</p>
            <p className="mt-3">
              Every job carries a 10-year workmanship guarantee, backed by our IBG protection scheme.
            </p>
          </>
        ),
      }]
    : [];

  // Everything the page has to say, in the one question-and-answer list. The
  // local guide used to be four separate sections above the FAQ, each with its
  // own heading and background colour; they are groups in this list now, and
  // each keeps a sub-heading so its keyword phrase stays in the outline.
  const groups: { label: React.ReactNode; note?: string; items: FaqAccordionItem[] }[] = [
    {
      label: <>Roofing in <span className="text-brand-orange">{town}</span></>,
      items: [
        {
          q: `What should I know about roofing in ${town}?`,
          a: (
            <>
              {prose.map((paragraph, i) => (
                <p key={i} className={i > 0 ? 'mt-3' : ''}>{paragraph}</p>
              ))}
            </>
          ),
        },
      ],
    },
    ...(commonProblems && commonProblems.length > 0
      ? [{
          label: <>Common Roofing Problems in {town}</>,
          // The stored `problem` is a noun phrase ("Slate deterioration on
          // Victorian properties"), so it is wrapped in a question frame rather
          // than shown raw or shouted as a heading.
          items: commonProblems.map((cp) => ({
            q: `How do you handle ${cp.problem.charAt(0).toLowerCase()}${cp.problem.slice(1)}?`,
            a: cp.solution,
          })),
        }]
      : []),
    ...(proofItems.length > 0
      ? [{
          label: <>Roofing Experts Who Know <span className="text-brand-orange">{town}</span></>,
          items: proofItems,
        }]
      : []),
    ...(caseStudies && caseStudies.length > 0
      ? [{
          label: <>Recent Roofing Projects in <span className="text-brand-orange">{town}</span></>,
          note: "Real jobs we've completed for local homeowners. Every project backed by our 10-year guarantee.",
          items: caseStudies.map((study) => ({
            q: study.title,
            a: (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-brand-orange/10 text-brand-orange font-semibold text-sm rounded-full">{study.service}</span>
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5" /> {study.location}
                  </span>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-brand-navy uppercase tracking-wide mb-1">The Problem</p>
                    <p className="leading-relaxed">{study.issue}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-navy uppercase tracking-wide mb-1">What We Did</p>
                    <p className="leading-relaxed">{study.solution}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-navy uppercase tracking-wide mb-1">The Result</p>
                    <p className="leading-relaxed">{study.result}</p>
                  </div>
                </div>
                <Link href={study.href} className="text-brand-orange font-semibold text-sm hover:underline inline-flex items-center gap-1 mt-4">
                  Learn more about our {study.serviceLabel} service <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ),
          })),
        }]
      : []),
    {
      // The town's own questions, unlabelled: they follow on from the groups above.
      label: null,
      items: uniqueFaqs.map((faq) => ({ q: faq.q, a: faq.a })),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Hero + LeadFormWizard */}
      <AreaHero town={town} heading={heading} kicker={kicker} />

      {/* 2. Trust Badge Grid */}
      <TrustBadgeGrid />

      {/* 3. Services — navy block, same component and treatment as the offer page,
          `cardsOpenForm` included: clicking a card opens the quote modal instead
          of navigating away.

          This is a deliberate trade. The cards used to be six internal links to
          the service pages, which is why this was originally left off. With
          `cardsOpenForm` each town page carries six /services/ links rather than
          twelve — the footer link to each service page is now the only one, so
          none of the six is orphaned. Reinstating the card links would need the
          modal to move somewhere else on the card. */}
      <Services cardsOpenForm dark />

      {/* 6. Inspection Checklist */}
      <InspectionChecklist />

      {/* 7. Final CTA */}
      <FinalCta
        kicker="Free Inspection"
        title={<>Need a Roofer in {town}?</>}
        subtitle={ctaLine || 'Get a free, no-obligation quote. We\'ll inspect your roof and provide a clear, written price.'}
      />

      {/* 4. Reviews — the live Google widget only. There is deliberately no
          hand-written testimonial block: quotes that are not traceable to a real
          review are fabricated social proof, which the DMCC Act 2024 bans
          outright, so the page shows the verifiable rating instead. */}
      <ReviewsSection reviewCta="quote" />

      {/* 5. Everything else the page has to say, as one question-and-answer list:
          the local guide, common problems, local facts, case studies and the
          town's own questions. These were four separate sections, each with its
          own heading, background and accordion; they are groups in this list now. */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Frequently Asked Questions</span>
                <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-navy mb-3 sm:mb-4 px-2">
                Roofing Questions · {town}
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 px-4">
                Can't find what you're looking for? Contact us directly and we'll be happy to help.
              </p>
            </div>

            <div className="space-y-8 sm:space-y-10">
              {groups.map((group, i) => (
                <div key={i}>
                  {group.label && (
                    <h3 className="text-lg sm:text-xl font-bold text-brand-navy mb-4">{group.label}</h3>
                  )}
                  {group.note && (
                    <p className="text-sm sm:text-base text-gray-600 -mt-2 mb-4">{group.note}</p>
                  )}
                  <FaqAccordion items={group.items} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Service areas · shared internal-linking hub (matches the offer page).
          Every tile is in the HTML even when collapsed, so all 14 town links stay
          crawlable. Leans on `nearbyAreas` rather than ignoring it: the nearest
          town leads, the rest follow. */}
      <ServiceAreaHub
        title={
          <>
            We Also Serve
            <br />
            <span className="text-brand-orange">These Nearby Areas</span>
          </>
        }
        areas={orderAreaLinks({ lead: nearbyAreas[0]?.href, exclude: [selfHref] })}
      />

      {/* FAQ Schema · the genuine questions only. The case-study write-ups and the
          local fact table are answered in the same accordion, but they are not
          Question/Answer pairs and marking them up as such would misdescribe the
          page. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: uniqueFaqs.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a }
            }))
          })
        }}
      />
      {/* Speakable Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['h1'],
            },
            isPartOf: { '@id': 'https://www.upgraderoofs.co.uk/#website' },
          })
        }}
      />

      {/* Sticky mobile CTA · Call / WhatsApp / Message (matches homepage) */}
      <MobileContactBar />
    </div>
  );
}
