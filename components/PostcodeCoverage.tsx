import { ChevronDown } from 'lucide-react';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';

interface PostcodeCoverageProps {
  town: string;
  /** District level string from town data, e.g. `CW11` or `CW8 / CW9`. */
  postcode: string;
  /** Places inside the area, grouped by the district they fall in. */
  areas?: { district: string; places: string[] }[];
}

/** "A, B and C" — no Oxford comma, matching the rest of the site's prose. */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * "Postcodes We Cover in <town>" — one collapsed disclosure per town page.
 *
 * Built on `<details>` for the same reason the FAQ accordion is: the postcodes
 * and place names stay in the HTML whether or not the row is expanded, so
 * collapsing it never hides coverage from a search engine.
 *
 * The districts come from `TownData.postcode`, which the page already states in
 * its coverage FAQ; this gives the same fact a scannable shape. The places are
 * `TownData.postcodeAreas`, already grouped by district there — see the note on
 * that field for how the grouping was sourced.
 *
 * The grouping is what makes this worth expanding: a visitor scanning for their
 * own village wants the district next to it, not a list they have to hold in
 * their head against the two districts in the heading.
 *
 * It is a reference list rather than another question, so it does not breach the
 * "no question is asked twice on a page" rule the FAQ groups are built around.
 */
export function PostcodeCoverage({ town, postcode, areas }: PostcodeCoverageProps) {
  const districts = postcode
    .split('/')
    .map((district) => district.trim())
    .filter(Boolean);
  const groups = areas ?? [];
  const areaNoun = districts.length > 1 ? 'areas' : 'area';

  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          <details className="group bg-white border border-gray-200 border-l-4 border-l-brand-navy overflow-hidden hover:border-brand-orange/50 transition-colors">
            <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 sm:py-5 md:px-6 flex items-center justify-between gap-3 sm:gap-4">
              <span className="flex flex-col text-left">
                <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] mb-1">
                  Coverage
                </span>
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-brand-navy group-hover:text-brand-orange transition-colors">
                  Postcodes We Cover in {town}
                </h2>
              </span>
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-brand-orange flex-shrink-0 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 sm:px-5 sm:pb-5 md:px-6 text-sm sm:text-base text-gray-600 leading-relaxed">
              {groups.length > 0 ? (
                <>
                  <p className="mb-4">
                    {town} sits in the {joinList(districts)} postcode {areaNoun}. As well as the
                    town itself, we work across:
                  </p>
                  <dl className="space-y-2.5">
                    {groups.map(({ district, places }) => (
                      <div
                        key={district}
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                      >
                        <dt className="px-3 py-1 bg-brand-orange/10 text-brand-orange font-semibold text-sm rounded-full">
                          {district}
                        </dt>
                        <dd>{joinList(places)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {districts.map((district) => (
                      <span
                        key={district}
                        className="px-3 py-1 bg-brand-orange/10 text-brand-orange font-semibold text-sm rounded-full"
                      >
                        {district}
                      </span>
                    ))}
                  </div>
                  <p>We cover the whole of the {joinList(districts)} postcode {areaNoun}.</p>
                </>
              )}

              <p className="mt-3 text-sm text-gray-500">
                Not sure whether your postcode is covered? Call{' '}
                <TrackedPhoneLink
                  placement="postcode_coverage"
                  className="font-semibold text-brand-orange hover:underline"
                />{' '}
                and we&rsquo;ll confirm.
              </p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
