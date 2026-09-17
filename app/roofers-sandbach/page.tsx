import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { QuoteForm } from '@/components/QuoteForm';
import { MapPin, Shield, Clock, Star, ArrowRight, Home, Layers, Flame, Droplets, Zap, Wrench } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { HeroKicker } from '@/components/HeroKicker';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import { TrustBadgeGrid, ServiceAreaHub, FinalCta } from '@/components/SpecialOfferSections';
import { orderAreaLinks } from '@/lib/service-areas';

export const dynamic = 'force-static';
export const revalidate = false;

export default function RoofersSandbachPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/6.jpeg)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/95 to-brand-navy/80" />
        </div>
        <div className="container-custom relative z-10">
          <div className="max-w-3xl">
            <HeroKicker className="mb-6">Sandbach, Cheshire</HeroKicker>
            {/* Sandbach carries the free-inspection offer rather than the generic
                "roofers" term, which the homepage already owns. "roofers Sandbach"
                is kept in the paragraph below and in the section headings so the
                page does not abandon the term outright. */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Free Roof Inspection <span className="text-brand-orange">in Sandbach</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl leading-relaxed">
              Upgrade Roofs has been the roofers Sandbach trusts for over 25 years. Book a free,
              no-obligation inspection — we check the tiles, leadwork, gutters and chimney, then
              give you a written report with photos so you can see for yourself.
            </p>
            <div className="flex flex-col items-center sm:items-start gap-2">
              <QuoteForm trigger={
                <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold px-8 h-14 text-base">
                  Get a Free Quote
                </Button>
              } />
              <CtaSubMessage dark />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar · shared accreditation grid */}
      <TrustBadgeGrid />

      {/* Main Content · Why Sandbach Trusts Us */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <SectionHeader
              align="left"
              kicker="Our Local Reputation"
              title={<>Why Sandbach Homeowners Choose <span className="text-brand-orange">Upgrade Roofs</span></>}
            />
            <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-4">
              <p>
                Based at 20 Crewe Road in the heart of Sandbach (CW11 4NE), Upgrade Roofs is a family-run roofing company 
                with deep roots in the local community. We've completed hundreds of roofing projects across 
                Sandbach · from period properties on the High Street and Hightown to modern estates around Elworth, 
                Wheelock, and the Abbeyfields development off Middlewich Road.
              </p>
              <p>
                We hold full CORC (Confederation of Roofing Contractors) certification, carry £10 million 
                public liability insurance, and provide a 10-year workmanship guarantee on every job. 
                Whether you need a single tile replaced, a full <Link href="/new-roofs" className="text-brand-orange hover:underline font-medium">roof strip and re-tile</Link>, or 
                an <Link href="/emergency-roofing" className="text-brand-orange hover:underline font-medium">emergency leak repair</Link> at 2am, we deliver the 
                same standard of care.
              </p>
              <p>
                As Sandbach locals ourselves, we understand the specific roofing challenges in this area · 
                from the exposed conditions along the A534 corridor to the older rooflines around Sandbach 
                Heath and Ettiley Heath, and the conservation considerations near the town centre's listed buildings. 
                We also handle <Link href="/services/flat-roofing" className="text-brand-orange hover:underline font-medium">flat roofing</Link> on 
                the many 1960s–70s garage and extension roofs found across the CW11 postcode, and 
                <Link href="/services/chimney-repairs" className="text-brand-orange hover:underline font-medium"> chimney repairs</Link> on 
                the Victorian terraces along Congleton Road and Middlewich Road.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services in Sandbach */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <SectionHeader
              kicker="Our Services"
              title="Roofing Services We Offer in Sandbach"
              subtitle="Every roofing service you need, delivered by experienced local tradesmen."
            />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Home, title: 'New Roofs & Re-Roofing', desc: 'Complete roof replacements using premium tiles, slates, and modern materials. Sandbach properties of all sizes.', href: '/new-roofs' },
              { icon: Wrench, title: 'Roof Repairs', desc: 'Fast, reliable repairs for leaks, storm damage, missing tiles, and ridge work across Sandbach.', href: '/roof-repairs' },
              { icon: Layers, title: 'Flat Roofing', desc: 'EPDM rubber and GRP fibreglass flat roofs for garages, extensions, and dormer roofs. 20-year guarantee.', href: '/services/flat-roofing' },
              { icon: Flame, title: 'Chimney Repairs', desc: 'Repointing, lead flashing, chimney stack repairs, and cowl fitting. Common need on older Sandbach properties.', href: '/services/chimney-repairs' },
              { icon: Droplets, title: 'Guttering & Fascias', desc: 'uPVC guttering, fascias, soffits, and downpipes. Repairs, cleaning, and full replacements.', href: '/services/gutters-fascias' },
              { icon: Zap, title: 'Emergency Roofing', desc: '24/7 emergency call-outs across Sandbach. Storm damage, sudden leaks, and urgent make-safe work.', href: '/emergency-roofing' },
            ].map((service, i) => (
              <Link key={i} href={service.href} className="group bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy hover:border-brand-orange/50 hover:border-l-brand-orange transition-all">
                <div className="w-12 h-12 bg-brand-orange/10 rounded-xl flex items-center justify-center mb-4">
                  <service.icon className="w-6 h-6 text-brand-orange" />
                </div>
                <h3 className="text-xl font-bold text-brand-navy mb-2 group-hover:text-brand-orange transition-colors">{service.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">{service.desc}</p>
                <span className="text-brand-orange font-semibold text-sm flex items-center gap-1">
                  Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Sandbach Case Studies */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <SectionHeader
              kicker="Case Studies"
              title={<>Recent Roofing Projects in <span className="text-brand-orange">Sandbach</span></>}
              subtitle="Real jobs we've completed for Sandbach homeowners. Every project backed by our 10-year guarantee."
            />
            <div className="space-y-8">
              {[
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
                  solution: 'Same-evening make-safe visit. Temporary tarpaulin secured within 90 minutes. Full repair completed the following Monday · re-bedded ridge tiles with a modern dry ridge system, replaced 8 slipped tiles, and re-sealed the lead valley.',
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
                  issue: 'A Victorian end-terrace with a chimney stack that had deteriorated badly · crumbling mortar joints, cracked pots, and failed lead flashings causing damp on the party wall.',
                  solution: 'Scaffolded and rebuilt the top 6 courses of the chimney stack using matching reclaimed bricks. Installed new clay pots and cowls, re-pointed with lime mortar, and fitted new code 4 lead stepped and back-gutter flashings.',
                  result: 'Chimney structurally sound and weathertight. Damp issue resolved within weeks of completion. 10-year guarantee on all work.',
                  href: '/services/chimney-repairs',
                  serviceLabel: 'Chimney Repairs',
                },
              ].map((study, i) => (
                <div key={i} className="bg-white border border-gray-200 border-l-4 border-l-brand-orange p-6 sm:p-8 hover:border-brand-orange/70 transition-colors">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-brand-orange/10 text-brand-orange font-semibold text-sm rounded-full">{study.service}</span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5" /> {study.location}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-brand-navy mb-4">{study.title}</h3>
                  <div className="grid sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-brand-navy uppercase tracking-wide mb-1">The Problem</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{study.issue}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-brand-navy uppercase tracking-wide mb-1">What We Did</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{study.solution}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-brand-navy uppercase tracking-wide mb-1">The Result</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{study.result}</p>
                    </div>
                  </div>
                  <Link href={study.href} className="text-brand-orange font-semibold text-sm hover:underline inline-flex items-center gap-1">
                    Learn more about our {study.serviceLabel} service <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sandbach Review Snippets */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-10">
            <SectionHeader
              kicker="Reviews"
              title="What Sandbach Customers Say"
            />
            <div className="flex items-center justify-center gap-2 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
              ))}
            </div>
            <p className="text-gray-600">5.0 average from 127+ Google reviews</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                text: 'Had a leak above our bedroom after the big storm. Called Upgrade Roofs and they were at our house on Middlewich Road within the hour. Temporary fix that night, full repair done by Wednesday. Brilliant service.',
                name: 'James H.',
                location: 'Middlewich Road, Sandbach',
                service: 'Emergency Roof Repair',
              },
              {
                text: 'Complete re-roof on our 1950s semi in Elworth. The team were punctual, tidy, and finished in under a week. New Marley tiles look fantastic and the price was very fair compared to other quotes we had.',
                name: 'Sarah & David P.',
                location: 'Elworth, Sandbach',
                service: 'New Roof',
              },
              {
                text: 'Replaced our flat garage roof with EPDM rubber. No more leaks after 10 years of patching the old felt roof. Quick, clean job with a 20-year guarantee. Would definitely recommend to anyone in Sandbach.',
                name: 'Mark T.',
                location: 'Sandbach Heath',
                service: 'Flat Roofing',
              },
              {
                text: 'Our chimney had been leaking for months. Upgrade Roofs re-pointed the stack and replaced all the lead flashings. The damp patch in the bedroom has completely gone. Really pleased with the work.',
                name: 'Christine L.',
                location: 'Hightown, Sandbach',
                service: 'Chimney Repair',
              },
              {
                text: 'Used Upgrade Roofs for new guttering and fascias on our detached house. The old wooden fascias were rotten. New uPVC looks smart and should last decades. Fair price, no hard sell, great team.',
                name: 'Robert & Anne K.',
                location: 'Wheelock, Sandbach',
                service: 'Guttering & Fascias',
              },
              {
                text: 'Needed a few slipped tiles fixed and some ridge pointing done. Other companies wanted to charge a fortune or wouldn\'t come out for a small job. Upgrade Roofs came the next day and sorted it in a couple of hours. Very reasonable.',
                name: 'Paul S.',
                location: 'Ettiley Heath, Sandbach',
                service: 'Roof Repair',
              },
            ].map((review, i) => (
              <div key={i} className="bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">"{review.text}"</p>
                <div className="border-t pt-3">
                  <p className="font-semibold text-brand-navy text-sm">{review.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {review.location}
                  </p>
                  <p className="text-xs text-brand-orange font-medium mt-1">{review.service}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/reviews" className="text-brand-orange font-semibold hover:underline inline-flex items-center gap-1">
              Read all reviews <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Local Proof / Evidence Block */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionHeader
                align="left"
                kicker="Local Experts"
                title={<>Roofing Experts Who Know <span className="text-brand-orange">Sandbach</span></>}
              />
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-brand-orange/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <MapPin className="w-5 h-5 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-navy mb-1">Based in Sandbach</h3>
                    <p className="text-gray-600 text-sm">Our office is on Crewe Road. We live and work in this community, and our reputation here matters to us.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-brand-orange/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="w-5 h-5 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-navy mb-1">Same-Day Response</h3>
                    <p className="text-gray-600 text-sm">Being local means we can often inspect your roof within hours of your call · not days.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-brand-orange/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Shield className="w-5 h-5 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-navy mb-1">Insurance-Backed Guarantees</h3>
                    <p className="text-gray-600 text-sm">Every job comes with a 10-year workmanship guarantee, backed by our IBG protection scheme.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-brand-orange/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Star className="w-5 h-5 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-navy mb-1">Proven Track Record</h3>
                    <p className="text-gray-600 text-sm">5-star Google reviews from Sandbach customers. We're rated on MyApproved and registered with CORC.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-brand-navy to-brand-navy/90 border-l-4 border-l-brand-orange p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">Sandbach Roofing at a Glance</h3>
              <div className="space-y-5">
                {[
                  { label: 'Years Serving Sandbach', value: '25+' },
                  { label: 'Local Projects Completed', value: '500+' },
                  { label: 'Public Liability Cover', value: '£10M' },
                  { label: 'Workmanship Guarantee', value: '10 Years' },
                  { label: 'Google Review Rating', value: '5.0 Stars' },
                  { label: 'Emergency Response', value: 'Same Day' },
                ].map((stat, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-white/10 pb-3 last:border-0">
                    <span className="text-white/80">{stat.label}</span>
                    <span className="font-bold text-brand-orange">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sandbach-Specific FAQ */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <SectionHeader
              kicker="FAQs"
              title="Common Roofing Questions in Sandbach"
            />
            <div className="space-y-4">
              {[
                {
                  q: 'How much does a new roof cost in Sandbach?',
                  a: 'A typical terraced house re-roof in Sandbach costs between £5,000 and £8,000. Semi-detached properties usually range from £6,500 to £10,000, and larger detached homes from £8,000 to £15,000+. We provide free, written quotes with no hidden costs.'
                },
                {
                  q: 'Do you offer emergency roof repairs in Sandbach?',
                  a: 'Yes. We provide 24/7 emergency roofing across Sandbach and surrounding areas. As we\'re based on Crewe Road, we can usually reach any Sandbach address within 30 minutes for urgent leaks, storm damage, or make-safe work. Call 01270 897606 for emergencies.'
                },
                {
                  q: 'What areas of Sandbach do you cover?',
                  a: 'We cover all of Sandbach including the town centre, Elworth, Wheelock, Sandbach Heath, Ettiley Heath, Arclid, and all surrounding villages. We also serve Middlewich, Crewe, Congleton, and the wider Cheshire area.'
                },
                {
                  q: 'Are you a registered roofing contractor?',
                  a: 'Yes. We are CORC (Confederation of Roofing Contractors) certified, Freefoam approved installers, and Marley registered installers. We carry £10M public liability insurance and provide insurance-backed guarantees on all work.'
                },
                {
                  q: 'How long does a roof replacement take in Sandbach?',
                  a: 'Most residential roof replacements take 3 to 7 working days depending on property size and weather. We schedule work to minimise disruption, and all debris is removed daily. We provide a clear timeline before starting.'
                },
                {
                  q: 'Do you repair flat roofs in Sandbach?',
                  a: 'Yes. We specialise in EPDM rubber and GRP fibreglass flat roofing · ideal for garages, extensions, and dormer roofs common in Sandbach. We offer up to 20-year waterproof guarantees on flat roof installations.'
                },
              ].map((faq, i) => (
                <details key={i} className="bg-white border border-gray-200 border-l-4 border-l-brand-navy overflow-hidden group">
                  <summary className="p-5 cursor-pointer font-semibold text-brand-navy hover:text-brand-orange transition-colors flex items-center justify-between">
                    {faq.q}
                    <span className="text-brand-orange ml-2 flex-shrink-0">+</span>
                  </summary>
                  <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Areas We Serve from Sandbach · shared internal-linking hub */}
      <ServiceAreaHub
        title={
          <>
            We Also Serve
            <br />
            <span className="text-brand-orange">These Nearby Areas</span>
          </>
        }
        areas={orderAreaLinks({ exclude: ['/roofers-sandbach'] })}
      />

      {/* CTA Section · shared conversion wrapper */}
      <FinalCta
        kicker="Get Started"
        title="Need a Roofer in Sandbach?"
        subtitle="Get a free, no-obligation quote from Sandbach's most trusted roofing company. We'll inspect your roof, explain your options clearly, and give you a fair, written price."
        ctaLabel="Get Your Free Quote"
      />

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How much does a new roof cost in Sandbach?',
                acceptedAnswer: { '@type': 'Answer', text: 'A typical terraced house re-roof in Sandbach costs between £5,000 and £8,000. Semi-detached properties usually range from £6,500 to £10,000, and larger detached homes from £8,000 to £15,000+. We provide free, written quotes with no hidden costs.' }
              },
              {
                '@type': 'Question',
                name: 'Do you offer emergency roof repairs in Sandbach?',
                acceptedAnswer: { '@type': 'Answer', text: 'Yes. We provide 24/7 emergency roofing across Sandbach and surrounding areas. As we are based on Crewe Road, we can usually reach any Sandbach address within 30 minutes for urgent leaks, storm damage, or make-safe work. Call 01270 897606 for emergencies.' }
              },
              {
                '@type': 'Question',
                name: 'What areas of Sandbach do you cover?',
                acceptedAnswer: { '@type': 'Answer', text: 'We cover all of Sandbach including the town centre, Elworth, Wheelock, Sandbach Heath, Ettiley Heath, Arclid, and all surrounding villages. We also serve Middlewich, Crewe, Congleton, and the wider Cheshire area.' }
              },
              {
                '@type': 'Question',
                name: 'Are you a registered roofing contractor?',
                acceptedAnswer: { '@type': 'Answer', text: 'Yes. We are CORC (Confederation of Roofing Contractors) certified, Freefoam approved installers, and Marley registered installers. We carry £10M public liability insurance and provide insurance-backed guarantees on all work.' }
              },
              {
                '@type': 'Question',
                name: 'How long does a roof replacement take in Sandbach?',
                acceptedAnswer: { '@type': 'Answer', text: 'Most residential roof replacements take 3 to 7 working days depending on property size and weather. We schedule work to minimise disruption, and all debris is removed daily.' }
              },
              {
                '@type': 'Question',
                name: 'Do you repair flat roofs in Sandbach?',
                acceptedAnswer: { '@type': 'Answer', text: 'Yes. We specialise in EPDM rubber and GRP fibreglass flat roofing · ideal for garages, extensions, and dormer roofs common in Sandbach. We offer up to 20-year waterproof guarantees on flat roof installations.' }
              },
            ]
          })
        }}
      />
    </div>
  );
}
