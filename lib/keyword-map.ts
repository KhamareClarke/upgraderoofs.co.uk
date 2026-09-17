/**
 * ---------------------------------------------------------------
 * SEO KEYWORD MAP — One primary keyword per ranking page.
 *
 * PURPOSE: Prevent cannibalization by assigning a single primary
 * search intent to each URL. Secondary keywords support the
 * primary without competing with other pages.
 *
 * RULES:
 *   - No two pages should share the same primary keyword.
 *   - Town pages target "[service] + [town]" — never generic service terms.
 *   - Service subpages target "[specific service] + Cheshire" — the county.
 *   - Core commercial pages target high-volume head terms + Sandbach/Cheshire.
 *   - Blog posts target informational long-tail queries only.
 * ---------------------------------------------------------------
 */

export type IntentType =
  | 'core-commercial'
  | 'local-commercial'
  | 'supporting-service'
  | 'trust'
  | 'informational'
  | 'conversion'
  | 'utility';

export interface KeywordEntry {
  route: string;
  pageType: IntentType;
  primaryKeyword: string;
  secondaryKeywords: string[];
  titleTag: string;
  h1: string;
  cannibalizationNotes: string;
}

export const keywordMap: KeywordEntry[] = [
  // ============================================================
  // HOMEPAGE
  // ============================================================
  {
    route: '/',
    pageType: 'core-commercial',
    primaryKeyword: 'roofers Sandbach',
    secondaryKeywords: [
      'roofing company Cheshire',
      'roofers near me Sandbach',
      'Sandbach roofing services',
    ],
    titleTag: 'Upgrade Roofs | Roofers Sandbach & Cheshire | 01270 897606',
    h1: 'Trusted Roofers in Sandbach & Cheshire',
    cannibalizationNotes:
      'Owns "roofers Sandbach" as the broadest brand+location term. /roofers-sandbach targets "roofers in Sandbach" (longer, more local-pack oriented).',
  },

  // ============================================================
  // CORE COMMERCIAL — money pages
  // ============================================================
  {
    route: '/roof-repairs',
    pageType: 'core-commercial',
    primaryKeyword: 'roof repairs Cheshire',
    secondaryKeywords: [
      'roof leak repair',
      'storm damage roof repair',
      'emergency roof repair Cheshire',
      'missing tile replacement',
    ],
    titleTag: 'Roof Repairs Cheshire | Same-Day Service | Upgrade Roofs',
    h1: 'Roof Repairs Across Cheshire',
    cannibalizationNotes:
      'Targets broad "roof repairs Cheshire". Town pages handle "roof repairs [town]". Blog post /blog/emergency-roof-repairs covers informational angle only.',
  },
  {
    route: '/new-roofs',
    pageType: 'core-commercial',
    primaryKeyword: 'new roof installation Cheshire',
    secondaryKeywords: [
      'roof replacement Cheshire',
      're-roofing Sandbach',
      'complete roof replacement cost',
      'new roof cost UK',
    ],
    titleTag: 'New Roofs & Re-Roofing Cheshire | 10-Year Guarantee | Upgrade Roofs',
    h1: 'New Roof Installations & Re-Roofing',
    cannibalizationNotes:
      'Broadened from "Sandbach" to "Cheshire" to avoid competing with /roofers-sandbach. Blog post /blog/how-long-does-roof-last covers informational angle.',
  },
  {
    route: '/emergency-roofing',
    pageType: 'core-commercial',
    primaryKeyword: 'emergency roofer Cheshire',
    secondaryKeywords: [
      '24/7 roof repairs',
      'storm damage roofing',
      'urgent roof repair near me',
      'emergency roof leak',
    ],
    titleTag: '24/7 Emergency Roofing Cheshire | Storm Damage | 01270 897606',
    h1: '24/7 Emergency Roofing Services',
    cannibalizationNotes:
      'Broadened from "Sandbach" to "Cheshire". /blog/emergency-roof-repairs targets "what to do" informational intent — no overlap.',
  },

  // ============================================================
  // SERVICE SUBPAGES — niche service detail
  // ============================================================
  {
    route: '/services',
    pageType: 'supporting-service',
    primaryKeyword: 'roofing services Cheshire',
    secondaryKeywords: [
      'roofing company services',
      'what roofing services do you offer',
    ],
    titleTag: 'Roofing Services | Full Range | Upgrade Roofs',
    h1: 'Our Roofing Services',
    cannibalizationNotes:
      'Hub page. Links to all subpages. Does not target any specific service keyword.',
  },
  {
    route: '/services/tile-slate-roofing',
    pageType: 'supporting-service',
    primaryKeyword: 'tile roofing Cheshire',
    secondaryKeywords: [
      'slate roof repair Cheshire',
      'clay tile roofing',
      'slate roof installation',
      'heritage roof restoration',
    ],
    titleTag: 'Tile & Slate Roofing Cheshire | Repairs & Installation | Upgrade Roofs',
    h1: 'Tile & Slate Roofing Specialists',
    cannibalizationNotes:
      'Differentiated from /roof-repairs by focusing on material (tile/slate), not the repair action.',
  },
  {
    route: '/services/flat-roofing',
    pageType: 'supporting-service',
    primaryKeyword: 'flat roofing Cheshire',
    secondaryKeywords: [
      'EPDM roofing Cheshire',
      'GRP fibreglass roof',
      'flat roof installation',
      'flat roof replacement',
    ],
    titleTag: 'Flat Roofing Cheshire | EPDM & GRP Specialists | Upgrade Roofs',
    h1: 'Flat Roofing — EPDM & GRP Specialists',
    cannibalizationNotes:
      '/blog/flat-roof-problems targets informational "common flat roof problems" — no overlap with this commercial page.',
  },
  {
    route: '/services/chimney-repairs',
    pageType: 'supporting-service',
    primaryKeyword: 'chimney repairs Cheshire',
    secondaryKeywords: [
      'chimney repointing',
      'chimney stack rebuild',
      'chimney flashing repair',
      'chimney cowl installation',
    ],
    titleTag: 'Chimney Repairs Cheshire | Repointing & Rebuilds | Upgrade Roofs',
    h1: 'Chimney Repairs & Maintenance',
    cannibalizationNotes:
      '/blog/chimney-repair-guide targets "chimney repair guide" informational intent — no overlap.',
  },
  {
    route: '/services/gutters-fascias',
    pageType: 'supporting-service',
    primaryKeyword: 'guttering Cheshire',
    secondaryKeywords: [
      'fascia replacement Cheshire',
      'soffit repairs',
      'gutter installation',
      'uPVC fascias',
    ],
    titleTag: 'Gutters & Fascias Cheshire | uPVC Installation & Repair | Upgrade Roofs',
    h1: 'Guttering, Fascias & Soffits',
    cannibalizationNotes:
      '/blog/gutter-maintenance-guide covers "how to maintain gutters" — informational only.',
  },
  {
    route: '/services/skylights-roof-windows',
    pageType: 'supporting-service',
    primaryKeyword: 'skylight installation Cheshire',
    secondaryKeywords: [
      'Velux windows Cheshire',
      'roof windows installation',
      'skylight repair',
      'loft conversion skylights',
    ],
    titleTag: 'Skylight & Roof Window Installation Cheshire | Upgrade Roofs',
    h1: 'Skylight & Roof Window Installation',
    cannibalizationNotes:
      '/blog/skylight-installation-guide covers "is a skylight worth it" informational intent.',
  },
  {
    route: '/services/cladding',
    pageType: 'supporting-service',
    primaryKeyword: 'cladding installation Cheshire',
    secondaryKeywords: [
      'wall cladding Cheshire',
      'composite cladding',
      'external cladding contractor',
    ],
    titleTag: 'Cladding Installation Cheshire | Wall & Roof Cladding | Upgrade Roofs',
    h1: 'Cladding Installation & Repairs',
    cannibalizationNotes: 'No competing pages.',
  },

  // ============================================================
  // LOCAL / TOWN PAGES
  // Each targets "roofers [town]" — never generic service terms.
  // Sandbach is the exception: it carries the free-inspection offer,
  // because the homepage already covers "roofers Sandbach" for it.
  // ============================================================
  {
    route: '/roofers-sandbach',
    pageType: 'local-commercial',
    primaryKeyword: 'free roof inspection Sandbach',
    secondaryKeywords: [
      'roof inspection Sandbach',
      'free roof check Sandbach',
      'roof survey Sandbach CW11',
      'roofers Sandbach',
    ],
    titleTag: 'Free Roof Inspection Sandbach | No Obligation | 01270 897606',
    h1: 'Free Roof Inspection in Sandbach',
    cannibalizationNotes:
      'Sandbach is where the business is based, so it carries the offer rather than the generic "roofers" term. The homepage owns "roofers Sandbach"; "roofers" is kept as a secondary keyword here and in the body copy. The term was previously claimed only by /offer-sandbach and /special-offer, both noindex — so no indexable page held it.',
  },
  {
    route: '/roofers-crewe',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Crewe',
    secondaryKeywords: [
      'roofing company Crewe',
      'roof repairs Crewe',
      'local roofer Crewe CW1',
    ],
    titleTag: 'Roofers Crewe | Local Roofing Company | Upgrade Roofs',
    h1: 'Roofers in Crewe',
    cannibalizationNotes: 'No overlap — unique town.',
  },
  {
    route: '/roofers-middlewich',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Middlewich',
    secondaryKeywords: [
      'roofing company Middlewich',
      'roof repairs Middlewich',
      'local roofer Middlewich CW10',
    ],
    titleTag: 'Roofers Middlewich | Local Roofing Experts | Upgrade Roofs',
    h1: 'Roofers in Middlewich',
    cannibalizationNotes: 'No overlap — unique town.',
  },
  {
    route: '/roofers-congleton',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Congleton',
    secondaryKeywords: [
      'roofing company Congleton',
      'roof repairs Congleton',
      'local roofer Congleton CW12',
    ],
    titleTag: 'Roofers Congleton | Local Roofing Company | Upgrade Roofs',
    h1: 'Roofers in Congleton',
    cannibalizationNotes: 'No overlap — unique town.',
  },
  {
    route: '/roofers-nantwich',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Nantwich',
    secondaryKeywords: [
      'roofing company Nantwich',
      'roof repairs Nantwich',
      'local roofer Nantwich CW5',
    ],
    titleTag: 'Roofers Nantwich | Local Roofing Company | Upgrade Roofs',
    h1: 'Roofers in Nantwich',
    cannibalizationNotes: 'No overlap — unique town.',
  },
  {
    route: '/roofers-alsager',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Alsager',
    secondaryKeywords: [
      'roofing company Alsager',
      'roof repairs Alsager',
      'local roofer Alsager ST7',
    ],
    titleTag: 'Roofers Alsager | Local Roofing Experts | Upgrade Roofs',
    h1: 'Roofers in Alsager',
    cannibalizationNotes: 'No overlap — unique town.',
  },
  {
    route: '/roofers-holmes-chapel',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Holmes Chapel',
    secondaryKeywords: [
      'roofing company Holmes Chapel',
      'roof repairs Holmes Chapel',
      'local roofer Holmes Chapel CW4',
    ],
    titleTag: 'Roofers Holmes Chapel | Local Roofing Company | Upgrade Roofs',
    h1: 'Roofers in Holmes Chapel',
    cannibalizationNotes: 'No overlap — unique town.',
  },
  // The eight below were in the sitemap and indexable but missing from this
  // map entirely, so nothing here described what they target. Postcodes and
  // districts are taken from lib/town-data.ts, which the pages render from.
  {
    route: '/roofers-winsford',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Winsford',
    secondaryKeywords: [
      'roofing company Winsford',
      'roof repairs Winsford',
      'local roofer Winsford CW7',
      'roofer Wharton',
      'roofer Swanlow',
    ],
    titleTag: 'Roofers Winsford | Upgrade Roofs | 01270 897606',
    h1: 'Roofers in Winsford',
    cannibalizationNotes: 'No overlap — unique town.',
  },
  {
    route: '/roofers-northwich',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Northwich',
    secondaryKeywords: [
      'roofing company Northwich',
      'roof repairs Northwich',
      'local roofer Northwich CW8',
      'roofer Hartford',
      'roofer Barnton',
    ],
    titleTag: 'Roofers Northwich | Upgrade Roofs | 01270 897606',
    h1: 'Roofers in Northwich',
    cannibalizationNotes: 'No overlap — unique town. Covers CW8 and CW9.',
  },
  {
    route: '/roofers-macclesfield',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Macclesfield',
    secondaryKeywords: [
      'roofing company Macclesfield',
      'roof repairs Macclesfield',
      'local roofer Macclesfield SK10',
      'roofer Tytherington',
      'roofer Bollington',
      'roofer Prestbury',
    ],
    titleTag: 'Roofers Macclesfield | 5★ Rated | Free Quotes in 24hrs | Upgrade Roofs',
    h1: 'Roofers in Macclesfield',
    cannibalizationNotes:
      'No overlap — unique town. Covers SK10 and SK11; Bollington and Prestbury are separate villages with their own search volume.',
  },
  {
    route: '/roofers-knutsford',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Knutsford',
    secondaryKeywords: [
      'roofing company Knutsford',
      'roof repairs Knutsford',
      'local roofer Knutsford WA16',
      'roofer Toft',
      'roofer Tatton',
    ],
    titleTag: 'Roofers Knutsford | Upgrade Roofs | 01270 897606',
    h1: 'Roofers in Knutsford',
    cannibalizationNotes:
      'No overlap — unique town. Affluent WA16 market; Tatton and Toft are the prestige addresses.',
  },
  {
    route: '/roofers-tarporley',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Tarporley',
    secondaryKeywords: [
      'roofing company Tarporley',
      'roof repairs Tarporley',
      'local roofer Tarporley CW6',
      'roofer Bunbury',
      'roofer Beeston',
    ],
    titleTag: 'Roofers Tarporley | Upgrade Roofs | 01270 897606',
    h1: 'Roofers in Tarporley',
    cannibalizationNotes:
      'No overlap — unique town. Rural CW6; Bunbury and Beeston are the surrounding villages.',
  },
  {
    route: '/roofers-biddulph',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Biddulph',
    secondaryKeywords: [
      'roofing company Biddulph',
      'roof repairs Biddulph',
      'local roofer Biddulph ST8',
      'roofer Biddulph Moor',
      'roofer Knypersley',
    ],
    titleTag: 'Roofers Biddulph | Upgrade Roofs | 01270 897606',
    h1: 'Roofers in Biddulph',
    cannibalizationNotes:
      'No overlap — unique town. In Staffordshire, not Cheshire, despite sitting in the Cheshire-facing service area; exposed Moorlands conditions are the differentiator.',
  },
  {
    route: '/roofers-newcastle-under-lyme',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Newcastle-under-Lyme',
    secondaryKeywords: [
      'roofing company Newcastle-under-Lyme',
      'roof repairs Newcastle-under-Lyme',
      'local roofer Newcastle ST5',
      'roofer Porthill',
      'roofer Westlands',
      'roofer Silverdale',
    ],
    titleTag: 'Roofers Newcastle-under-Lyme | Upgrade Roofs | 01270 897606',
    h1: 'Roofers in Newcastle-under-Lyme',
    cannibalizationNotes:
      'No overlap — unique town. In Staffordshire; "Newcastle" alone would collide with Newcastle upon Tyne, so the full hyphenated name is used throughout.',
  },
  {
    route: '/roofers-wilmslow',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers in Wilmslow',
    secondaryKeywords: [
      'roofing company Wilmslow',
      'roof repairs Wilmslow',
      'local roofer Wilmslow SK9',
      'roofer Alderley Edge',
      'roofer Handforth',
      'roofer Hale',
    ],
    titleTag: 'Roofers Wilmslow | 5★ Rated | Free Quotes in 24hrs | Upgrade Roofs',
    h1: 'Roofers in Wilmslow',
    cannibalizationNotes:
      'No overlap — unique town. Alderley Edge, Handforth and Hale are distinct villages with their own volume; they route here rather than to separate pages.',
  },
  {
    route: '/service-areas',
    pageType: 'local-commercial',
    primaryKeyword: 'roofers Cheshire',
    secondaryKeywords: [
      'roofing company near me Cheshire',
      'areas we cover roofing',
    ],
    titleTag: 'Areas We Cover | Roofers Across Cheshire | Upgrade Roofs',
    h1: 'Areas We Cover Across Cheshire',
    cannibalizationNotes:
      'Hub page linking to all town pages. Targets the broad county term.',
  },

  // ============================================================
  // TRUST / AUTHORITY PAGES
  // ============================================================
  {
    route: '/about',
    pageType: 'trust',
    primaryKeyword: 'roofing company Sandbach',
    secondaryKeywords: [
      'about Upgrade Roofs',
      'Cheshire roofing company history',
      'CORC certified roofers',
    ],
    titleTag: 'About Upgrade Roofs | 25+ Years Roofing Experience',
    h1: 'About Upgrade Roofs',
    cannibalizationNotes:
      'Differentiated from homepage by "company" modifier and trust/history intent.',
  },
  {
    route: '/reviews',
    pageType: 'trust',
    primaryKeyword: 'Upgrade Roofs reviews',
    secondaryKeywords: [
      'roofer reviews Sandbach',
      'roofing company reviews Cheshire',
    ],
    titleTag: 'Customer Reviews | 5-Star Rated | Upgrade Roofs',
    h1: 'What Our Customers Say',
    cannibalizationNotes: 'Branded query — no competition.',
  },
  {
    route: '/gallery',
    pageType: 'trust',
    primaryKeyword: 'roofing gallery Cheshire',
    secondaryKeywords: [
      'roofing before and after photos',
      'completed roofing projects',
    ],
    titleTag: 'Roofing Gallery | Completed Projects | Upgrade Roofs',
    h1: 'Our Completed Roofing Projects',
    cannibalizationNotes: 'Visual proof page — no keyword competition.',
  },
  {
    route: '/case-studies',
    pageType: 'trust',
    primaryKeyword: 'roofing case studies Cheshire',
    secondaryKeywords: [
      'roofing project examples',
      'roof replacement case study',
    ],
    titleTag: 'Roofing Case Studies | Real Projects | Upgrade Roofs',
    h1: 'Roofing Case Studies',
    cannibalizationNotes: 'Differentiated from /gallery by depth of narrative.',
  },
  {
    route: '/contact',
    pageType: 'trust',
    primaryKeyword: 'contact roofer Cheshire',
    secondaryKeywords: [
      'free roofing quote',
      'roofing enquiry Cheshire',
    ],
    titleTag: 'Contact Us | Free Roofing Quote | 01270 897606',
    h1: 'Get in Touch',
    cannibalizationNotes: 'Transactional/navigational intent — no overlap with service pages.',
  },

  // ============================================================
  // CONVERSION PAGES
  // ============================================================
  {
    route: '/special-offer',
    pageType: 'conversion',
    primaryKeyword: 'free roof inspection Cheshire',
    secondaryKeywords: [
      'free roof survey',
      'roof inspection offer',
    ],
    titleTag: 'Free Roof Inspection Across Cheshire | 10-Min Callback | 01270 897606',
    h1: 'Get Your Free Roof Inspection in Cheshire',
    cannibalizationNotes:
      'Cheshire-wide, deliberately not town-specific: the town offers live on the town pages. noindex (lib/routes.ts), so it competes with nothing — Sandbach has been dropped from its title and description so it reads as the county-wide catch-all.',
  },
  {
    route: '/offer-sandbach',
    pageType: 'conversion',
    primaryKeyword: 'free roof inspection Sandbach',
    secondaryKeywords: [
      'roof survey Sandbach',
      'roofing offer Sandbach',
    ],
    titleTag: 'Free Roof Inspection Sandbach | Upgrade Roofs',
    h1: 'Free Roof Inspection in Sandbach',
    cannibalizationNotes:
      'Geo-specific variant of /special-offer. noindex, so it does not compete for the term — /roofers-sandbach is the indexable page that owns "free roof inspection Sandbach".',
  },

  // ============================================================
  // BLOG — informational intent only
  // ============================================================
  {
    route: '/blog',
    pageType: 'informational',
    primaryKeyword: 'roofing advice UK',
    secondaryKeywords: [
      'roofing tips blog',
      'roof maintenance advice',
    ],
    titleTag: 'Roofing Blog | Expert Tips & Advice | Upgrade Roofs',
    h1: 'Roofing Blog',
    cannibalizationNotes: 'Index page — links to posts, no specific topic.',
  },
  {
    route: '/blog/emergency-roof-repairs',
    pageType: 'informational',
    primaryKeyword: 'what to do emergency roof leak',
    secondaryKeywords: [
      'storm damage roof what to do',
      'temporary roof repair DIY',
    ],
    titleTag: 'Emergency Roof Repairs: What to Do When Disaster Strikes',
    h1: 'Emergency Roof Repairs: What to Do When Disaster Strikes',
    cannibalizationNotes:
      'Informational "what to do" angle. /emergency-roofing owns the commercial "hire an emergency roofer" intent.',
  },
  {
    route: '/blog/roof-maintenance-checklist',
    pageType: 'informational',
    primaryKeyword: 'roof maintenance checklist UK',
    secondaryKeywords: [
      'seasonal roof maintenance',
      'how to maintain your roof',
    ],
    titleTag: 'Complete Roof Maintenance Checklist for Homeowners',
    h1: 'Complete Roof Maintenance Checklist',
    cannibalizationNotes: 'Purely informational — no commercial page overlap.',
  },
  {
    route: '/blog/how-long-does-roof-last',
    pageType: 'informational',
    primaryKeyword: 'how long does a roof last UK',
    secondaryKeywords: [
      'roof lifespan by material',
      'when to replace a roof',
    ],
    titleTag: 'How Long Does a Roof Last? Complete UK Guide',
    h1: 'How Long Does a Roof Last?',
    cannibalizationNotes:
      'Research-phase query. /new-roofs owns the transactional "get a new roof" intent.',
  },
  {
    route: '/blog/gutter-maintenance-guide',
    pageType: 'informational',
    primaryKeyword: 'how to maintain gutters UK',
    secondaryKeywords: [
      'gutter cleaning tips',
      'gutter blockage prevention',
    ],
    titleTag: 'Complete Guide to Gutter Maintenance',
    h1: 'Complete Guide to Gutter Maintenance',
    cannibalizationNotes:
      'DIY/informational. /services/gutters-fascias owns "hire someone for gutters".',
  },
  {
    route: '/blog/chimney-repair-guide',
    pageType: 'informational',
    primaryKeyword: 'chimney repair guide UK',
    secondaryKeywords: [
      'chimney repointing guide',
      'signs chimney needs repair',
    ],
    titleTag: "Chimney Repairs: Complete Homeowner's Guide",
    h1: "Chimney Repairs: Complete Homeowner's Guide",
    cannibalizationNotes:
      'Informational guide. /services/chimney-repairs owns commercial intent.',
  },
  {
    route: '/blog/choosing-roofing-contractor',
    pageType: 'informational',
    primaryKeyword: 'how to choose a roofer UK',
    secondaryKeywords: [
      'what to look for in a roofing contractor',
      'avoid cowboy roofers',
    ],
    titleTag: 'How to Choose a Reliable Roofing Contractor',
    h1: 'How to Choose a Reliable Roofing Contractor',
    cannibalizationNotes: 'Pure advice — supports trust, no service page overlap.',
  },
  {
    route: '/blog/skylight-installation-guide',
    pageType: 'informational',
    primaryKeyword: 'is a skylight worth it UK',
    secondaryKeywords: [
      'skylight installation guide',
      'skylight pros and cons',
    ],
    titleTag: 'Skylight Installation Guide: Is It Worth It?',
    h1: 'Skylight Installation Guide',
    cannibalizationNotes:
      'Research intent. /services/skylights-roof-windows owns commercial "install a skylight".',
  },
  {
    route: '/blog/flat-roof-problems',
    pageType: 'informational',
    primaryKeyword: 'common flat roof problems',
    secondaryKeywords: [
      'flat roof leaking causes',
      'flat roof repair vs replacement',
    ],
    titleTag: 'Common Flat Roof Problems and How to Fix Them',
    h1: 'Common Flat Roof Problems and How to Fix Them',
    cannibalizationNotes:
      'Diagnostic intent. /services/flat-roofing owns commercial "get flat roof installed".',
  },
  {
    route: '/blog/roof-damage-signs',
    pageType: 'informational',
    primaryKeyword: 'signs of roof damage UK',
    secondaryKeywords: [
      'how to spot roof damage',
      'roof damage early warning signs',
    ],
    titleTag: 'How to Spot Roof Damage Before It Gets Expensive',
    h1: 'How to Spot Roof Damage Before It Gets Expensive',
    cannibalizationNotes:
      'Awareness intent. /roof-repairs owns "I need a roof repair" commercial intent.',
  },
  {
    route: '/blog/flat-vs-tile-roofs',
    pageType: 'informational',
    primaryKeyword: 'flat roof vs tile roof UK',
    secondaryKeywords: [
      'which roof type lasts longer',
      'flat vs pitched roof pros cons',
    ],
    titleTag: 'Flat vs Tile Roofs: Which Lasts Longer in the UK?',
    h1: 'Flat vs Tile Roofs — Which Lasts Longer?',
    cannibalizationNotes:
      'Comparison intent. Neither /services/flat-roofing nor /services/tile-slate-roofing targets comparison queries.',
  },

  // ============================================================
  // UTILITY
  // ============================================================
  {
    route: '/privacy',
    pageType: 'utility',
    primaryKeyword: 'Upgrade Roofs privacy policy',
    secondaryKeywords: [],
    titleTag: 'Privacy Policy | Upgrade Roofs',
    h1: 'Privacy Policy',
    cannibalizationNotes: 'Branded utility — no competition.',
  },
  {
    route: '/terms',
    pageType: 'utility',
    primaryKeyword: 'Upgrade Roofs terms and conditions',
    secondaryKeywords: [],
    titleTag: 'Terms and Conditions | Upgrade Roofs',
    h1: 'Terms and Conditions',
    cannibalizationNotes: 'Branded utility — no competition.',
  },
];
