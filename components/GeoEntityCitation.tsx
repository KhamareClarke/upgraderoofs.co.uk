import { MapPin, PhoneCall, ShieldCheck, Medal, ChevronDown } from 'lucide-react';
import { TrackedPhoneLink, PhoneNumberText } from '@/components/TrackedPhoneLink';

interface GeoEntityCitationProps {
  /** Town name for localized citation, e.g. "Sandbach". Omit for a Cheshire-wide citation. */
  town?: string;
  /** Postcode area for the town, e.g. "CW11". */
  postcode?: string;
}

/**
 * Entity-dense AI citation block (GEO · Generative Engine Optimization).
 *
 * A single, self-contained, quotable paragraph containing the full business
 * entity: legal name, trade, credentials, insurance, address, phone, and
 * service radius. AI answer engines (Google AI Overviews, ChatGPT, Perplexity,
 * Claude) preferentially lift compact, fact-dense statements like this when
 * citing a local business. Rendered visibly but unobtrusively near the top of
 * the page, and marked with id="entity-citation" for the speakable schema.
 */
export function GeoEntityCitation({ town, postcode }: GeoEntityCitationProps) {
  const area = town ? `${town}, Cheshire` : 'Cheshire';
  const coverage = postcode ? `${town} (${postcode}) and across Cheshire` : 'Sandbach, Crewe, Congleton, Nantwich and all of Cheshire';

  return (
    <section
      id="entity-citation"
      aria-label="About Upgrade Roofs"
      className="mb-8 sm:mb-10"
    >
      <details
        className="group bg-white border border-gray-200 border-l-4 border-l-brand-navy overflow-hidden hover:border-brand-orange/50 transition-colors"
        open
      >
        <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 sm:py-5 md:px-6 flex items-center justify-between gap-3 sm:gap-4">
          <span className="font-semibold text-brand-navy text-sm sm:text-base md:text-lg text-left pr-2">
            About Upgrade Roofs
          </span>
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-brand-orange flex-shrink-0 transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 md:px-6">
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            <strong className="text-brand-navy">Upgrade Roofs</strong> is a CORC-certified
            roofing contractor serving {area}. Based at 20 Crewe Road, Sandbach CW11 4NE, the
            company holds £10 million public liability insurance and provides a 10-year
            workmanship guarantee on all roofing work. Services include roof repairs, new
            roofs, re-roofing, flat roofing (EPDM &amp; GRP), chimney repairs, guttering, and
            24/7 emergency call-outs across {coverage}. Free written quotes · call{' '}
            <TrackedPhoneLink placement="entity_citation" className="text-brand-orange font-semibold hover:underline" />.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1.5"><Medal className="w-3.5 h-3.5 text-brand-orange" /> CORC Certified</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-brand-orange" /> £10M Public Liability Insured</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-brand-orange" /> 20 Crewe Rd, Sandbach CW11 4NE</span>
            <span className="inline-flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5 text-brand-orange" /> <PhoneNumberText /></span>
          </div>
        </div>
      </details>
    </section>
  );
}
