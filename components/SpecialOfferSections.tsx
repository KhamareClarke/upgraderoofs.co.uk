import Image from 'next/image';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuoteForm } from '@/components/QuoteForm';
import { SectionHeader } from '@/components/SectionHeader';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import { ServiceAreaGrid } from '@/components/ServiceAreaGrid';
import { SERVICE_AREAS_HUB, type ServiceAreaLink } from '@/lib/service-areas';

interface TrustBadge {
  src: string;
  alt: string;
  width: number;
  height: number;
  label: string;
  meta: string;
  priority?: boolean;
}

interface ServiceArea {
  name: string;
  href: string;
}

/* ------------------------------------------------------------------ */
/* Trust Badges — 4-card accreditation grid (CORC / insured / IBG / 5★) */
/* ------------------------------------------------------------------ */
export function TrustBadgeGrid({
  kicker = 'Accredited & Insured',
  title = 'Trusted & Approved',
  subtitle = 'Recognised by leading industry bodies and trusted by thousands of customers',
  ctaLabel = 'Get a Free Quote',
  badges,
}: {
  kicker?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  badges?: TrustBadge[];
}) {
  const defaultBadges: TrustBadge[] = [
    { src: '/images/corc_logo-1024x549.webp', alt: 'CORC certified member logo', width: 1024, height: 549, label: 'CORC Certified', meta: 'Approved member', priority: true },
    { src: '/images/badge-light@2x.png', alt: 'MyApproved verified member badge', width: 760, height: 284, label: '£10M Insured', meta: 'Public liability cover' },
    { src: '/images/badge-light@2x.png', alt: 'Insurance Backed Guarantee badge', width: 760, height: 284, label: 'IBG Guarantee', meta: 'Insurance-backed work' },
    { src: '/images/Google-Review-Emblem-500x281.png', alt: 'Google reviews emblem with 5 star rating', width: 500, height: 281, label: '5-Star Rated', meta: 'Google · MyApproved verified' },
  ];
  const items = badges ?? defaultBadges;

  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="container-custom">
        <div className="py-10 sm:py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
              <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">{kicker}</span>
              <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">{title}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 items-center">
            {items.map((item, index) => (
              <div key={index} className="group flex flex-col items-center text-center">
                <div className="relative w-full max-w-[190px] h-24 flex items-center justify-center bg-white border border-gray-200 rounded-lg shadow-sm p-3 transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    width={item.width}
                    height={item.height}
                    className="w-full h-full object-contain"
                    priority={item.priority}
                  />
                </div>
                <p className="mt-5 text-sm sm:text-base font-bold text-brand-navy tracking-wide">{item.label}</p>
                <p className="text-xs text-gray-500 mt-1 leading-snug">{item.meta}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10 flex flex-col items-center gap-2">
            <QuoteForm
              trigger={
                <span className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base cursor-pointer">
                  {ctaLabel}
                </span>
              }
            />
            <CtaSubMessage />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Local Service Areas — internal-linking hub (matches homepage)        */
/* ------------------------------------------------------------------ */
export function ServiceAreaHub({
  kicker = 'Where We Work',
  title = null,
  subtitle,
  callout = null,
  ctaLabel = 'Request a Free Quote',
  hubLink = SERVICE_AREAS_HUB,
  visibleCount = 6,
  areas,
}: {
  kicker?: string;
  title?: React.ReactNode;
  subtitle?: string;
  callout?: React.ReactNode;
  ctaLabel?: string;
  hubLink?: ServiceAreaLink | null;
  visibleCount?: number;
  areas: ServiceArea[];
}) {
  return (
    <section className="section-padding bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
            <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">{kicker}</span>
            <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
          </div>
          {/* `title` is the heading's CONTENT, not a stand-in for the <h2>.
              It used to replace the whole element, so every caller that passed
              one (special-offer, offer-sandbach, roofers-sandbach) rendered its
              heading as unstyled body text with no heading tag at all. */}
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-3">
            {title ?? (
              <>
                Roofing Services Across <span className="text-brand-orange">Cheshire</span>
              </>
            )}
          </h2>
          {subtitle && <p className="text-gray-600 max-w-2xl mx-auto mb-6">{subtitle}</p>}
          {callout}
        </div>
        <ServiceAreaGrid
          areas={areas}
          hubLink={hubLink ?? undefined}
          visibleCount={visibleCount}
          className="mb-8"
        />
        <div className="text-center flex flex-col items-center gap-2">
          <QuoteForm
            trigger={
              <span className="inline-flex items-center justify-center gap-2.5 bg-brand-orange hover:bg-brand-navy-light text-white font-semibold px-7 sm:px-8 h-12 sm:h-14 rounded-lg shadow-lg shadow-black/20 ring-1 ring-white/10 transition-colors duration-300 cursor-pointer">
                {ctaLabel}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300" />
              </span>
            }
          />
          <CtaSubMessage />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Inspection Checklist — "What Your Free Roof Check Covers"           */
/* ------------------------------------------------------------------ */
export function InspectionChecklist({
  kicker = 'What to expect',
  title = 'What Your Free Roof Check Covers',
  ctaLabel = 'Book My Free Roof Check',
  items,
}: {
  kicker?: string;
  title?: string;
  ctaLabel?: string;
  items?: string[];
}) {
  const defaultItems = [
    'Tiles, slates and ridges checked for cracks or movement',
    'Lead flashing and valley condition',
    'Gutters, fascias and soffits',
    'Chimney pointing and flashings',
    'Flat roof covering, if you have one',
    'A written report with photos, so you can see for yourself',
  ];
  const list = items ?? defaultItems;

  return (
    <section className="section-padding bg-brand-grey">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto text-center">
          <SectionHeader kicker={kicker} title={title} />
          {/* Centred on mobile so the list sits under the centred heading,
              then reverts to the two-column left-aligned layout from sm up. */}
          <div className="grid sm:grid-cols-2 gap-4 text-center sm:text-left max-w-2xl mx-auto mb-8">
            {list.map((item) => (
              <div key={item} className="flex items-start justify-center sm:justify-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-orange flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2">
            <QuoteForm
              trigger={
                <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-8 py-4">
                  <span className="!text-white">{ctaLabel}</span>
                </Button>
              }
            />
            <CtaSubMessage />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA — high-contrast navy conversion wrapper                   */
/* ------------------------------------------------------------------ */
export function FinalCta({
  kicker = 'Free roof check',
  title = 'Want Your Roof Looked At?',
  subtitle = "Leave your details and we'll get back to you within 10 minutes.",
  ctaLabel = 'Book My Free Inspection',
  dark = true,
}: {
  kicker?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  ctaLabel?: string;
  dark?: boolean;
}) {
  return (
    <section className="section-padding bg-gradient-to-r from-brand-navy to-brand-navy/90 text-white">
      <div className="container-custom text-center">
        <SectionHeader dark={dark} kicker={kicker} title={title} subtitle={subtitle} />
        <div className="flex flex-col items-center gap-2">
          <QuoteForm
            trigger={
              <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-8 py-4 text-lg">
                <span className="!text-white">{ctaLabel}</span>
              </Button>
            }
          />
          <CtaSubMessage dark />
        </div>
      </div>
    </section>
  );
}
