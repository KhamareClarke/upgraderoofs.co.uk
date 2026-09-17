import { PHONE_DISPLAY } from './contact';
/**
 * ---------------------------------------------------------------
 * PER-TOWN UNIQUE CONTENT — structured data source for town pages.
 *
 * Each town gets unique:
 *   - landmarks & neighbourhood references
 *   - common roofing problems specific to the area
 *   - a local proof point / social proof statement
 *   - postcode area
 *   - distance from base
 *   - property types typical to the area
 *   - a unique CTA line
 *
 * This file is the ONLY place town-specific content lives.
 * The AreaPageTemplate renders it — the page files just select a town.
 * ---------------------------------------------------------------
 */

export interface TownData {
  slug: string;
  town: string;
  postcode: string;
  distanceFromBase: string;
  emergencyResponseTime: string;
  intro: string;
  localContext: string;
  roofingChallenges: string;
  /** Unique landmarks or neighbourhood names for this town */
  landmarks: string[];
  /** Common property types in this town */
  propertyTypes: string[];
  /** Common roofing problems specific to this town */
  commonProblems: { problem: string; solution: string }[];
  /** Local proof point — e.g. "We've completed 40+ jobs in CW1" */
  proofPoint: string;
  /** Town-specific CTA line */
  ctaLine: string;
  faqs: { q: string; a: string }[];
  nearbyAreas: { name: string; href: string }[];
  /**
   * Optional hero paragraph for the town landing page, when it needs to differ
   * from `intro`. `intro` is shared with the /roofers-<town>/<service> matrix
   * pages, so a town whose landing page targets a different term sets its own
   * lede here rather than editing `intro` and changing both.
   */
  heroIntro?: string;
  /**
   * Optional long-form local prose, rendered as the answer to the first question
   * in the FAQ list. Plain strings, not JSX — keep any inline link targets out of
   * here and let the services block and case studies carry them.
   */
  localProse?: string[];
  /**
   * Optional named case studies. Only towns with real, documented jobs have
   * these; never invent one to fill the section on another town.
   */
  caseStudies?: {
    title: string;
    service: string;
    location: string;
    issue: string;
    solution: string;
    result: string;
    href: string;
    serviceLabel: string;
  }[];
}

