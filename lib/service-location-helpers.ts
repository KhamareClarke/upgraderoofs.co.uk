import { services, getService, type ServiceData } from './service-data';
import { PHONE_DISPLAY } from './contact';
import { townData, type TownData } from './town-data';
import type { Metadata } from 'next';

export function generateServiceLocationStaticParams() {
  return services.map((s) => ({ service: s.slug }));
}

export function generateServiceLocationMetadata(townKey: string, serviceSlug: string): Metadata {
  const town = townData[townKey];
  const service = getService(serviceSlug);
  if (!town || !service) return { title: 'Not Found' };

  const canonical = `https://www.upgraderoofs.co.uk/${town.slug}/${serviceSlug}`;

  return {
    // The brand is written out here rather than left to the root layout's title
    // template: app/roofers-<town>/layout.tsx declares a plain-string title, which
    // resets the template for everything beneath it, so these pages never get it
    // appended. The phone number is deliberately absent — it cost 15 of the ~60
    // characters Google shows and is already in the description, header and footer.
    title: `${service.shortName ?? service.name} ${town.town} | Upgrade Roofs`,
    description: `Professional ${service.name.toLowerCase()} in ${town.town} (${town.postcode}). ${town.distanceFromBase}. CORC certified, £10M insured, 10-year guarantee. Free written quotes. Call ${PHONE_DISPLAY}.`,
    openGraph: {
      title: `${service.name} in ${town.town} | Upgrade Roofs`,
      description: `Expert ${service.name.toLowerCase()} across ${town.town}. ${service.description.split('.')[0]}.`,
      url: canonical,
      siteName: 'Upgrade Roofs',
      locale: 'en_GB',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${service.name} ${town.town} | ${PHONE_DISPLAY}`,
      description: `Expert ${service.name.toLowerCase()} in ${town.town}. Free quotes, 10-year guarantee.`,
    },
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

// ---------------------------------------------------------------------------
// Town-aware solution paragraph. Each service×town matrix page otherwise
// renders the byte-identical ServiceData.description; this folds the town's own
// geography / property styles into a deterministic lead-in so every combo
// reads distinct (keyed on town.slug + service.slug via FNV-1a — hydration-safe).
// ---------------------------------------------------------------------------
const SOLUTION_ANGLE: ((town: TownData) => string)[] = [
  (town) =>
    `Around ${town.town}, a ${town.propertyTypes?.[0]?.toLowerCase() ?? 'typical'} housing stock shapes much of the roofing we carry out. ${town.roofingChallenges}`,
  (town) =>
    `${town.localContext} That context guides how we approach every job here.`,
  (town) =>
    `With ${town.landmarks?.[0] ? 'landmarks like ' + town.landmarks[0] + ' nearby' : 'the local area well known to us'}, we tailor our work to ${town.town}’s homes.`,
  (town) =>
    `We respond to ${town.town} addresses within ${town.emergencyResponseTime} in an emergency, and plan larger work around ${town.distanceFromBase.toLowerCase()}.`,
];

export function buildServiceTownSolution(service: ServiceData, town: TownData): string {
  const seed = hashSlug(town.slug + '::' + service.slug);
  const angle = SOLUTION_ANGLE[seed % SOLUTION_ANGLE.length];
  return `${service.description} ${angle(town)}`;
}

function hashSlug(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function generateServiceLocationFaqs(
  service: ServiceData,
  town: TownData
): { q: string; a: string }[] {
  const shared = [
    {
      q: `How quickly can you reach ${town.town} for ${service.name.toLowerCase()} work?`,
      a: `We are based in Sandbach, ${town.distanceFromBase}. For emergencies we typically reach ${town.town} within ${town.emergencyResponseTime}. For planned work, same-day or next-day inspections are usually available. Call ${PHONE_DISPLAY}.`,
    },
    {
      q: `Are you insured for ${service.name.toLowerCase()} work in ${town.town}?`,
      a: `Yes. Upgrade Roofs carries £10M public liability insurance, holds CORC (Confederation of Roofing Contractors) certification, and provides a 10-year workmanship guarantee on all ${service.name.toLowerCase()} work in ${town.town} and across Cheshire.`,
    },
  ];

  const specific: Record<string, { q: string; a: string }[]> = {
    'flat-roofing': [
      {
        q: `How much does a flat roof cost in ${town.town}?`,
        a: `A new EPDM flat roof on a garage in ${town.town} typically costs £800–£2,000; a house extension flat roof £1,500–£4,500. GRP fibreglass systems are priced similarly. We provide a free no-obligation written quote after inspecting your property.`,
      },
      {
        q: `What flat roofing system is best for a property in ${town.town}?`,
        a: `For most ${town.town} properties we recommend EPDM rubber for its 50-year lifespan and flexibility, or GRP fibreglass for a seamless, hard-wearing finish. The right system depends on roof size, access, and budget — we advise on this during a free inspection.`,
      },
    ],
    'tile-slate-roofing': [
      {
        q: `How much does a tile or slate re-roof cost in ${town.town}?`,
        a: `A full re-roof in ${town.town} typically costs £5,000–£8,000 for a terraced house, £6,500–£10,000 for a semi-detached, and £9,000–£16,000+ for a detached property. Material choice affects the final price. We provide a free written quote after inspection.`,
      },
      {
        q: `Can you match original slate or tile on an older property in ${town.town}?`,
        a: `Yes. We source natural Welsh slate, reclaimed slates, and period clay tiles to match existing roofs on older ${town.town} properties. For listed buildings or conservation areas, we advise on materials that meet planning requirements.`,
      },
    ],
    'chimney-repairs': [
      {
        q: `How much does chimney repointing cost in ${town.town}?`,
        a: `Chimney repointing in ${town.town} typically costs £300–£800 for a standard stack, depending on access and mortar deterioration. Lead flashing replacement adds £400–£900. Full chimney rebuilds range from £1,500–£4,000+. Free inspection and written quote provided.`,
      },
      {
        q: `What chimney repair services do you carry out in ${town.town}?`,
        a: `In ${town.town} we carry out repointing, lead flashing replacement, pot and cowl installation, stack rebuilds, haunching repairs, and emergency make-safe work. We can also advise on capping unused chimneys.`,
      },
    ],
    'gutters-fascias': [
      {
        q: `How much does gutter and fascia replacement cost in ${town.town}?`,
        a: `A full uPVC gutter and fascia replacement on a semi-detached house in ${town.town} typically costs £800–£1,800. Larger detached properties range from £1,500–£3,500. Targeted repairs on individual sections are also available. Free written quotes provided.`,
      },
      {
        q: `How long does a gutter and fascia replacement take in ${town.town}?`,
        a: `Most full gutter and fascia replacements in ${town.town} are completed in a single day for terraced or semi-detached properties. Larger properties requiring scaffolding may take two days. We leave the site clean on completion.`,
      },
    ],
    'skylights-roof-windows': [
      {
        q: `How much does a skylight installation cost in ${town.town}?`,
        a: `A standard Velux skylight installation in ${town.town} costs £800–£1,500 per unit including supply, fitting, and full waterproofing. Larger or flat-roof skylights range from £1,200–£3,500+. Free written quotes provided after a site visit.`,
      },
      {
        q: `Do I need planning permission for a skylight in ${town.town}?`,
        a: `Most standard skylights fitted flush with the roof slope fall under permitted development and do not require planning permission. Exceptions include listed buildings, conservation areas, or skylights that project significantly above the roof. We advise on this during your free consultation.`,
      },
    ],
    cladding: [
      {
        q: `How much does cladding installation cost in ${town.town}?`,
        a: `uPVC cladding for a typical semi-detached in ${town.town} costs £2,000–£5,000; timber or composite cladding ranges from £3,000–£8,000. Costs depend on the area to be clad and material chosen. We provide a free survey and written quote before work begins.`,
      },
      {
        q: `Do I need planning permission for cladding in ${town.town}?`,
        a: `Like-for-like cladding replacements in ${town.town} generally do not require planning permission. Changing the external appearance significantly, or working on a listed building or in a conservation area, may require approval. We advise on this during your free consultation.`,
      },
    ],
  };

  return [...(specific[service.slug] ?? []), ...shared].slice(0, 4);
}
