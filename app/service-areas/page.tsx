import type { Metadata } from 'next';
import { MapPin, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { QuoteForm } from '@/components/QuoteForm';
import { AuthorityBar } from '@/components/AuthorityBar';
import { SectionHeader } from '@/components/SectionHeader';
import { HeroKicker } from '@/components/HeroKicker';
import { CtaSubMessage } from '@/components/CtaSubMessage';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Roofing Service Areas | Cheshire',
  description: 'Professional roofers serving 15 towns across Cheshire · Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, Holmes Chapel, Winsford, Northwich, Macclesfield, Knutsford, Tarporley, Biddulph, Newcastle-under-Lyme & Wilmslow. CORC certified. Free quotes.',
  keywords: 'roofers Cheshire, roofing service areas, roofers Sandbach, roofers Crewe, roofers Congleton, roofers Middlewich, roofers Nantwich, roofers Macclesfield, roofers Knutsford, roofers Wilmslow',
  openGraph: {
    title: 'Roofing Service Areas | 15 Towns Across Cheshire & Beyond',
    description: 'Professional roofing across 15 towns · Sandbach, Crewe, Middlewich, Congleton, Nantwich, Alsager, Holmes Chapel, Winsford, Northwich, Macclesfield, Knutsford, Tarporley, Biddulph, Newcastle-under-Lyme & Wilmslow.',
    url: 'https://www.upgraderoofs.co.uk/service-areas',
    siteName: 'Upgrade Roofs',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/service-areas' },
  robots: { index: true, follow: true },
};

const serviceAreas = [
  {
    name: 'Sandbach',
    href: '/roofers-sandbach',
    description: 'Our home base. We cover all of Sandbach including Elworth, Wheelock, Sandbach Heath, Ettiley Heath, and Arclid.',
    postcode: 'CW11',
    responseTime: 'Same day',
    featured: true
  },
  {
    name: 'Crewe',
    href: '/roofers-crewe',
    description: 'Full roofing coverage across Crewe including Nantwich Road, Edleston, Leighton West, and Sydney.',
    postcode: 'CW1, CW2',
    responseTime: '30 mins',
  },
  {
    name: 'Middlewich',
    href: '/roofers-middlewich',
    description: 'Serving Middlewich town centre, Cledford, Kinderton, and the surrounding CW10 area.',
    postcode: 'CW10',
    responseTime: '20 mins',
  },
  {
    name: 'Congleton',
    href: '/roofers-congleton',
    description: 'Professional roofing across Congleton including Mossley, West Heath, Buglawton, and Astbury.',
    postcode: 'CW12',
    responseTime: '30 mins',
  },
  {
    name: 'Nantwich',
    href: '/roofers-nantwich',
    description: 'Expert roofing for Nantwich properties including Stapeley, Willaston, and the historic town centre.',
    postcode: 'CW5',
    responseTime: '35 mins',
  },
  {
    name: 'Alsager',
    href: '/roofers-alsager',
    description: 'Reliable roofing services across Alsager, Radway Green, and Oakhanger.',
    postcode: 'ST7',
    responseTime: '30 mins',
  },
  {
    name: 'Holmes Chapel',
    href: '/roofers-holmes-chapel',
    description: 'Quality roofing for Holmes Chapel village and surrounding rural properties.',
    postcode: 'CW4',
    responseTime: '20 mins',
  },
  {
    name: 'Winsford',
    href: '/roofers-winsford',
    description: '1970s–80s estates, post-war housing, and newer developments across the CW7 area. Experienced with concrete tile replacement and flat roof installations.',
    postcode: 'CW7',
    responseTime: '25 mins',
  },
  {
    name: 'Northwich',
    href: '/roofers-northwich',
    description: 'Victorian terraces, post-war estates, and riverside properties across CW8 and CW9. Specialists in subsidence-aware roofing and heritage slate work.',
    postcode: 'CW8 / CW9',
    responseTime: '35 mins',
  },
  {
    name: 'Macclesfield',
    href: '/roofers-macclesfield',
    description: 'Serving Macclesfield town centre, Hurdsfield, Tytherington, and the Pennine-edge communities of Prestbury and Bollington across SK10 and SK11.',
    postcode: 'SK10 / SK11',
    responseTime: '40 mins',
  },
  {
    name: 'Knutsford',
    href: '/roofers-knutsford',
    description: 'Heritage roofing specialists for Knutsford\'s Georgian listed buildings, conservation area properties, and high-value family homes in the WA16 area.',
    postcode: 'WA16',
    responseTime: '45 mins',
  },
  {
    name: 'Tarporley',
    href: '/roofers-tarporley',
    description: 'Period and rural roofing across Tarporley market town, Bunbury, Beeston, and Peckforton. Experienced with listed buildings and farmhouse re-roofs.',
    postcode: 'CW6',
    responseTime: '40 mins',
  },
  {
    name: 'Biddulph',
    href: '/roofers-biddulph',
    description: 'Moorland-rated roofing for Biddulph and the ST8 area. Dry ridge and dry hip systems specified for exposed upland conditions. Storm repairs available 24/7.',
    postcode: 'ST8',
    responseTime: '35 mins',
  },
  {
    name: 'Newcastle-under-Lyme',
    href: '/roofers-newcastle-under-lyme',
    description: 'Professional roofing for Victorian terraces, post-war estates, and commercial properties across Newcastle-under-Lyme and the ST5 postcode area.',
    postcode: 'ST5',
    responseTime: '35 mins',
  },
  {
    name: 'Wilmslow',
    href: '/roofers-wilmslow',
    description: 'Quality-first roofing for Wilmslow\'s executive homes, complex roof geometry, period properties, and conservation areas across the SK9 postcode.',
    postcode: 'SK9',
    responseTime: '45 mins',
  },
];

const areaListSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Upgrade Roofs Service Areas',
  description: 'Towns and areas served by Upgrade Roofs across Cheshire, Staffordshire, and surrounding regions.',
  numberOfItems: serviceAreas.length,
  itemListElement: serviceAreas.map((area, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: `Roofers ${area.name}`,
    url: `https://www.upgraderoofs.co.uk${area.href}`,
  })),
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.upgraderoofs.co.uk' },
    { '@type': 'ListItem', position: 2, name: 'Service Areas', item: 'https://www.upgraderoofs.co.uk/service-areas' },
  ],
};

