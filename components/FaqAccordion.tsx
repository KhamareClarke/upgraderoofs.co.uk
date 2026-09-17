import { ChevronDown } from 'lucide-react';

export interface FaqAccordionItem {
  /** The question shown in the summary row. */
  q: React.ReactNode;
  /** The answer revealed underneath. */
  a: React.ReactNode;
}

/**
 * The question-and-answer accordion used by every Q&A block on the town pages:
 * the FAQ section and the local-guide sections (local knowledge, common
 * problems, local proof, case studies).
 *
 * Extracted as one component because those blocks used to be hand-rolled
 * separately — prose paragraphs, cards, a two-column stats panel — which is
 * exactly why they all looked different from the FAQ section.
 *
 * Built on `<details>` rather than a div toggled with state: the answer text is
 * in the HTML whether or not the row is expanded, so collapsing a row never
 * hides content from a search engine. `defaultOpen` controls how many rows start
 * expanded; the rest stay collapsed but fully present in the markup.
 */
export function FaqAccordion({
  items,
  defaultOpen = 1,
  className = '',
}: {
  items: FaqAccordionItem[];
  defaultOpen?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {items.map((item, i) => (
        <details
          key={i}
          className="group bg-white border border-gray-200 border-l-4 border-l-brand-navy overflow-hidden hover:border-brand-orange/50 transition-colors"
          open={i < defaultOpen}
        >
          <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 sm:py-5 md:px-6 flex items-center justify-between gap-3 sm:gap-4">
            <span className="font-semibold text-brand-navy text-sm sm:text-base md:text-lg group-hover:text-brand-orange transition-colors text-left pr-2">
              {item.q}
            </span>
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-brand-orange flex-shrink-0 transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 sm:px-5 sm:pb-5 md:px-6 text-sm sm:text-base text-gray-600 leading-relaxed">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}
