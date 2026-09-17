import { ServiceLeadForm } from '@/components/ServiceLeadForm';

/**
 * The one lead form every page ends with, sitting directly above the footer.
 *
 * Rendered once by ConditionalLayout rather than added to each page, so a new
 * route cannot ship without it and no page can drift into its own variant.
 *
 * It wraps the same ServiceLeadForm card the six /services/* heroes used to
 * carry inline; those heroes now carry the standard modal button instead. That
 * is the "uniform" part: one card, one wizard, one endpoint (/api/send-quote),
 * one set of field keys, identical on all ~45 pages. The card supplies its own
 * heading and subhead, which is why this wrapper adds none — a section title
 * above it would only restate it.
 *
 * The CTA band that already ends most pages (FinalCta on the service and town
 * pages, ServiceAreaHub on the town pages) is deliberately left in place above
 * this one. Those carry the per-page pitch and their wording is unique; this
 * carries the fields. Pitch then fields is the intended order, not a
 * duplication to clean up later.
 */
export function SiteLeadForm() {
  return (
    <section className="section-padding bg-brand-grey">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto">
          <ServiceLeadForm />
        </div>
      </div>
    </section>
  );
}