export const townData: Record<string, TownData> = {
  crewe: {
    slug: 'roofers-crewe',
    town: 'Crewe',
    postcode: 'CW1 / CW2',
    distanceFromBase: '4 miles from our Sandbach base',
    emergencyResponseTime: '30\u201345 minutes',
    intro:
      `Upgrade Roofs covers Crewe and the surrounding area from our base just 4 miles away in Sandbach. Same-day inspections available on most enquiries.`,
    localContext:
      'Crewe has a diverse mix of property types, from Victorian terraces around Nantwich Road and Edleston Road to post-war council housing and newer developments at Leighton West and Sydney. Each property style brings different roofing requirements, and our team has extensive experience working on all of them. We regularly carry out roof repairs, re-roofing, and flat roof replacements across the CW1 and CW2 postcode areas.',
    roofingChallenges:
      'The railway heritage of Crewe means many older properties have original slate roofs that require specialist maintenance. Exposure to prevailing westerly winds across the Cheshire Plain can accelerate wear on ridge tiles, lead flashing, and mortar joints. We understand these local conditions and specify materials accordingly \u2014 ensuring your roof stands up to the weather Crewe experiences year after year.',
    landmarks: ['Nantwich Road', 'Edleston Road', 'Leighton West', 'Sydney', 'Crewe town centre'],
    propertyTypes: ['Victorian terraces', 'Post-war council housing', 'New-build developments', "Railway workers' cottages"],
    commonProblems: [
      { problem: 'Slate deterioration on Victorian properties', solution: 'We source matching natural Welsh slate for authentic repairs and full re-slating.' },
      { problem: 'Ridge tile lifting from wind exposure', solution: 'We install dry ridge systems rated for exposed locations \u2014 no mortar to crack.' },
      { problem: 'Flat roof failures on garage extensions', solution: 'EPDM or GRP replacement with 20-year guarantee, usually completed in 1\u20132 days.' },
    ],
    proofPoint: 'We have completed over 50 roofing projects in the CW1 and CW2 postcode areas.',
    ctaLine: 'Based in Sandbach \u2014 just 4 miles from Crewe town centre. Same-day inspections available.',
    faqs: [
      { q: 'How quickly can you get to Crewe for a roof repair?', a: 'We are based in Sandbach, just 4 miles from Crewe town centre. For emergencies we can usually arrive within 30-45 minutes. For planned inspections, we can often attend the same day you call.' },
      { q: 'How much does a roof repair cost in Crewe?', a: 'Minor repairs such as replacing a few slipped tiles or re-bedding ridge tiles typically cost \u00a3150-\u00a3500. More significant repairs involving leadwork or valley replacements range from \u00a3500-\u00a32,000. We provide free written quotes before any work begins.' },
      { q: 'Do you work on commercial roofs in Crewe?', a: 'Yes. We carry out flat roofing, cladding, and maintenance work on commercial properties across Crewe, including retail units, offices, and industrial buildings. We hold \u00a310M public liability insurance for commercial projects.' },
      { q: 'Can you replace a roof on a Victorian terrace in Crewe?', a: 'Absolutely. We have extensive experience re-roofing Victorian terraces in Crewe using natural slate and traditional methods. We can match existing materials and work with conservation requirements where needed.' },
    ],
    nearbyAreas: [
      { name: 'Middlewich', href: '/roofers-middlewich' },
      { name: 'Nantwich', href: '/roofers-nantwich' },
      { name: 'Alsager', href: '/roofers-alsager' },
      { name: 'Congleton', href: '/roofers-congleton' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
    ],
  },

  middlewich: {
    slug: 'roofers-middlewich',
    town: 'Middlewich',
    postcode: 'CW10',
    distanceFromBase: '3 miles from our Sandbach base',
    emergencyResponseTime: '20\u201330 minutes',
    intro:
      `Upgrade Roofs is one of the closest roofers to Middlewich, based minutes away in Sandbach. We've covered roofs here for over 25 years.`,
    localContext:
      'Middlewich sits at the junction of three canals and has a rich history reflected in its housing stock. The town centre features a mix of period properties requiring careful roofing attention, while estates around Cledford and Kinderton offer more modern roofing requirements. Our team works across all CW10 postcodes and regularly completes re-roofing, repair, and flat roof projects throughout the town.',
    roofingChallenges:
      `The salt mining heritage beneath Middlewich has caused subsidence issues in some areas, which can affect roof structures and alignment. Combined with the town\u2019s low-lying position near the River Croco, properties here can be more exposed to damp and weathering. We assess every roof with these local factors in mind, recommending materials and methods that account for the specific conditions Middlewich properties face.`,
    landmarks: ['Wheelock Street', 'Cledford', 'Kinderton', 'Trent & Mersey Canal', 'River Croco'],
    propertyTypes: ['Period canal-side properties', 'Modern estates', 'Salt town terraces', 'Canalside conversions'],
    commonProblems: [
      { problem: 'Subsidence-related roof movement', solution: 'We assess structural alignment and install flexible flashing and fixings that accommodate minor movement.' },
      { problem: 'Damp penetration on low-lying properties', solution: 'Enhanced ventilation and breathable membranes to manage moisture from the canal corridor.' },
      { problem: 'Ageing flat roofs on garage extensions near waterways', solution: 'EPDM rubber systems designed for higher moisture environments with 20-year warranties.' },
    ],
    proofPoint: 'Our closest service area \u2014 we can reach any Middlewich address in under 15 minutes.',
    ctaLine: 'Just 3 miles from Middlewich. Often the fastest roofer to your door.',
    faqs: [
      { q: 'How far is your base from Middlewich?', a: 'We are based in Sandbach, approximately 3 miles from Middlewich town centre. We can attend most inspections the same day and reach emergency callouts within 20-30 minutes.' },
      { q: 'Do you handle subsidence-related roof issues in Middlewich?', a: 'Yes. We have experience working on properties affected by historic subsidence in Middlewich. We can assess structural movement impacts on your roof and carry out appropriate repairs or reinforcement work.' },
      { q: 'How much does a new roof cost in Middlewich?', a: 'A terraced house re-roof typically costs \u00a35,000-\u00a38,000 in Middlewich. Semi-detached properties range from \u00a36,500 to \u00a310,000. We always provide a free written quote after inspecting the property.' },
      { q: 'Can you repair flat roofs on canal-side properties in Middlewich?', a: 'Absolutely. Many Middlewich properties near the canal have flat roof extensions or garages. We install EPDM and GRP systems with up to 20-year guarantees, designed to handle the higher moisture levels in these locations.' },
    ],
    nearbyAreas: [
      { name: 'Crewe', href: '/roofers-crewe' },
      { name: 'Nantwich', href: '/roofers-nantwich' },
      { name: 'Congleton', href: '/roofers-congleton' },
      { name: 'Alsager', href: '/roofers-alsager' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
    ],
  },

  congleton: {
    slug: 'roofers-congleton',
    town: 'Congleton',
    postcode: 'CW12',
    distanceFromBase: '6 miles from our Sandbach base',
    emergencyResponseTime: '30\u201345 minutes',
    intro:
      `Upgrade Roofs covers Congleton and the surrounding villages from our base in nearby Sandbach. We've worked on Congleton properties for over 25 years.`,
    localContext:
      `Congleton\u2019s position on the edge of the Cheshire Plain, where it meets the foothills of the Pennines, gives the town a unique housing character. The older centre around High Street and Lawton Street features period properties with traditional slate and tile roofs, while estates at Mossley, West Heath, and Buglawton present a mix of 20th-century housing styles. We work across all CW12 postcodes and understand the roofing needs specific to each part of town.`,
    roofingChallenges:
      `Congleton\u2019s slightly elevated position compared to the rest of south Cheshire means properties here face stronger winds and heavier rainfall, particularly from the west. Roofs on the eastern side of town, closer to the hills around Astbury and Biddulph, are especially exposed. We specify fixings and materials rated for higher wind loads when working on these properties, and pay particular attention to ridge tiles, verge pointing, and lead flashing details that are vulnerable in exposed conditions.`,
    landmarks: ['High Street', 'Lawton Street', 'Mossley', 'West Heath', 'Buglawton', 'Astbury'],
    propertyTypes: ['Period town-centre properties', '20th-century estates', 'Pennine-edge cottages', 'Modern developments'],
    commonProblems: [
      { problem: 'Wind damage on elevated properties', solution: 'We install fixings rated for higher wind zones and use dry ridge/verge systems on exposed roofs.' },
      { problem: 'Heavy rainfall penetration', solution: 'Double-layer felt underlay and enhanced flashing details for maximum weather protection.' },
      { problem: 'Ageing slate on town-centre period properties', solution: 'We source matching Welsh slate and reclaimed materials for authentic heritage repairs.' },
    ],
    proofPoint: 'Regularly working on properties across the CW12 postcode from town centre to Astbury.',
    ctaLine: 'Based in Sandbach \u2014 6 miles from Congleton. Emergency response within 30\u201345 minutes.',
    faqs: [
      { q: 'How quickly can you reach Congleton for an emergency?', a: `We are based in Sandbach, approximately 6 miles from Congleton. For emergencies we can typically arrive within 30-45 minutes. Call ${PHONE_DISPLAY} for emergencies.` },
      { q: 'Do you work on older properties in Congleton town centre?', a: 'Yes. We have extensive experience with period properties in Congleton, including natural slate re-roofing, lime mortar ridge work, and lead flashing repairs. We can match existing materials sympathetically.' },
      { q: 'How much does a roof replacement cost in Congleton?', a: 'Typical costs in Congleton range from \u00a35,000-\u00a38,000 for terraced houses, \u00a37,000-\u00a311,000 for semi-detached, and \u00a39,000-\u00a316,000+ for larger detached properties. We always provide a free inspection and written quote first.' },
      { q: 'Can you fix storm damage to roofs in Congleton?', a: "Yes. Congleton properties can be more exposed to storm damage due to the town's position. We provide 24/7 emergency response for storm damage, including make-safe work, tarpaulin cover, and permanent repairs. We also handle insurance claims paperwork." },
    ],
    nearbyAreas: [
      { name: 'Crewe', href: '/roofers-crewe' },
      { name: 'Middlewich', href: '/roofers-middlewich' },
      { name: 'Nantwich', href: '/roofers-nantwich' },
      { name: 'Alsager', href: '/roofers-alsager' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
    ],
  },

  nantwich: {
    slug: 'roofers-nantwich',
    town: 'Nantwich',
    postcode: 'CW5',
    distanceFromBase: '8 miles from our Sandbach base',
    emergencyResponseTime: '30\u201345 minutes',
    intro:
      'Upgrade Roofs covers Nantwich and the surrounding countryside from Sandbach, just 8 miles away. Over 25 years of roofing experience across Cheshire.',
    localContext:
      `Nantwich is one of Cheshire\u2019s most architecturally distinctive towns. The centre is home to over 150 listed buildings, many with original timber-frame construction and period roofing. Beyond the historic core, areas like Stapeley, Willaston, and the Barony estate feature a range of housing from Georgian through to modern builds. We work across all CW5 postcodes and have completed roofing projects on properties of every age and style in the Nantwich area.`,
    roofingChallenges:
      'The high concentration of period and listed buildings in Nantwich means roofing work often requires specialist knowledge of traditional materials and conservation-sensitive methods. We regularly work with natural Welsh slate, handmade clay tiles, and lime-based mortars to match existing roof finishes. For newer properties, the flat agricultural landscape around Nantwich means roofs are fully exposed to wind-driven rain from the west, so we ensure weatherproofing details are robust and correctly specified.',
    landmarks: ['Nantwich town centre', 'Stapeley', 'Willaston', 'The Barony', 'Welsh Row'],
    propertyTypes: ['Tudor timber-frame buildings', 'Georgian townhouses', 'Listed properties', 'Modern estates at Stapeley'],
    commonProblems: [
      { problem: 'Conservation-sensitive repairs on listed buildings', solution: 'We use handmade clay tiles, Welsh slate, and lime mortar to meet planning conditions.' },
      { problem: 'Wind-driven rain on exposed rural properties', solution: 'Enhanced weatherproofing with breathable membranes and robust flashing details.' },
      { problem: 'Timber-frame movement affecting roof alignment', solution: 'Flexible fixing methods that accommodate seasonal structural movement in period buildings.' },
    ],
    proofPoint: 'Experienced with listed and conservation-area properties \u2014 over 150 listed buildings in Nantwich alone.',
    ctaLine: 'Heritage roofing specialists serving Nantwich and the CW5 postcode area.',
    faqs: [
      { q: 'Can you work on listed buildings in Nantwich?', a: 'Yes. We have experience working on period and listed properties in Nantwich using traditional materials including natural Welsh slate, handmade clay tiles, and lime mortar. We understand conservation area requirements and can advise on material choices that meet planning conditions.' },
      { q: 'How quickly can you reach Nantwich?', a: `We are based in Sandbach, approximately 8 miles from Nantwich. Standard inspections can usually be arranged for the same or next day. Emergency callouts reach Nantwich within 30-45 minutes. Call ${PHONE_DISPLAY} for emergencies.` },
      { q: 'Do you offer roof maintenance contracts in Nantwich?', a: 'Yes. We provide annual roof inspection and maintenance packages for Nantwich homeowners. Regular maintenance catches small issues before they become expensive problems \u2014 particularly important for the older properties Nantwich is known for.' },
      { q: 'How much does re-roofing cost in Nantwich?', a: 'Costs depend on property size and materials. A typical terraced house re-roof starts from \u00a35,000, semi-detached from \u00a36,500, and detached from \u00a39,000. Listed properties requiring specialist materials may cost more. We always provide a detailed free quote.' },
    ],
    nearbyAreas: [
      { name: 'Crewe', href: '/roofers-crewe' },
      { name: 'Middlewich', href: '/roofers-middlewich' },
      { name: 'Congleton', href: '/roofers-congleton' },
      { name: 'Alsager', href: '/roofers-alsager' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
    ],
  },

  alsager: {
    slug: 'roofers-alsager',
    town: 'Alsager',
    postcode: 'ST7',
    distanceFromBase: '5 miles from our Sandbach base',
    emergencyResponseTime: '25\u201335 minutes',
    intro:
      'Upgrade Roofs covers Alsager from Sandbach, just 5 miles away. Fast response times and over 25 years of roofing experience.',
    localContext:
      `Alsager is a well-established residential town with a housing stock that ranges from pre-war semis around Crewe Road and Sandbach Road to modern family estates at Radway Green and Oakhanger. The town\u2019s popularity with families and retirees means roofing standards here matter \u2014 people invest in their properties and expect quality workmanship. We\u2019ve completed hundreds of projects across the ST7 postcode area, including full re-roofs, flat roof replacements, chimney repairs, and emergency call-outs.`,
    roofingChallenges:
      `Alsager\u2019s position on the south-east edge of Cheshire means properties face weather from both the Cheshire Plain and the higher ground to the east. The older housing stock around the town centre often features concrete interlocking tiles from the 1960s-80s that are now reaching the end of their serviceable life. We regularly advise Alsager homeowners on the best time to replace ageing roofs before they develop costly problems \u2014 and can match or upgrade materials to suit both budget and property character.`,
    landmarks: ['Crewe Road', 'Sandbach Road', 'Radway Green', 'Oakhanger', 'Alsager town centre'],
    propertyTypes: ['Pre-war semi-detached', '1960s\u201380s estates', 'Modern family homes', 'Bungalows'],
    commonProblems: [
      { problem: 'Deteriorating 1960s\u201380s concrete interlocking tiles', solution: 'Full strip-and-retile with modern lightweight tiles, new felt, battens, and ventilation to current regs.' },
      { problem: 'Chimney deterioration on older semi-detached houses', solution: 'Repointing, lead flashing renewal, and cowl installation to prevent water ingress.' },
      { problem: 'Loft condensation in poorly ventilated bungalows', solution: 'Roof ventilation upgrades and breathable membrane installation during re-roofing.' },
    ],
    proofPoint: 'Hundreds of completed projects across the ST7 postcode \u2014 Alsager is one of our busiest areas.',
    ctaLine: 'Just 5 miles from Alsager. Fast response, quality work, 10-year guarantee.',
    faqs: [
      { q: 'How far are you from Alsager?', a: 'Our base in Sandbach is approximately 5 miles from Alsager town centre. We can attend routine inspections the same or next day, and emergency callouts reach Alsager within 30 minutes.' },
      { q: 'Do you replace concrete tile roofs in Alsager?', a: 'Yes. Many Alsager properties from the 1960s-80s have concrete interlocking tiles that are now deteriorating. We strip and re-tile these roofs using modern lightweight tiles or natural slate, with new felt, battens, and ventilation to current building regulations.' },
      { q: 'How much does a new roof cost in Alsager?', a: 'A terraced house re-roof in Alsager typically costs \u00a35,000-\u00a37,500. Semi-detached properties range from \u00a36,500-\u00a310,000. Larger detached homes from \u00a39,000 upwards. We provide free detailed quotes after inspecting your property.' },
      { q: 'Can you fit skylights in Alsager properties?', a: 'Yes. We are experienced VELUX installers and fit skylights into both pitched and flat roofs across Alsager. Skylights are an excellent way to add natural light to loft conversions and extensions.' },
    ],
    nearbyAreas: [
      { name: 'Crewe', href: '/roofers-crewe' },
      { name: 'Middlewich', href: '/roofers-middlewich' },
      { name: 'Congleton', href: '/roofers-congleton' },
      { name: 'Nantwich', href: '/roofers-nantwich' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
    ],
  },

  winsford: {
    slug: 'roofers-winsford',
    town: 'Winsford',
    postcode: 'CW7',
    distanceFromBase: '8 miles from our Sandbach base',
    emergencyResponseTime: '20–35 minutes',
    intro: 'Upgrade Roofs covers Winsford and the CW7 postcode area from Sandbach, just 8 miles away. Over 25 years of roofing experience across Cheshire.',
    localContext: "Winsford is one of Cheshire's largest towns, with a significant proportion of post-war and 1970s–1980s housing. The Swanlow, Dene, and Grange estates are home to large numbers of semi-detached and terraced properties, many of which now have roofs approaching the end of their serviceable life. More recently developed areas around Wharton and the Dingle also feature newer housing stock. We regularly complete re-roofs, flat roof replacements, and repair work across the CW7 postcode.",
    roofingChallenges: "Winsford's former salt mining heritage can cause ground movement that affects roof structures and alignment in some parts of the town. Many 1970s and 1980s properties have concrete interlocking tiles that are now deteriorating — showing signs of cracking, moss growth, and broken fixings. We assess these issues on every visit and recommend the most cost-effective solution, whether that is targeted repair or full re-roofing with modern materials.",
    landmarks: ['Swanlow', 'Dene Drive', 'Wharton', 'The Grange', 'Winsford town centre'],
    propertyTypes: ['1970s–80s semi-detached estates', 'Post-war council housing', 'Newer private developments', 'Former social housing right-to-buy'],
    commonProblems: [
      { problem: 'Deteriorating concrete interlocking tiles on 1970s properties', solution: 'Full strip-and-retile with modern lightweight tiles, new felt, battens, and ventilation to current building regulations.' },
      { problem: 'Subsidence-related roof movement from salt mining legacy', solution: 'Structural assessment before re-roofing, with flexible fixings and underlays that accommodate minor movement.' },
      { problem: 'Flat roof failures on garage extensions', solution: 'EPDM rubber or GRP fibreglass replacement with 20-year waterproof guarantees, typically completed in 1–2 days.' },
    ],
    proofPoint: 'Serving the CW7 area from our Sandbach base — typically the closest professional roofer for Winsford call-outs.',
    ctaLine: '8 miles from Winsford. Fast response, free written quotes, 10-year guarantee.',
    faqs: [
      { q: 'How far are you from Winsford?', a: `We are based in Sandbach, approximately 8 miles from Winsford town centre. We can attend most inspections the same day, and emergency callouts typically reach Winsford within 20–35 minutes. Call ${PHONE_DISPLAY}.` },
      { q: 'Do you replace concrete tile roofs in Winsford?', a: 'Yes. Many Winsford properties from the 1970s and 1980s have concrete interlocking tiles that are now deteriorating. We strip and re-tile these roofs with modern lightweight tiles or natural slate, complete with new felt, battens, and ventilation to current building regulations.' },
      { q: 'How much does a roof replacement cost in Winsford?', a: 'A terraced house re-roof in Winsford typically costs £4,500–£7,500. Semi-detached properties range from £6,000–£10,000. We always provide a free inspection and written quote before any work begins.' },
      { q: 'Do you repair flat roofs on Winsford extensions?', a: 'Absolutely. We regularly install EPDM and GRP flat roofing systems on extensions and garages across Winsford. These systems carry 20-year waterproof guarantees and are typically completed within 1–2 days.' },
    ],
    nearbyAreas: [
      { name: 'Middlewich', href: '/roofers-middlewich' },
      { name: 'Northwich', href: '/roofers-northwich' },
      { name: 'Crewe', href: '/roofers-crewe' },
      { name: 'Nantwich', href: '/roofers-nantwich' },
      { name: 'Tarporley', href: '/roofers-tarporley' },
    ],
  },

  northwich: {
    slug: 'roofers-northwich',
    town: 'Northwich',
    postcode: 'CW8 / CW9',
    distanceFromBase: '13 miles from our Sandbach base',
    emergencyResponseTime: '30–45 minutes',
    intro: 'Upgrade Roofs covers Northwich and the CW8 and CW9 postcode areas from Sandbach, 13 miles away. CORC-certified roofing for all property types.',
    localContext: "Northwich has a rich architectural heritage shaped by its salt mining past. The town centre and areas such as Witton, Castle, and Hartford feature Victorian and Edwardian terraces alongside newer developments. Winnington and Barnton to the north include more post-war housing stock, while the riverside areas around the Weaver Navigation have a mix of period and converted properties. We work across all CW8 and CW9 postcodes and regularly complete roof repairs, re-roofing projects, and flat roof installations across the town.",
    roofingChallenges: "Like much of mid-Cheshire, Northwich has a subsidence risk from historic brine extraction — one of the most significant in England. Properties in certain areas can experience gradual settlement that affects roof structures and flashings over time. We inspect for these issues and specify materials and fixings that accommodate movement. Older properties in Northwich also frequently have original slate roofs that require specialist knowledge to maintain or replace sensitively.",
    landmarks: ['Hartford', 'Winnington', 'Barnton', 'Witton', 'Northwich town centre', 'Anderton Boat Lift area'],
    propertyTypes: ['Victorian and Edwardian terraces', 'Post-war semi-detached estates', 'Modern developments', 'Riverside and canal-side properties'],
    commonProblems: [
      { problem: 'Subsidence movement affecting roof ridge and flashings', solution: 'We assess structural movement and install flexible systems that accommodate settlement without cracking.' },
      { problem: 'Original slate deterioration on Victorian properties', solution: 'We source matching Welsh slate or quality reclaimed alternatives for authentic heritage repairs.' },
      { problem: 'Moisture penetration on low-lying riverside properties', solution: 'Enhanced breathable underlays and robust flashing detailing to manage the higher ambient moisture in riverside locations.' },
    ],
    proofPoint: 'Regular roofing projects across CW8 and CW9 — from Victorian terraces to modern estates.',
    ctaLine: 'Serving Northwich from our Sandbach base. Free inspections, written quotes, no obligation.',
    faqs: [
      { q: 'How quickly can you reach Northwich for an emergency?', a: `We are based in Sandbach, approximately 13 miles from Northwich. For emergencies we typically reach Northwich within 30–45 minutes. For planned work, same-day or next-day inspections are usually available. Call ${PHONE_DISPLAY}.` },
      { q: 'Do you work on properties affected by subsidence in Northwich?', a: 'Yes. We have experience working on Northwich properties where ground movement has affected roof structures. We carry out a full assessment before re-roofing and use materials and methods that accommodate the conditions found in the CW8 and CW9 areas.' },
      { q: 'Can you match original slate on Victorian properties in Northwich?', a: 'Absolutely. We source natural Welsh slate and quality reclaimed slates to match existing roofs on Victorian and Edwardian properties in Northwich. We can also advise on lime mortar ridge details and conservation-sensitive methods where needed.' },
      { q: 'How much does a new roof cost in Northwich?', a: 'A terraced house re-roof typically costs £5,000–£8,000. Semi-detached properties range from £6,500–£10,000. We provide a free inspection and detailed written quote before any work begins.' },
    ],
    nearbyAreas: [
      { name: 'Winsford', href: '/roofers-winsford' },
      { name: 'Middlewich', href: '/roofers-middlewich' },
      { name: 'Knutsford', href: '/roofers-knutsford' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
      { name: 'Crewe', href: '/roofers-crewe' },
    ],
  },

  macclesfield: {
    slug: 'roofers-macclesfield',
    town: 'Macclesfield',
    postcode: 'SK10 / SK11',
    distanceFromBase: '15 miles from our Sandbach base',
    emergencyResponseTime: '35–50 minutes',
    intro: "Upgrade Roofs covers Macclesfield and the SK10 and SK11 postcode areas. We handle the town's mix of Victorian terraces and modern estates.",
    localContext: "Macclesfield sits at the foot of the Pennines at an elevation of 150–200 metres, making it one of the more exposed towns in Cheshire. The town centre and areas such as Hurdsfield, Moss Rose, and Tytherington feature Victorian and Edwardian terraces alongside mid-20th-century estates. The affluent areas of Prestbury and Bollington on the outskirts have higher-value properties with period and listed buildings requiring specialist attention. We work across all SK10 and SK11 postcodes and regularly complete re-roofs, storm damage repairs, and slate restorations across the Macclesfield area.",
    roofingChallenges: "Macclesfield's elevated position and proximity to the Pennines means properties here experience significantly more wind and rainfall than lower-lying Cheshire towns. Exposed ridge tiles, verge pointing, and lead flashings take a heavy weathering load, particularly on east- and north-facing roof slopes. We specify fixings rated for higher wind loads, dry ridge and verge systems where appropriate, and robust flashing details to ensure Macclesfield roofs perform long-term against the local conditions.",
    landmarks: ['Hurdsfield', 'Moss Rose', 'Tytherington', 'Prestbury', 'Bollington', 'Macclesfield town centre'],
    propertyTypes: ['Victorian and Edwardian terraces', 'Mid-20th-century semi-detached estates', 'Modern developments', 'Prestbury and Bollington period properties'],
    commonProblems: [
      { problem: 'Wind damage to ridge tiles on exposed elevations', solution: 'We install dry ridge systems rated for high wind zones, eliminating mortar that cracks and fails.' },
      { problem: 'Heavy rainfall penetration on higher ground', solution: 'Double-layer felt underlay and enhanced flashing details for maximum weather protection.' },
      { problem: 'Slate weathering on Victorian town-centre terraces', solution: 'We source natural Welsh slate and reclaimed materials for authentic period repairs.' },
    ],
    proofPoint: 'Completing roofing projects across SK10 and SK11 — from exposed Pennine-edge properties to town-centre terraces.',
    ctaLine: '15 miles from Macclesfield. Experienced with the exposed conditions in this area. Free quotes.',
    faqs: [
      { q: 'How quickly can you reach Macclesfield for an emergency?', a: `We are based in Sandbach, approximately 15 miles from Macclesfield. For emergencies we typically reach Macclesfield within 35–50 minutes. Call ${PHONE_DISPLAY} and we will dispatch a team as quickly as possible.` },
      { q: 'Do you work on period properties in Prestbury and Bollington?', a: 'Yes. We have experience working on the period properties, listed buildings, and conservation area homes in Prestbury and Bollington. We use natural slate, clay tiles, and traditional methods to maintain the character of these properties.' },
      { q: 'Can you fit dry ridge systems on exposed Macclesfield properties?', a: 'Absolutely. We regularly install dry ridge and dry verge systems on Macclesfield properties that are prone to wind damage. These systems outperform mortar-bedded ridges in exposed locations and require no maintenance.' },
      { q: 'How much does a full re-roof cost in Macclesfield?', a: 'A terraced house re-roof in Macclesfield typically costs £5,000–£8,000. Semi-detached properties range from £7,000–£11,000. Period properties requiring specialist materials may cost more. We always provide a free inspection and written quote.' },
    ],
    nearbyAreas: [
      { name: 'Congleton', href: '/roofers-congleton' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
      { name: 'Knutsford', href: '/roofers-knutsford' },
      { name: 'Biddulph', href: '/roofers-biddulph' },
      { name: 'Wilmslow', href: '/roofers-wilmslow' },
    ],
  },

  knutsford: {
    slug: 'roofers-knutsford',
    town: 'Knutsford',
    postcode: 'WA16',
    distanceFromBase: '17 miles from our Sandbach base',
    emergencyResponseTime: '40–55 minutes',
    intro: "Upgrade Roofs covers Knutsford and the WA16 postcode area. From Georgian homes to modern properties, we match the standard of the town's architecture.",
    localContext: "Knutsford is renowned for its Georgian and Victorian architecture, with a well-preserved town centre that contains numerous listed buildings and conservation area properties. Areas such as the King Street conservation zone, Legh Road, and the surrounding residential roads feature high-value detached and semi-detached properties. Nearby Toft and Ollerton have larger estate properties. Tatton Park borders the town to the east. Our team has experience working on high-value properties and understands the care required when working on Knutsford's most distinctive homes.",
    roofingChallenges: "Working in Knutsford often means meeting strict planning and conservation requirements. Many properties in the town centre are listed or sit within a conservation area, requiring specialist materials — natural Welsh slate, handmade clay tiles, and lime-based mortars — and sensitive working methods. We always advise on the correct materials and can liaise with planning departments where required. For modern properties, the flat agricultural plain around Knutsford also means roofs face unobstructed wind-driven rain from the west.",
    landmarks: ['King Street', 'Legh Road', 'Toft', 'Ollerton', 'Tatton Park area', 'Knutsford town centre'],
    propertyTypes: ['Georgian listed buildings', 'Victorian and Edwardian town houses', 'Substantial detached family homes', 'Conservation area properties'],
    commonProblems: [
      { problem: 'Conservation-sensitive repairs on listed buildings', solution: 'We use handmade clay tiles, Welsh slate, and lime mortar to meet planning and conservation requirements.' },
      { problem: 'Wind-driven rain on exposed rural properties', solution: 'Enhanced weatherproofing with breathable underlays and robust flashing details.' },
      { problem: 'Leadwork deterioration on period properties', solution: 'Traditional lead dressing and code-compliant lead replacement by skilled craftsmen.' },
    ],
    proofPoint: 'Experienced with Knutsford’s listed buildings, conservation areas, and high-value residential properties.',
    ctaLine: 'Heritage roofing specialists serving Knutsford and the WA16 postcode area. Free quotes.',
    faqs: [
      { q: 'Can you work on listed buildings in Knutsford?', a: 'Yes. We have experience working on listed and conservation area properties in Knutsford using traditional materials including natural Welsh slate, handmade clay tiles, and lime mortar. We understand planning conditions and can advise on material choices and any approvals required.' },
      { q: 'How quickly can you reach Knutsford?', a: `We are based in Sandbach, approximately 17 miles from Knutsford. For emergencies we typically arrive within 40–55 minutes. Standard inspections can be arranged same or next day. Call ${PHONE_DISPLAY}.` },
      { q: 'Do you offer roof inspections for high-value properties in Knutsford?', a: 'Yes. We regularly carry out detailed roof inspections on high-value properties in Knutsford and the surrounding area. Our written inspection reports document all findings and prioritise any remedial work required, helping homeowners plan maintenance budgets.' },
      { q: 'How much does a re-roof cost for a large detached property in Knutsford?', a: 'For large detached properties in Knutsford, re-roofing costs typically range from £9,000 to £20,000+, depending on size, roof complexity, and materials. Listed properties requiring specialist materials may cost more. We always provide a detailed free quote after inspection.' },
    ],
    nearbyAreas: [
      { name: 'Northwich', href: '/roofers-northwich' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
      { name: 'Macclesfield', href: '/roofers-macclesfield' },
      { name: 'Wilmslow', href: '/roofers-wilmslow' },
      { name: 'Middlewich', href: '/roofers-middlewich' },
    ],
  },

  tarporley: {
    slug: 'roofers-tarporley',
    town: 'Tarporley',
    postcode: 'CW6',
    distanceFromBase: '15 miles from our Sandbach base',
    emergencyResponseTime: '35–50 minutes',
    intro: "Upgrade Roofs covers Tarporley and the CW6 postcode area. We match period and listed properties with respectful roofing.",
    localContext: "Tarporley is a well-preserved Cheshire market town with a Georgian and Victorian heritage. High Street and its surrounding streets include listed and period buildings, while the wider CW6 area encompasses villages such as Bunbury, Beeston, and Peckforton, many of which have older farmhouses, cottages, and barns. The rural landscape around Tarporley means many properties are fully exposed to weather from the west. Our team works across the full CW6 postcode area and has completed roofing projects on properties ranging from straightforward repairs to full heritage re-roofs.",
    roofingChallenges: "Many Tarporley properties are in conservation areas or are listed, requiring careful selection of materials and methods. We regularly work with natural slate, traditional clay tiles, and lime mortars to ensure repairs and re-roofs are appropriate for their surroundings. The rural and exposed setting around Tarporley also means roofs need to be robustly weatherproofed, particularly on western-facing elevations where wind-driven rain is most intense.",
    landmarks: ['Tarporley High Street', 'Bunbury', 'Beeston', 'Peckforton', 'Tarporley town centre'],
    propertyTypes: ['Georgian and Victorian town buildings', 'Rural farmhouses and cottages', 'Listed properties', 'Modern village homes'],
    commonProblems: [
      { problem: 'Period roof repairs requiring matching materials', solution: 'We source natural slate, reclaimed clay tiles, and use lime mortar for authentic, conservation-appropriate repairs.' },
      { problem: 'Weather exposure on rural and elevated properties', solution: 'Robust fixings, enhanced weatherproofing underlays, and dry ridge systems for exposed locations.' },
      { problem: 'Leadwork failures on older property roofs and valleys', solution: 'Traditional lead dressing and code-compliant lead replacement using skilled craftsmen.' },
    ],
    proofPoint: 'Working across the CW6 postcode — from Tarporley town centre to rural properties at Bunbury and Peckforton.',
    ctaLine: 'Heritage and modern roofing across Tarporley and the CW6 area. Free written quotes.',
    faqs: [
      { q: 'Do you work on listed properties near Tarporley?', a: 'Yes. We work on listed and conservation area properties across the CW6 postcode, including farmhouses, cottages, and period town buildings in Tarporley, Bunbury, and Beeston. We use natural slate, clay tiles, and lime mortar as required.' },
      { q: 'How quickly can you reach Tarporley?', a: `We are based in Sandbach, approximately 15 miles from Tarporley. For emergencies we typically arrive within 35–50 minutes. For standard inspections, same-day or next-day visits are usually available. Call ${PHONE_DISPLAY}.` },
      { q: 'Can you re-roof a rural farmhouse in the CW6 area?', a: 'Absolutely. We have experience re-roofing rural farmhouses and cottages across the CW6 area. We source appropriate materials for each property, including reclaimed Welsh slate, clay ridge tiles, and traditional mortar mixes where required.' },
      { q: 'How much does a roof inspection cost in Tarporley?', a: `We offer free no-obligation inspections and written quotes across the Tarporley area. For properties that require a detailed written condition report, we can discuss our survey options. Call ${PHONE_DISPLAY} to arrange a visit.` },
    ],
    nearbyAreas: [
      { name: 'Nantwich', href: '/roofers-nantwich' },
      { name: 'Northwich', href: '/roofers-northwich' },
      { name: 'Winsford', href: '/roofers-winsford' },
      { name: 'Crewe', href: '/roofers-crewe' },
      { name: 'Macclesfield', href: '/roofers-macclesfield' },
    ],
  },

  biddulph: {
    slug: 'roofers-biddulph',
    town: 'Biddulph',
    postcode: 'ST8',
    distanceFromBase: '12 miles from our Sandbach base',
    emergencyResponseTime: '30–40 minutes',
    intro: "Upgrade Roofs covers Biddulph and the ST8 postcode area. A reliable local roofer matters in these exposed Moorlands conditions.",
    localContext: "Biddulph is a former coal and textile town that retains a strong community and a predominantly Victorian and Edwardian housing stock, particularly around the town centre and Biddulph Moor. Newer estates extend across the lower flanks of the valley. The town's elevated position means roofs here experience higher wind speeds and heavier rainfall than the Cheshire Plain below. We work across the ST8 postcode and regularly complete re-roofs, storm damage repairs, and preventive maintenance work across Biddulph.",
    roofingChallenges: "Biddulph's position on the Staffordshire Moorlands means roofs here are among the most exposed in our service area. Strong winds accelerate the deterioration of ridge and hip tiles, mortar joints, and lead flashings. Frost action also creates more movement in pointing and tile fixings than at lower elevations. We always specify fixings and systems rated for the conditions at Biddulph, and we use dry ridge systems wherever possible to eliminate the mortar failure that is so common on exposed moorland properties.",
    landmarks: ['Biddulph Moor', 'Gillow Heath', 'Brown Lees', 'Biddulph town centre', 'Knypersley'],
    propertyTypes: ['Victorian and Edwardian terraces', 'Post-war semi-detached estates', 'Moorland cottages', 'Modern developments'],
    commonProblems: [
      { problem: 'Mortar failure on ridge and hip tiles due to frost and wind', solution: 'We replace mortar-bedded systems with mechanical dry ridge and dry hip systems rated for exposed upland locations.' },
      { problem: 'Lead flashing cracking from freeze-thaw cycles', solution: 'Full lead flashing replacement using code-compliant lead with appropriate laps and fixings for a watertight, movement-tolerant seal.' },
      { problem: 'Accelerated tile deterioration from UV and wind exposure', solution: 'We assess tile condition carefully and advise on repair versus full re-roofing based on the extent of deterioration found.' },
    ],
    proofPoint: 'Experienced with Biddulph’s exposed moorland conditions — we specify for the actual weather this area receives.',
    ctaLine: '12 miles from Biddulph. Experienced with exposed upland properties. Free quotes.',
    faqs: [
      { q: 'How quickly can you reach Biddulph for an emergency?', a: `We are based in Sandbach, approximately 12 miles from Biddulph. For emergencies we typically reach Biddulph within 30–40 minutes. Call ${PHONE_DISPLAY} for emergency roofing assistance.` },
      { q: 'Do you install dry ridge systems on exposed Biddulph properties?', a: 'Yes. We regularly install dry ridge and dry hip systems on Biddulph properties where mortar failure has caused problems. These systems are rated for the wind speeds experienced in the Staffordshire Moorlands and require no ongoing maintenance.' },
      { q: 'How much does a re-roof cost in Biddulph?', a: 'A terraced house re-roof in Biddulph typically costs £4,500–£7,500. Semi-detached properties range from £6,000–£9,500. We always provide a free inspection and written quote before any work begins.' },
      { q: 'Can you carry out emergency storm damage repairs in Biddulph?', a: 'Yes. We provide 24/7 emergency storm damage response across Biddulph. We can carry out make-safe work, tarpaulin cover, and temporary repairs quickly, followed by a full permanent repair once the weather allows.' },
    ],
    nearbyAreas: [
      { name: 'Congleton', href: '/roofers-congleton' },
      { name: 'Macclesfield', href: '/roofers-macclesfield' },
      { name: 'Newcastle-under-Lyme', href: '/roofers-newcastle-under-lyme' },
      { name: 'Alsager', href: '/roofers-alsager' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
    ],
  },

  'newcastle-under-lyme': {
    slug: 'roofers-newcastle-under-lyme',
    town: 'Newcastle-under-Lyme',
    postcode: 'ST5',
    distanceFromBase: '14 miles from our Sandbach base',
    emergencyResponseTime: '30–45 minutes',
    intro: 'Upgrade Roofs covers Newcastle-under-Lyme and the ST5 postcode area. We work on every property type, from Victorian terraces to modern developments.',
    localContext: "Newcastle-under-Lyme is a large town with a long history as a market and commercial centre. The town features Victorian and Edwardian terraces around the town centre, substantial post-war housing across areas such as Porthill, Westlands, and Silverdale, and more modern developments on the outskirts. The town is adjacent to Stoke-on-Trent and serves a substantial residential and commercial market. We cover all ST5 postcodes and regularly carry out roof repairs, re-roofing projects, and flat roof work across Newcastle-under-Lyme.",
    roofingChallenges: "Newcastle-under-Lyme has a mix of properties from different eras, each with its own roofing characteristics. The older Victorian stock often has original slate that is reaching the end of its life; post-war properties typically have concrete interlocking tiles that are also ageing. The town has a slightly higher elevation and rainfall than the Cheshire Plain, meaning roofs require robust detailing. We assess every property individually and specify materials and methods appropriate for the age and condition of each roof.",
    landmarks: ['Porthill', 'Westlands', 'Silverdale', 'Keele', 'Newcastle-under-Lyme town centre'],
    propertyTypes: ['Victorian and Edwardian terraces', 'Post-war semi-detached estates', 'Modern private developments', 'Commercial and mixed-use properties'],
    commonProblems: [
      { problem: 'Original slate deterioration on Victorian properties', solution: 'We source matching Welsh slate for sympathetic repairs or advise on full re-slating where the majority of slates have failed.' },
      { problem: 'Ageing concrete tiles on post-war estates', solution: 'Strip and re-tile with modern lightweight or natural slate, with new felt, battens, and ventilation to current building regulations.' },
      { problem: 'Flat roof failures on garage and extension roofs', solution: 'EPDM or GRP flat roof systems with 20-year waterproof guarantees, usually completed in 1–2 days.' },
    ],
    proofPoint: 'Providing professional roofing across Newcastle-under-Lyme and the ST5 postcode — free inspections available.',
    ctaLine: '14 miles from Newcastle-under-Lyme. Fast response, free quotes, 10-year guarantee.',
    faqs: [
      { q: 'How quickly can you reach Newcastle-under-Lyme for a roof repair?', a: `We are based in Sandbach, approximately 14 miles from Newcastle-under-Lyme. For emergency call-outs we typically arrive within 30–45 minutes. For planned work, same-day or next-day inspections are usually available. Call ${PHONE_DISPLAY}.` },
      { q: 'Do you work on commercial properties in Newcastle-under-Lyme?', a: 'Yes. We carry out flat roofing, cladding, and repair work on commercial properties across Newcastle-under-Lyme including offices, retail units, and industrial buildings. We carry £10M public liability insurance for commercial projects.' },
      { q: 'Can you replace slate on a Victorian terrace in Newcastle-under-Lyme?', a: 'Absolutely. We have extensive experience re-roofing Victorian terraces in Newcastle-under-Lyme and across Staffordshire. We source natural Welsh slate and can match existing materials for a sympathetic finish.' },
      { q: 'How much does a new roof cost in Newcastle-under-Lyme?', a: 'A terraced house re-roof typically costs £4,500–£7,500. Semi-detached properties range from £6,000–£10,000. We always provide a free inspection and written quote before any work begins.' },
    ],
    nearbyAreas: [
      { name: 'Alsager', href: '/roofers-alsager' },
      { name: 'Biddulph', href: '/roofers-biddulph' },
      { name: 'Crewe', href: '/roofers-crewe' },
      { name: 'Congleton', href: '/roofers-congleton' },
      { name: 'Nantwich', href: '/roofers-nantwich' },
    ],
  },

  wilmslow: {
    slug: 'roofers-wilmslow',
    town: 'Wilmslow',
    postcode: 'SK9',
    distanceFromBase: '18 miles from our Sandbach base',
    emergencyResponseTime: '40–55 minutes',
    intro: "Upgrade Roofs covers Wilmslow and the SK9 postcode area. Craftsmanship and materials matched to the town's high-quality homes.",
    localContext: "Wilmslow is a prosperous Cheshire town known for its executive housing, tree-lined roads, and proximity to Manchester Airport. Areas such as Alderley Edge (adjacent), Hale, and the roads around the town centre feature large detached and semi-detached properties, often with more complex roof geometry than standard housing estates. Conservation areas exist around the older parts of the town. We work across the SK9 postcode and bring the same standards of workmanship and material quality to Wilmslow that the town's homeowners expect from every tradesperson they employ.",
    roofingChallenges: "Wilmslow's large detached properties often have complex roof geometry — multiple hips, valleys, dormers, and roof windows — which creates more potential leak points and demands higher levels of craft skill. Many properties also have large flat roof sections over extensions and garages. The relatively high value of these properties means the cost of a poor-quality roof job, or a delay in addressing problems, is disproportionately high. We take a thorough, detail-oriented approach to every Wilmslow project.",
    landmarks: ['Alderley Edge', 'Hale', 'Handforth', 'Dean Row', 'Wilmslow town centre'],
    propertyTypes: ['Large detached executive homes', 'Period semi-detached', 'Conservation area properties', 'Modern developments with complex rooflines'],
    commonProblems: [
      { problem: 'Valley and hip failures on complex roof geometry', solution: 'Full valley replacement with code-compliant lead or GRP valley systems, with all adjacent tiles lifted, checked, and relaid.' },
      { problem: 'Flat roof failures on garage and extension sections', solution: 'EPDM or GRP replacement to match the quality expected on high-value Wilmslow properties. 20-year warranties.' },
      { problem: 'Lead flashing deterioration on chimneys and dormers', solution: 'Full lead replacement using traditional dressing techniques appropriate for high-value properties.' },
    ],
    proofPoint: 'Providing quality-first roofing for Wilmslow’s demanding residential market — free inspections and written quotes.',
    ctaLine: '18 miles from Wilmslow. Quality-focused roofing to match Wilmslow’s high standards. Free quotes.',
    faqs: [
      { q: 'How quickly can you reach Wilmslow?', a: `We are based in Sandbach, approximately 18 miles from Wilmslow. For emergencies we typically arrive within 40–55 minutes. For planned work, same-day or next-day inspections are usually available. Call ${PHONE_DISPLAY}.` },
      { q: 'Do you work on large detached properties in Wilmslow?', a: 'Yes. We regularly work on the larger, more complex roof structures found on executive homes in Wilmslow. Our team is experienced with multi-section roofs, large lead valley systems, dormers, and roof windows that are common on Wilmslow properties.' },
      { q: 'Can you replace valleys and hips on a complex roof in Wilmslow?', a: 'Absolutely. Valley and hip failures are among the most common issues on larger Wilmslow properties. We use code-compliant lead or GRP valley systems and ensure all surrounding tiles are correctly laid, pointed, and secured before we leave.' },
      { q: 'How much does a re-roof cost for a large home in Wilmslow?', a: 'For a large detached property in Wilmslow, re-roofing costs typically range from £9,000 to £20,000+, depending on size, roof complexity, and materials. We always provide a detailed free inspection and written quote before any work begins.' },
    ],
    nearbyAreas: [
      { name: 'Knutsford', href: '/roofers-knutsford' },
      { name: 'Macclesfield', href: '/roofers-macclesfield' },
      { name: 'Northwich', href: '/roofers-northwich' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
      { name: 'Congleton', href: '/roofers-congleton' },
    ],
  },

  'holmes-chapel': {
    slug: 'roofers-holmes-chapel',
    town: 'Holmes Chapel',
    postcode: 'CW4',
    distanceFromBase: '4 miles from our Sandbach base',
    emergencyResponseTime: '20\u201330 minutes',
    intro:
      `Upgrade Roofs covers Holmes Chapel from Sandbach, just 4 miles away. Fast, reliable roofing for this thriving village.`,
    localContext:
      `Holmes Chapel is one of south Cheshire\u2019s most desirable villages, with a strong community and well-maintained housing stock. The village features attractive period cottages along Station Road and London Road, substantial family homes around Macclesfield Road and Middlewich Road, and newer developments on the village outskirts. We regularly carry out roofing work across the CW4 postcode area, from straightforward repairs to complete re-roofing projects on larger detached properties.`,
    roofingChallenges:
      `Holmes Chapel properties tend to be well-maintained by homeowners who value quality. The village\u2019s rural setting means many roofs are more exposed to weather than urban properties, particularly on the north and west elevations. Older cottages in the village centre often have original slate or clay tile roofs that need specialist care. We regularly work with natural materials to maintain the character of these properties, while ensuring modern weatherproofing standards are met beneath the surface.`,
    landmarks: ['Station Road', 'London Road', 'Macclesfield Road', 'Middlewich Road', 'Holmes Chapel village centre'],
    propertyTypes: ['Period village cottages', 'Substantial detached family homes', 'Rural properties', 'New-build estates'],
    commonProblems: [
      { problem: 'Weather exposure on rural properties', solution: 'We install enhanced weatherproofing with fixings rated for exposed locations.' },
      { problem: 'Original slate/clay tile maintenance on cottages', solution: 'Specialist care using matching natural materials and traditional methods.' },
      { problem: 'Large roof areas on detached properties', solution: 'Phased re-roofing programmes that manage cost while keeping your home protected.' },
    ],
    proofPoint: 'Regular roofing work across the CW4 area \u2014 from village cottages to detached family homes.',
    ctaLine: 'Just 4 miles from Holmes Chapel. Quick response, quality-first approach.',
    faqs: [
      { q: 'How close are you to Holmes Chapel?', a: 'We are based in Sandbach, approximately 4 miles from Holmes Chapel. We can attend most inspections the same day you call, and emergency callouts reach Holmes Chapel within 20-30 minutes.' },
      { q: 'Do you work on cottage roofs in Holmes Chapel?', a: 'Yes. We have experience working on the older cottages and period properties in Holmes Chapel village centre. We use natural slate, clay tiles, and traditional methods to maintain the character of these properties while ensuring they are properly weatherproofed.' },
      { q: 'How much does roof maintenance cost in Holmes Chapel?', a: 'A standard roof inspection and minor maintenance visit typically costs \u00a3100-\u00a3250. Annual maintenance packages are available. Catching small issues early prevents expensive repairs later \u2014 particularly important for the larger properties common in Holmes Chapel.' },
      { q: 'Can you replace a garage flat roof in Holmes Chapel?', a: 'Absolutely. Garage flat roof replacements are one of our most common jobs in Holmes Chapel. We install EPDM rubber or GRP fibreglass systems with up to 20-year waterproof guarantees, typically completed in 1-2 days.' },
    ],
    nearbyAreas: [
      { name: 'Crewe', href: '/roofers-crewe' },
      { name: 'Middlewich', href: '/roofers-middlewich' },
      { name: 'Congleton', href: '/roofers-congleton' },
      { name: 'Nantwich', href: '/roofers-nantwich' },
      { name: 'Alsager', href: '/roofers-alsager' },
    ],
  },

  sandbach: {
    slug: 'roofers-sandbach',
    town: 'Sandbach',
    postcode: 'CW11',
    distanceFromBase: 'our home town — based in Sandbach',
    emergencyResponseTime: '15–20 minutes',
    intro:
      'Upgrade Roofs is based right here in Sandbach. We know CW11 roofs better than anyone, from the town centre to Sandbach Heath.',
    // The landing page leads with the free-inspection offer, so it keeps
    // "roofers Sandbach" in the hero paragraph instead of the H1.
    heroIntro:
      'Upgrade Roofs has been the roofers Sandbach trusts for over 25 years. Book a free, no-obligation inspection — we check the tiles, leadwork, gutters and chimney, then give you a written report with photos so you can see for yourself.',
    localContext:
      'Sandbach is a market town with a proud heritage, and its housing stock reflects that — from Georgian and Victorian properties in the town centre to 1960s–80s estates and modern new-builds on the edges of town. The market square, Saxon Crosses, and surrounding farmland are all landmarks we pass on the way to jobs every day. Our team has completed hundreds of roofing projects across CW11, giving us unmatched knowledge of the local stock.',
    roofingChallenges:
      'Being on the Cheshire Plain, Sandbach properties are exposed to prevailing south-westerly winds that can lift ridge tiles and loosen flashing. Many older town-centre properties have original Welsh slate roofs that need sympathetic repair. We specify materials to match and specify dry-fix systems where mortar bedding is at risk from frost and wind.',
    landmarks: ['Sandbach town centre', 'Saxon Crosses', 'Sandbach Heath', 'Wheelock', 'Elworth', 'Ettiley Heath'],
    propertyTypes: ['Victorian terraces', 'Georgian townhouses', 'Post-war semis', 'Modern new-builds', 'Farmhouses'],
    commonProblems: [
      { problem: 'Ridge tile lifting on exposed properties', solution: 'Dry ridge systems rated for Cheshire Plain wind exposure — no mortar to crack.' },
      { problem: 'Slate deterioration on period town-centre properties', solution: 'Natural Welsh slate sourced to match original roofs for authentic repairs.' },
      { problem: 'Flat roof failures on garage and extension roofs', solution: 'EPDM or GRP replacement with 20-year guarantee, typically completed in 1–2 days.' },
    ],
    proofPoint: 'Our home town — hundreds of roofing projects completed across CW11 over 25+ years.',
    ctaLine: "Your local Sandbach roofer — we're minutes away and know these streets well.",
    faqs: [
      { q: 'Are you actually based in Sandbach?', a: 'Yes. Upgrade Roofs is based at 20 Crewe Road, Sandbach, CW11 4NE. We are genuinely your local roofer — not a call centre that passes your job to a contractor from elsewhere.' },
      { q: 'How quickly can you respond to a roofing emergency in Sandbach?', a: 'Being based in Sandbach means we can reach most addresses in the town within 15–20 minutes for urgent callouts. We aim to attend the same day for emergency roof repairs.' },
      { q: 'How much does a roof repair cost in Sandbach?', a: 'Minor repairs such as replacing a few slipped tiles or repointing ridge mortar typically cost £150–£400 in Sandbach. More involved work involving leadwork or valley repairs ranges from £400–£1,500. We provide a free written quote before any work starts.' },
      { q: 'Do you work on Victorian and period properties in Sandbach town centre?', a: 'Yes. Many of the properties in and around Sandbach town centre are Victorian or Georgian, often with original Welsh slate roofs. We have extensive experience working sympathetically on period properties, sourcing matching slate and using traditional techniques where required.' },
    ],
    nearbyAreas: [
      { name: 'Crewe', href: '/roofers-crewe' },
      { name: 'Middlewich', href: '/roofers-middlewich' },
      { name: 'Congleton', href: '/roofers-congleton' },
      { name: 'Nantwich', href: '/roofers-nantwich' },
      { name: 'Alsager', href: '/roofers-alsager' },
      { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
    ],
    // Ported from the hand-written roofers-sandbach page when it moved onto the
    // shared template, so its depth survives the reskin. Sandbach carries the
    // free-inspection term rather than the generic "roofers" one, which the
    // homepage already owns; the H1 override lives on the page file.
    localProse: [
      'Based at 20 Crewe Road in the heart of Sandbach (CW11 4NE), Upgrade Roofs is a family-run roofing company with deep roots in the local community. We have completed hundreds of roofing projects across Sandbach, from period properties on the High Street and Hightown to modern estates around Elworth, Wheelock, and the Abbeyfields development off Middlewich Road.',
      'We hold full CORC (Confederation of Roofing Contractors) certification, carry £10 million public liability insurance, and provide a 10-year workmanship guarantee on every job. Whether you need a single tile replaced, a full roof strip and re-tile, or an emergency leak repair at 2am, we deliver the same standard of care.',
      'As Sandbach locals ourselves, we understand the specific roofing challenges in this area, from the exposed conditions along the A534 corridor to the older rooflines around Sandbach Heath and Ettiley Heath, and the conservation considerations near the town centre’s listed buildings. We also handle flat roofing on the many 1960s–70s garage and extension roofs found across the CW11 postcode, and chimney repairs on the Victorian terraces along Congleton Road and Middlewich Road.',
    ],
    caseStudies: [
      {
        title: 'Full Re-Roof on Congleton Road, Sandbach',
        service: 'New Roof Installation',
        location: 'Congleton Road, CW11',
        issue: 'A 1930s semi-detached with original concrete tiles showing widespread cracking and water ingress into the loft space. The homeowner noticed damp patches on the bedroom ceiling after heavy rain.',
        solution: 'Complete strip and re-tile using Marley Edgemere interlocking tiles. Replaced all felt and battens, upgraded ventilation to current building regulations, and renewed lead flashings around the chimney stack and soil vent pipe.',
        result: 'Fully watertight roof with 10-year workmanship guarantee and 15-year manufacturer warranty. Completed in 4 working days with minimal disruption.',
        href: '/new-roofs',
        serviceLabel: 'New Roofs',
      },
      {
        title: 'Emergency Leak Repair on Elworth, Sandbach',
        service: 'Emergency Roof Repair',
        location: 'Warmingham Lane, Elworth, CW11',
        issue: 'Urgent call-out after Storm Ciarán caused wind damage, lifting ridge tiles and allowing water to pour into the upstairs hallway. Homeowner called at 7pm on a Friday evening.',
        solution: 'Same-evening make-safe visit. Temporary tarpaulin secured within 90 minutes. Full repair completed the following Monday — re-bedded ridge tiles with a modern dry ridge system, replaced 8 slipped tiles, and re-sealed the lead valley.',
        result: 'No further water ingress. Dry ridge system eliminates future mortar deterioration. Insurance claim documentation provided.',
        href: '/emergency-roofing',
        serviceLabel: 'Emergency Roofing',
      },
      {
        title: 'Flat Roof Replacement in Sandbach Heath',
        service: 'Flat Roofing',
        location: 'Crewe Road, Sandbach Heath, CW11',
        issue: 'A 1970s detached bungalow with a large flat roof over the rear extension. The original felt roof was bubbling and pooling water, causing persistent damp in the kitchen and utility room.',
        solution: 'Full strip of the old felt system. Installed new Firestone EPDM rubber membrane with tapered insulation boards to create positive drainage. New aluminium edge trims and upstand detailing throughout.',
        result: '20-year waterproof guarantee. Energy efficiency improved by the tapered insulation. No more pooling or damp. Completed in 2 days.',
        href: '/services/flat-roofing',
        serviceLabel: 'Flat Roofing',
      },
      {
        title: 'Chimney Rebuild & Lead Work on Wheelock',
        service: 'Chimney Repairs',
        location: 'Crewe Road, Wheelock, CW11',
        issue: 'A Victorian end-terrace with a chimney stack that had deteriorated badly — crumbling mortar joints, cracked pots, and failed lead flashings causing damp on the party wall.',
        solution: 'Scaffolded and rebuilt the top 6 courses of the chimney stack using matching reclaimed bricks. Installed new clay pots and cowls, re-pointed with lime mortar, and fitted new code 4 lead stepped and back-gutter flashings.',
        result: 'Chimney structurally sound and weathertight. Damp issue resolved within weeks of completion. 10-year guarantee on all work.',
        href: '/services/chimney-repairs',
        serviceLabel: 'Chimney Repairs',
      },
    ],
  },
};
