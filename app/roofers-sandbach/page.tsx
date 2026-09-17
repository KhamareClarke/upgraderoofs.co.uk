import { AreaPageTemplate } from '@/components/AreaPageTemplate';
import { townData } from '@/lib/town-data';

export const dynamic = 'force-static';
export const revalidate = false;

const data = townData.sandbach;

/**
 * Sandbach runs on the same shared template as every other town page — it used
 * to be a bespoke page, which is why it was the only one that did not match.
 *
 * Its depth (local prose, four documented case studies, the stats panel) now
 * lives in `lib/town-data.ts` and renders through the template's optional
 * sections, so it did not lose content by moving.
 *
 * The H1 targets the free-inspection term rather than the generic "roofers"
 * one: the homepage already owns "roofers Sandbach". The hero paragraph keeps
 * that term instead — see `heroIntro`.
 */
export default function RoofersSandbachPage() {
  return (
    <AreaPageTemplate
      {...data}
      kicker="Sandbach, Cheshire"
      heading={
        <>
          Free Roof Inspection <span className="text-brand-orange">in Sandbach</span>
        </>
      }
    />
  );
}