export default function ServiceAreasPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative py-16 sm:py-20 bg-gradient-to-r from-brand-navy via-brand-navy/95 to-brand-navy/80">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center text-white">
            <HeroKicker light align="center" className="mb-6">Based in Sandbach, Serving All of Cheshire</HeroKicker>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Roofing Service Areas Across <span className="text-brand-orange">Cheshire & Beyond</span>
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Based in Sandbach, Upgrade Roofs serves 15 towns across Cheshire, Staffordshire, and the Pennine fringe · from Wilmslow and Knutsford in the north to Newcastle-under-Lyme in the south. Over 25 years of local experience, CORC certified, £10M insured.
            </p>
            <div className="flex flex-col items-center gap-2">
              <QuoteForm trigger={
                <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-8 h-14">
                  Get a Free Quote
                </Button>
              } />
              <CtaSubMessage dark />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <AuthorityBar />

      {/* Map + Coverage Info */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="aspect-video overflow-hidden border border-gray-200 border-l-4 border-l-brand-navy">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d76832.89194948935!2d-2.3679!3d53.1461!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487a5d28e86e4263%3A0x38c19e53b2954d45!2sSandbach!5e0!3m2!1sen!2suk!4v1699000000000!5m2!1sen!2suk"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Upgrade Roofs service area centred on Sandbach, Cheshire"
                />
              </div>
            </div>
            <div>
              <SectionHeader
                align="left"
                kicker="Our Coverage"
                title="Based in Sandbach, Covering Cheshire"
                className="mb-4"
              />
              <p className="text-gray-600 mb-6 leading-relaxed">
                Our office at 20 Crewe Road, Sandbach puts us within reach of 15 towns across Cheshire, Staffordshire, and the Pennine fringe. From Winsford and Holmes Chapel on the doorstep to Wilmslow, Knutsford, and Macclesfield further north · and Newcastle-under-Lyme and Biddulph to the south · we cover a wide service area while keeping response times fast.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-brand-orange mt-1 flex-shrink-0" />
                  <p className="text-gray-600"><strong className="text-brand-navy">20 Crewe Rd, Sandbach, CW11 4NE</strong> · centrally located for all of south Cheshire.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-brand-orange mt-1 flex-shrink-0" />
                  <p className="text-gray-600"><strong className="text-brand-navy">Same-day inspections</strong> available for most towns. Emergency response within 30 minutes.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-orange mt-1 flex-shrink-0" />
                  <p className="text-gray-600"><strong className="text-brand-navy">No call-out charges</strong> for quotes and inspections. Free written estimates on all work.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Area Cards */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <SectionHeader
            kicker="Service Areas"
            title={<>15 Towns & Areas We <span className="text-brand-orange">Serve</span></>}
            subtitle="Click any area to see our full range of local roofing services, pricing guidance, and FAQs for that town."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceAreas.map((area, i) => (
              <Link key={i} href={area.href} className={`group bg-white p-6 border border-l-4 transition-colors ${area.featured ? 'border-brand-orange ring-1 ring-brand-orange/30' : 'border-gray-200 border-l-brand-navy hover:border-brand-orange/50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-brand-navy group-hover:text-brand-orange transition-colors">{area.name}</h3>
                  {area.featured && <span className="px-2 py-1 bg-brand-orange text-white text-xs font-semibold rounded-full">Home Base</span>}
                </div>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">{area.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Postcode: <strong className="text-brand-navy">{area.postcode}</strong></span>
                  <span className="text-gray-500">Response: <strong className="text-brand-navy">{area.responseTime}</strong></span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-brand-orange font-semibold text-sm">
                  View {area.name} roofing services <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="bg-brand-navy border-l-4 border-l-brand-orange p-8 md:p-12 text-center text-white">
            <SectionHeader
              dark
              kicker="Check Coverage"
              title="Not Sure If We Cover Your Area?"
              subtitle="Based in Sandbach, we serve most of Cheshire and surrounding areas. Give us a call and we'll confirm we can help."
            />
            <div className="flex flex-col items-center gap-2">
              <QuoteForm trigger={
                <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-8 h-14">
                  Get Your Free Quote
                </Button>
              } />
              <CtaSubMessage dark />
            </div>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(areaListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </div>
  );
}
