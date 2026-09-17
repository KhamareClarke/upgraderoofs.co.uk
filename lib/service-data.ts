export interface ServiceData {
  slug: string;
  name: string;
  /**
   * Shorter form, used only in <title> tags — `name` stays the display name
   * everywhere else (H1, breadcrumbs, body copy). The service×town matrix titles
   * carry the brand in the literal, so "Skylights & Roof Windows" plus a town
   * like Newcastle-under-Lyme would render past the ~60 characters Google shows.
   */
  shortName?: string;
  description: string;
  url: string;
  breadcrumbLabel: string;
}

export const services: ServiceData[] = [
  {
    slug: 'tile-slate-roofing',
    name: 'Tile & Slate Roofing',
    breadcrumbLabel: 'Tile & Slate Roofing',
    description: 'Professional tile and slate roofing installation, repair and restoration in Cheshire. Traditional craftsmanship using premium clay tiles, concrete tiles and natural Welsh slate.',
    url: 'https://www.upgraderoofs.co.uk/services/tile-slate-roofing',
  },
  {
    slug: 'flat-roofing',
    name: 'Flat Roofing',
    breadcrumbLabel: 'Flat Roofing',
    description: 'Expert flat roofing in Cheshire using EPDM rubber, GRP fibreglass and felt systems. Suitable for garages, extensions and commercial buildings. 20-year warranty.',
    url: 'https://www.upgraderoofs.co.uk/services/flat-roofing',
  },
  {
    slug: 'chimney-repairs',
    name: 'Chimney Repairs',
    breadcrumbLabel: 'Chimney Repairs',
    description: 'Professional chimney repairs in Cheshire including repointing, lead flashing replacement, stack repairs, cowl installation and full chimney rebuilds.',
    url: 'https://www.upgraderoofs.co.uk/services/chimney-repairs',
  },
  {
    slug: 'gutters-fascias',
    name: 'Gutters & Fascias',
    breadcrumbLabel: 'Gutters & Fascias',
    description: 'Complete gutter and fascia replacement in Cheshire. uPVC guttering, fascias, soffits and bargeboards. Prevents water damage and improves kerb appeal.',
    url: 'https://www.upgraderoofs.co.uk/services/gutters-fascias',
  },
  {
    slug: 'skylights-roof-windows',
    name: 'Skylights & Roof Windows',
    shortName: 'Skylights',
    breadcrumbLabel: 'Skylights & Roof Windows',
    description: 'Professional skylight and roof window installation in Cheshire. Velux, fixed and opening roof windows. Bringing natural light and ventilation into your home.',
    url: 'https://www.upgraderoofs.co.uk/services/skylights-roof-windows',
  },
  {
    slug: 'cladding',
    name: 'Cladding',
    breadcrumbLabel: 'Cladding',
    description: 'Expert wall cladding installation and repairs in Cheshire. Improves insulation, weatherproofing and the appearance of residential and commercial properties.',
    url: 'https://www.upgraderoofs.co.uk/services/cladding',
  },
];

export const getService = (slug: string): ServiceData | undefined =>
  services.find((s) => s.slug === slug);
