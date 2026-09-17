/**
 * Every town page, in the order the "Where We Work" section shows them.
 *
 * The first six are the ones rendered up front; everything after sits behind
 * that section's expander. Order is deliberate — the six nearest towns lead,
 * Sandbach and the wider coverage follow.
 *
 * This mirrors TOWN_SLUGS/TOWN_LABELS in lib/routes.ts (which are module-private)
 * and the service-areas sitemap entries. Adding a town page means adding it in
 * both places.
 */
export interface ServiceAreaLink {
  name: string;
  href: string;
}

export const SERVICE_AREA_LINKS: ServiceAreaLink[] = [
  { name: 'Crewe', href: '/roofers-crewe' },
  { name: 'Middlewich', href: '/roofers-middlewich' },
  { name: 'Congleton', href: '/roofers-congleton' },
  { name: 'Nantwich', href: '/roofers-nantwich' },
  { name: 'Alsager', href: '/roofers-alsager' },
  { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
  { name: 'Sandbach', href: '/roofers-sandbach' },
  { name: 'Winsford', href: '/roofers-winsford' },
  { name: 'Northwich', href: '/roofers-northwich' },
  { name: 'Macclesfield', href: '/roofers-macclesfield' },
  { name: 'Knutsford', href: '/roofers-knutsford' },
  { name: 'Tarporley', href: '/roofers-tarporley' },
  { name: 'Biddulph', href: '/roofers-biddulph' },
  { name: 'Newcastle-under-Lyme', href: '/roofers-newcastle-under-lyme' },
  { name: 'Wilmslow', href: '/roofers-wilmslow' },
];

/** Hub page listing every town — trails the grid's revealed set. */
export const SERVICE_AREAS_HUB: ServiceAreaLink = {
  name: 'All Service Areas',
  href: '/service-areas',
};

/**
 * The same list, reordered or trimmed for a particular page.
 *
 * `lead` pulls one town to the front (the homepage leads with Sandbach rather
 * than burying it behind the expander); `exclude` drops towns outright, which a
 * town page uses so it doesn't link to itself.
 */
export function orderAreaLinks({
  lead,
  exclude = [],
}: {
  lead?: string;
  exclude?: string[];
} = {}): ServiceAreaLink[] {
  const list = SERVICE_AREA_LINKS.filter((area) => !exclude.includes(area.href));
  if (!lead) return list;

  const leadArea = list.find((area) => area.href === lead);
  if (!leadArea) return list;

  return [leadArea, ...list.filter((area) => area.href !== lead)];
}
