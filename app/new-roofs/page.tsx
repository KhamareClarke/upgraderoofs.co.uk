import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { QuoteForm } from '@/components/QuoteForm';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { CheckCircle, Clock, Shield, Award, MapPin, ArrowRight, Phone, Star } from 'lucide-react';
import { HeroKicker } from '@/components/HeroKicker';
import Link from 'next/link';
import { ServiceAreaLinks } from '@/components/ServiceAreaLinks';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { NewRoofsSchema } from './schema';
import { SectionHeader } from '@/components/SectionHeader';
import { CtaSubMessage } from '@/components/CtaSubMessage';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'New Roofs Sandbach & Cheshire | 10-Year Guarantee',
  description: 'New roof installations in Sandbach & across Cheshire. Tile, slate, flat roofing. 10-year guarantee, £10M insured. Expert re-roofing from our Sandbach base. Free quotes. Call 01270 897606.',
  keywords: 'new roofs Sandbach, re-roofing Sandbach, new roof Cheshire, roof replacement Sandbach, new tile roof, new slate roof',
  openGraph: {
    title: 'New Roofs Sandbach & Cheshire | 10-Year Guarantee',
    description: 'New roof installations in Sandbach & across Cheshire. 10-year guarantee. Free quotes.',
    url: 'https://www.upgraderoofs.co.uk/new-roofs',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/6.jpeg',
        width: 1200,
        height: 630,
        alt: 'New Roofs Sandbach - Upgrade Roofs',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'New Roofs Sandbach & Cheshire | Upgrade Roofs',
    description: 'Complete roof replacements from our Sandbach base. Tile, slate, flat roofing. 10-year guarantee.',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/new-roofs',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function NewRoofsPage() {
  return (
    <>
      <NewRoofsSchema />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'New Roofs', url: 'https://www.upgraderoofs.co.uk/new-roofs' },
      ]} />
      <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-r from-brand-navy via-brand-navy/95 to-brand-navy/90">
        <div className="container-custom relative z-10">
          <div className="max-w-3xl">
            <HeroKicker light className="mb-6">Complete Installations</HeroKicker>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
              New Roofs &amp; Re-Roofing in <span className="text-brand-orange">Sandbach</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl">
              Complete roof replacements from our Sandbach base. Premium materials, expert craftsmanship, and a 10-year guarantee on every installation. Serving Sandbach and all of Cheshire.
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
              kicker="New Roof Installations"
              title="New Roof Installations in Sandbach &amp; Cheshire"
            />
            <p className="text-lg text-gray-800 mb-4">
              <strong>Upgrade Roofs designs and installs new tile, slate, and flat roofs across Sandbach and Cheshire.</strong> From complete re-roofing to extensions and new builds, we deliver a weathertight, guaranteed roof built to last with a full 10-year workmanship guarantee.
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-gray-700">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-orange" /> New Tile Roofs</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-orange" /> Natural Slate Roofs</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-orange" /> Flat Roof Systems</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-orange" /> Full Re-Roofing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Roof Types */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionHeader
            kicker="Roofing Options"
            title="New Roof Options for Sandbach &amp; Cheshire Homes"
            subtitle="We've installed hundreds of new roofs in Sandbach and across Cheshire. Tile, slate, and modern flat roofing systems for every property type."
          />
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                title: 'Tile Roofing', 
                desc: 'Concrete and clay tiles. Traditional look, excellent durability. Popular choice across Cheshire.',
                features: ['50+ year lifespan', 'Wide colour range', 'Weather resistant']
              },
              { 
                title: 'Slate Roofing', 
                desc: 'Natural Welsh slate. Premium quality, timeless appearance. Perfect for period properties.',
                features: ['100+ year lifespan', 'Low maintenance', 'Adds property value']
              },
              { 
                title: 'Flat Roofing', 
                desc: 'EPDM rubber and GRP fibreglass. Modern systems for extensions, garages, and dormer roofs.',
                features: ['20 year guarantee', 'Seamless finish', 'Quick installation']
              },
            ].map((type, i) => (
              <div key={i} className="bg-gray-50 p-8 border border-gray-200 border-l-4 border-l-brand-navy hover:border-brand-orange/50 hover:border-l-brand-orange transition-all">
                <h3 className="text-2xl font-bold text-brand-navy mb-3">{type.title}</h3>
                <p className="text-gray-600 mb-6">{type.desc}</p>
                <ul className="space-y-2">
                  {type.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-brand-orange flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <SectionHeader
            kicker="How We Work"
            title="Our Re-Roofing Process"
            subtitle="From initial survey to final inspection, we manage every step professionally."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Free Survey', desc: 'We visit your property in Sandbach or anywhere in Cheshire, assess the roof, and provide a detailed written quote.' },
              { step: '2', title: 'Strip & Prepare', desc: 'Old roof removed, timbers inspected and repaired, new felt and battens installed.' },
              { step: '3', title: 'Install New Roof', desc: 'Premium materials installed by experienced roofers. All work to building regulations.' },
              { step: '4', title: 'Clean & Inspect', desc: 'Site cleaned, final inspection, 10-year guarantee certificate issued.' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                <div className="w-12 h-12 bg-brand-orange text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-brand-navy mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionHeader
                align="left"
                kicker="Why Choose Us"
                title="Why Choose Upgrade Roofs for Your New Roof?"
              />
              <div className="space-y-4">
                {[
                  { icon: Award, title: 'CORC Certified', desc: 'Competent Roofer Scheme member. Independently assessed and approved.' },
                  { icon: Shield, title: '£10M Public Liability Insured', desc: 'Full public liability insurance. Your property is protected throughout the project.' },
                  { icon: CheckCircle, title: 'IBG Insurance-Backed Guarantee', desc: 'Insurance-backed protection on all new roof installations.' },
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
            <div className="bg-gray-50 p-8 border border-gray-200 border-l-4 border-l-brand-orange">
              <h3 className="text-2xl font-bold text-brand-navy mb-6">Get Your Free Quote</h3>
              <QuoteForm />
            </div>
          </div>
        </div>
      </section>

      {/* New Roof Reviews */}
      <section className="py-12 bg-gray-50">
        <div className="container-custom">
          <SectionHeader
            kicker="Reviews"
            title="What Customers Say About Our New Roofs"
          />
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { text: 'Complete re-roof on our 1930s semi. New Marley tiles, new felt, new battens · the lot. Team were brilliant, tidy, and finished in 4 days. Our house looks brand new from the street.', name: 'Sarah & David P.', location: 'Elworth, Sandbach' },
              { text: 'Had three quotes for a full re-roof. Upgrade Roofs were the most detailed · they explained everything, showed us tile samples, and the final result is outstanding. 10-year guarantee too.', name: 'Graham T.', location: 'Congleton Road, Sandbach' },
              { text: 'New slate roof on our Victorian terrace. They matched the original Welsh slate perfectly. Neighbours have been asking who did the work. Very happy with the result.', name: 'Helen & James M.', location: 'Middlewich' },
            ].map((r, i) => (
              <div key={i} className="bg-white p-5 border border-gray-200 border-l-4 border-l-brand-navy">
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
              <summary className="font-semibold text-brand-navy cursor-pointer">How much does a new roof cost in Cheshire?</summary>
              <p className="mt-3 text-gray-600">
                Every roof is different, so costs vary depending on size, materials, and the scope of work involved. We provide free, no-obligation quotes with transparent, itemised pricing · no hidden costs, no surprises.
              </p>
            </details>
            <details className="bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy">
              <summary className="font-semibold text-brand-navy cursor-pointer">How long does a new roof take to install?</summary>
              <p className="mt-3 text-gray-600">
                Most new roof installations in Sandbach and Cheshire are completed within a few days, depending on the size and complexity of your roof. We'll give you a clear schedule before any work begins and keep you informed throughout the project.
              </p>
            </details>
            <details className="bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy">
              <summary className="font-semibold text-brand-navy cursor-pointer">Is my new roof guaranteed?</summary>
              <p className="mt-3 text-gray-600">
                Yes. All our new roofs are backed by a comprehensive 10-year workmanship guarantee, giving you complete peace of mind.
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
              Not sure if you need a full replacement? Our team can assess whether <Link href="/roof-repairs" className="text-brand-orange hover:underline font-medium">targeted roof repairs</Link> could 
              extend your existing roof's life. Find your local page for recent projects: <Link href="/roofers-sandbach" className="text-brand-orange hover:underline font-medium">Sandbach</Link>, <Link href="/roofers-crewe" className="text-brand-orange hover:underline font-medium">Crewe</Link>, <Link href="/roofers-congleton" className="text-brand-orange hover:underline font-medium">Congleton</Link>, <Link href="/roofers-nantwich" className="text-brand-orange hover:underline font-medium">Nantwich</Link>, or <Link href="/roofers-middlewich" className="text-brand-orange hover:underline font-medium">Middlewich</Link>. We also specialise in <Link href="/services/flat-roofing" className="text-brand-orange hover:underline font-medium">flat roofing systems</Link> for 
              extensions and garages, and <Link href="/services/chimney-repairs" className="text-brand-orange hover:underline font-medium">chimney repairs</Link> that are often needed alongside a new roof. 
              Read our guides on <Link href="/blog/how-long-does-roof-last" className="text-brand-orange hover:underline font-medium">how long different roofs last</Link> and <Link href="/blog/flat-vs-tile-roofs" className="text-brand-orange hover:underline font-medium">flat vs tile roofs compared</Link> to help you choose.
            </p>
          </div>
        </div>
      </section>

      <ServiceAreaLinks serviceName="New Roofs & Re-Roofing" />

      {/* CTA */}
      <section className="section-padding bg-brand-navy text-white">
        <div className="container-custom text-center">
          <SectionHeader
            dark
            kicker="Get Started"
            title="Ready for a New Roof in Sandbach?"
            subtitle="Get a free, no-obligation quote for your complete roof replacement in Sandbach or across Cheshire"
          />
          <div className="flex flex-col items-center gap-2">
            <QuoteForm trigger={
              <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-10 h-14">
                Get Free Quote
              </Button>
            } />
            <CtaSubMessage dark />
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
