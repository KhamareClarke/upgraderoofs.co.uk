import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { QuoteForm } from '@/components/QuoteForm';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { Phone, CheckCircle, Clock, Shield, MapPin, ArrowRight, Star } from 'lucide-react';
import { HeroKicker } from '@/components/HeroKicker';
import Link from 'next/link';
import { ServiceAreaLinks } from '@/components/ServiceAreaLinks';
import { RoofRepairsSchema } from './schema';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { SectionHeader } from '@/components/SectionHeader';
import { CtaSubMessage } from '@/components/CtaSubMessage';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Roof Repairs Cheshire | Same-Day',
  description: 'Expert roof repairs in Sandbach & across Cheshire. Leaks, storm damage, missing tiles, ridge repairs. Same-day response from our Sandbach base. 25+ years experience. Call 01270 897606.',
  openGraph: {
    title: 'Roof Repairs Sandbach & Cheshire | Same-Day Service',
    description: 'Expert roof repairs in Sandbach & across Cheshire. Same-day response. 25+ years experience.',
    url: 'https://www.upgraderoofs.co.uk/roof-repairs',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/service-pages/roof-repair-og.jpg',
        width: 1200,
        height: 630,
        alt: 'A roofer repairing tiles on a roof in Sandbach',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roof Repairs Sandbach & Cheshire | Upgrade Roofs',
    description: 'Same-day roof repairs from our Sandbach base. Leaks, storm damage, missing tiles. Call 01270 897606.',
    images: ['https://www.upgraderoofs.co.uk/images/service-pages/roof-repair-twitter.jpg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/roof-repairs',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RoofRepairsPage() {
  return (
    <>
      <RoofRepairsSchema />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Roof Repairs', url: 'https://www.upgraderoofs.co.uk/roof-repairs' },
      ]} />
      <div className="min-h-screen bg-white">
        {/* Hero */}
        <section className="relative py-20 bg-gradient-to-r from-brand-navy via-brand-navy/95 to-brand-navy/90">
          <div className="container-custom relative z-10">
            <div className="max-w-3xl">
              <HeroKicker light className="mb-6">Fast Response Service</HeroKicker>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
                Roof Repairs in <span className="text-brand-orange">Sandbach</span> &amp; Cheshire
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl">
                Fast, reliable roof repairs from our Sandbach base. Leaks, storm damage, missing tiles, ridge work · we fix it right the first time. Serving Sandbach and all of Cheshire.
              </p>
              <div className="flex flex-col items-center sm:items-start gap-2">
                <QuoteForm trigger={
                  <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-8 h-14">
                    Get Free Quote
                  </Button>
                } />
                <CtaSubMessage dark />
              </div>
            </div>
          </div>
        </section>

        {/* --- AEO: Answer-First Content Block --- */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            <div className="max-w-3xl mx-auto bg-gray-50 border-l-4 border-l-brand-orange p-8">
              <SectionHeader
                align="left"
                kicker="Roof Repair Specialists"
                title="Your Local Roof Repair Specialists"
              />
              <p className="text-lg text-gray-800 mb-4">
                <strong>Upgrade Roofs provides expert, guaranteed roof repair services in Sandbach and across Cheshire.</strong> We handle everything from minor leak repairs and tile replacements to significant storm damage, ensuring a fast, reliable, and permanent solution.
              </p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-gray-700">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-orange" /> Emergency Leak Repairs</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-orange" /> Missing Tile Replacement</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-orange" /> Storm Damage Repairs</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-orange" /> Ridge & Valley Repairs</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Common Repairs */}
        <section className="section-padding bg-gray-100">
          <div className="container-custom">
            <div className="text-center mb-12">
              <SectionHeader
                kicker="Our Repairs"
                title="Common Roof Repairs We Handle"
                subtitle="Based in Sandbach, we handle all types of roof repairs · from homes in CW11 to properties across Crewe, Congleton, Nantwich, and the wider Cheshire area."
              />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Leak Repairs', desc: 'Fast leak detection and repair. We find the source and fix it permanently.' },
                { title: 'Missing Tiles', desc: 'Replace missing, cracked, or slipped tiles. Exact colour matching available.' },
                { title: 'Storm Damage', desc: 'Emergency repairs after high winds, fallen trees, or severe weather.' },
                { title: 'Ridge Repairs', desc: 'Repointing and rebuilding ridge tiles. Common issue on older Cheshire properties.' },
                { title: 'Valley Repairs', desc: 'Lead valley repairs and replacements. Critical for preventing leaks.' },
                { title: 'Flashing Repairs', desc: 'Chimney, wall, and dormer flashing repairs using lead or GRP.' },
              ].map((repair, i) => (
                <div key={i} className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                  <CheckCircle className="w-8 h-8 text-brand-orange mb-3" />
                  <h3 className="text-xl font-bold text-brand-navy mb-2">{repair.title}</h3>
                  <p className="text-gray-600 text-sm">{repair.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="section-padding bg-gray-50">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <SectionHeader
                  align="left"
                  kicker="Why Choose Us"
                  title="Why Choose Upgrade Roofs for Repairs?"
                />
                <div className="space-y-4">
                  {[
                    { icon: Clock, title: 'Same-Day Service', desc: 'Based in Sandbach, we cover all of south and mid-Cheshire · usually on-site within 30–45 minutes for urgent repairs.' },
                    { icon: Shield, title: 'Insurance-Backed Guarantee', desc: 'All repairs backed by an IBG insurance-backed guarantee.' },
                    { icon: CheckCircle, title: 'No Hidden Costs', desc: 'Fixed-price quotes. No surprises, no call-out fees.' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-12 h-12 bg-brand-orange/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-brand-orange" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-brand-navy mb-1">{item.title}</h3>
                        <p className="text-gray-600 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <Link href="/service-areas" className="inline-flex items-center gap-2 text-brand-orange font-semibold hover:underline">
                    <MapPin className="w-4 h-4" />
                    See all Cheshire areas we cover <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="bg-white p-8 border border-gray-200 border-l-4 border-l-brand-orange">
                <h3 className="text-2xl font-bold text-brand-navy mb-6">Get a Free Repair Quote</h3>
                <QuoteForm />
              </div>
            </div>
          </div>
        </section>

        {/* Roof Repair Reviews */}
        <section className="py-12 bg-white">
          <div className="container-custom">
            <SectionHeader
              kicker="Reviews"
              title="What Customers Say About Our Repairs"
            />
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { text: 'Had a leak above the bathroom that two other roofers couldn\'t fix. Upgrade Roofs found the problem in 20 minutes · a failed lead flashing behind the soil pipe. Fixed properly, no more damp.', name: 'Karen W.', location: 'Elworth, Sandbach' },
                { text: 'Storm blew off 6 tiles on our semi. They came same day, replaced the tiles and checked the rest of the roof while they were up there. Fair price, no fuss.', name: 'Mike R.', location: 'Middlewich Road, Sandbach' },
                { text: 'Our ridge tiles had been loose for months. Upgrade Roofs re-bedded them with a dry ridge system. Looks much better and should last decades now.', name: 'Janet & Alan D.', location: 'Crewe' },
              ].map((r, i) => (
                <div key={i} className="bg-gray-50 p-5 border border-gray-200 border-l-4 border-l-brand-navy">
                  <div className="flex gap-1 mb-2">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-current" />)}</div>
                  <p className="text-sm text-gray-700 italic mb-3">"{r.text}"</p>
                  <p className="text-sm font-semibold text-brand-navy">{r.name}</p>
                  <p className="text-xs text-gray-500">{r.location}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ · rendered visibly so the FAQPage schema in ./schema.tsx has on-page parity */}
        <section className="py-12 bg-gray-50">
          <div className="container-custom">
            <SectionHeader
              kicker="FAQs"
              title="Frequently Asked Questions"
            />
            <div className="max-w-3xl mx-auto space-y-4">
              <details className="bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy" open>
                <summary className="font-semibold text-brand-navy cursor-pointer">Do you offer same-day service for urgent roof repairs?</summary>
                <p className="mt-3 text-gray-600">
                  Yes, we offer same-day service for most urgent repairs. Being based in Sandbach allows us to quickly reach locations across south and mid-Cheshire, often getting on-site within 30-45 minutes for emergencies.
                </p>
              </details>
              <details className="bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                <summary className="font-semibold text-brand-navy cursor-pointer">Is there a guarantee on your roof repairs?</summary>
                <p className="mt-3 text-gray-600">
                  Absolutely. All our roof repairs are backed by our comprehensive 10-year workmanship guarantee, giving you complete peace of mind.
                </p>
              </details>
              <details className="bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                <summary className="font-semibold text-brand-navy cursor-pointer">Are there any hidden costs or call-out fees?</summary>
                <p className="mt-3 text-gray-600">
                  No. We provide fixed-price quotes for all repair work. There are no surprise charges or hidden call-out fees.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* Contextual Cross-Links */}
        <section className="py-10 bg-white">
          <div className="container-custom">
            <div className="max-w-3xl mx-auto prose prose-lg text-gray-600 leading-relaxed">
              <p>
                Looking for a roofer in a specific area? See our <Link href="/roofers-sandbach" className="text-brand-orange hover:underline font-medium">Sandbach</Link>, <Link href="/roofers-crewe" className="text-brand-orange hover:underline font-medium">Crewe</Link>, <Link href="/roofers-congleton" className="text-brand-orange hover:underline font-medium">Congleton</Link>, or <Link href="/roofers-middlewich" className="text-brand-orange hover:underline font-medium">Middlewich</Link> roofing pages for
                local details and reviews. If your roof is beyond repair, we also offer complete <Link href="/new-roofs" className="text-brand-orange hover:underline font-medium">new roof installations</Link> with
                10-year guarantees. For out-of-hours emergencies · storm damage, sudden leaks, or structural issues · call our <Link href="/emergency-roofing" className="text-brand-orange hover:underline font-medium">24/7 emergency roofing line</Link> on 01270 897 606.
                Not sure if you need repairs? Read our guides on <Link href="/blog/roof-damage-signs" className="text-brand-orange hover:underline font-medium">spotting roof damage early</Link> and <Link href="/blog/roof-maintenance-checklist" className="text-brand-orange hover:underline font-medium">seasonal roof maintenance</Link>.
              </p>
            </div>
          </div>
        </section>

        <ServiceAreaLinks serviceName="Roof Repairs" />

        {/* CTA */}
        <section className="section-padding bg-brand-navy text-white">
          <div className="container-custom text-center">
            <SectionHeader
              dark
              kicker="Get Started"
              title="Need a Roof Repair in Sandbach?"
              subtitle="Call us now for same-day roof repairs in Sandbach and across Cheshire"
            />
            <div className="flex flex-col items-center gap-2">
              <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-10 h-14" asChild>
                <TrackedPhoneLink href="tel:01270897606" placement="roof_repairs_bottom_cta">
                  <Phone className="w-5 h-5 mr-2" />
                  Call 01270 897 606
                </TrackedPhoneLink>
              </Button>
              <CtaSubMessage dark />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
