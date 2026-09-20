import { ChevronDown } from 'lucide-react';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';

const faqs = [
  {
    question: 'How much does a new roof cost in Cheshire?',
    answer: "Every roof is different, so costs vary depending on size, materials, and the scope of work involved. We provide free, no-obligation quotes with transparent, itemised pricing and no hidden costs or surprises."
  },
  {
    question: 'How long does a roof replacement take?',
    answer: "Timelines depend on the size and complexity of your roof. We'll give you a clear schedule before any work begins and keep you informed throughout the project."
  },
  {
    question: 'What roofing services do you offer?',
    answer: "We provide a complete range of roofing services, from new roofs and re-roofing to traditional tile and slate, modern flat roofing (EPDM rubber and GRP fibreglass), chimney repairs, guttering and fascias, skylights, cladding, and 24/7 emergency roof repairs. Whatever your property needs across Cheshire, our team handles it from first survey to final sign-off, backed by a 10-year guarantee. Upgrade Roofs is CORC-certified and holds £10 million public liability insurance."
  },
  {
    question: 'Where are you based and what areas do you cover?',
    answer: "We're based at 20 Crewe Road, Sandbach CW11 4NE and cover the whole of Cheshire, including Crewe, Congleton, Middlewich, Nantwich, Alsager, and Holmes Chapel plus surrounding towns and villages. Free written quotes are always available; call 01270 897 606 or use the site to request yours."
  },
  {
    question: 'Do you offer emergency roofing services?',
    answer: 'Yes. We offer a 24/7 emergency call-out service across Cheshire and the North West. If you have an urgent leak or storm damage, call us now on 01270 897 606.'
  },
  {
    question: 'What areas of Cheshire do you cover?',
    answer: "We're based in Sandbach and cover the whole of south and mid-Cheshire, including Crewe, Congleton, Middlewich, Nantwich, Alsager, and Holmes Chapel plus the surrounding towns and villages throughout Cheshire. Give us a call if you're unsure whether we cover your location and our team will confirm right away."
  },
  {
    question: 'What warranty do you offer on roofing work?',
    answer: "All our work is fully guaranteed and we offer Insurance Backed Guarantees for added peace of mind. We'll walk you through the details before any work starts."
  },
  {
    question: 'Can you match existing tiles for repairs?',
    answer: "Yes, tile and slate matching is part of the service. We'll do our best to source materials that blend with your existing roof so repairs are as seamless as possible."
  },
];

const faqData = {
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
};

export function FAQ() {
  return (
    <section className="section-padding">
      {/* FAQPage JSON-LD · mirrors the visible details/summary Q&As verbatim */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
              <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Frequently Asked Questions</span>
              <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-navy mb-3 sm:mb-4 px-2">
              Got Questions? We've Got Answers.
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 px-4">
              Can't find what you're looking for? Contact us directly and we'll be happy to help.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-white border border-gray-200 border-l-4 border-l-brand-navy overflow-hidden hover:border-brand-orange/50 transition-colors"
                open={index === 0}
              >
                <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 sm:py-5 md:px-6 flex items-center justify-between gap-3 sm:gap-4">
                  <span className="font-semibold text-brand-navy text-sm sm:text-base md:text-lg group-hover:text-brand-orange transition-colors text-left pr-2">
                    {faq.question}
                  </span>
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-brand-orange flex-shrink-0 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 md:px-6">
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-8 sm:mt-10 md:mt-12 text-center">
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">Still have questions?</p>
            <TrackedPhoneLink
              placement="faq_section"
              prefix="Call Us: "
              className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
