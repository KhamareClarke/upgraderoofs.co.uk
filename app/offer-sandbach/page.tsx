'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Star,
  ArrowUp,
  MapPin
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { LocalAreaContent } from '@/components/LocalAreaContent';
import { LeadFormWizard } from '@/components/LeadFormWizard';
import { trackQuoteRequest, trackPhoneClick, getGclid } from '@/lib/tracking';
import { usePhoneNumber } from '@/lib/phone-number';
import { supabase } from '@/lib/supabase';
import { SectionHeader } from '@/components/SectionHeader';
import { HeroKicker } from '@/components/HeroKicker';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import { TrustBadgeGrid, ServiceAreaHub } from '@/components/SpecialOfferSections';
import { orderAreaLinks } from '@/lib/service-areas';

export default function OfferSandbachPage() {
  // Swapped for a Google Ads forwarding number on ad traffic. See lib/phone-number.
  const phone = usePhoneNumber();
  const [mounted, setMounted] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mounted]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (values: Record<string, string>, extra: { turnstileToken: string; honeypot: string }) => {
    const formData = {
      name: values.name,
      phone: values.phone,
      postcode: values.postcode,
      email: values.email,
      roofType: values.roofType,
      serviceNeeded: values.serviceNeeded,
      message: values.message,
      sameDayCallback: values.sameDayCallback === 'yes',
    };

    const response = await fetch('/api/send-special-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, location: 'Sandbach', gclid: getGclid(), turnstileToken: extra.turnstileToken, website: extra.honeypot }),
    });

    const result = await response.json();

    // Persist BEFORE acting on the response — same rule and reason as
    // QuoteForm: this row is the only copy of the lead that survives a GHL or
    // mail outage, so it must run even on a 5xx, which is when it is the last
    // copy left. Skipped on 4xx, which are submissions rejected as invalid,
    // rate-limited, or failed at the CAPTCHA.
    //
    // Written before the redirect below, and that ordering is load-bearing:
    // `window.location.href` tears the page down immediately, so a backstop
    // placed after it would never run at all.
    //
    // The mapping is explicit rather than a spread: this payload is camelCase
    // (`roofType`, `serviceNeeded`, `sameDayCallback`), and none of those are
    // column names. Spreading it verbatim is rejected for an unknown key
    // (PGRST204), and supabase-js RESOLVES with `{ error }` rather than
    // throwing — so the row would disappear with only a console.error to show.
    if (response.ok || response.status >= 500) {
      try {
        const { error: supabaseError } = await supabase.from('quote_requests').insert([
          {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            postcode: formData.postcode,
            service_type: formData.serviceNeeded,
            roof_type: formData.roofType,
            message: formData.message,
            same_day_callback: formData.sameDayCallback,
          },
        ]);
        if (supabaseError) {
          console.error('[lead] Supabase backstop write failed:', supabaseError.code, supabaseError.message);
        }
      } catch (supabaseError) {
        console.error('[lead] Supabase backstop write threw:', supabaseError);
      }
    }

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit form');
    }

    // Track only after confirmed success
    trackQuoteRequest({
      service_type: formData.serviceNeeded || formData.roofType,
      postcode: formData.postcode,
    });

    window.location.href = '/thank-you';
  };

  const handlePhoneClick = () => {
    trackPhoneClick('offer_sandbach');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-start justify-center overflow-hidden pt-8 md:pt-12">
        <div className="absolute inset-0">
          <Image
            src="/images/6.jpeg"
            alt="Professional roof inspection Sandbach"
            fill
            className="object-cover scale-110"
            priority
            quality={85}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/90 via-brand-navy/80 to-brand-navy/70" />
        </div>

        <div className="container-custom relative z-10 py-4 md:py-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Headlines */}
            <div className="text-white space-y-6">
              <HeroKicker light>Est. Sandbach, Cheshire</HeroKicker>

              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-balance">
                Get Your{' '}
                <span className="text-brand-orange">Free Roof Inspection</span>
                <br />
                in Sandbach
              </h1>

              <p className="text-lg md:text-xl font-semibold text-brand-orange leading-snug">
                We call you back within 10 minutes
                <br />
                <span className="text-white">guaranteed</span>
              </p>
            </div>

            {/* Right Column - Clean Form */}
            <div className="bg-white p-8 border border-gray-200 border-l-4 border-l-brand-navy">
              <div className="text-center mb-8">
                <a
                  href={phone.tel}
                  onClick={handlePhoneClick}
                  className="block w-full border-2 border-brand-navy p-5 mb-6 text-center hover:border-brand-orange transition-colors"
                >
                  <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">
                    Call us direct
                  </span>
                  <span className="block mt-1 text-2xl font-bold text-brand-navy">
                    {phone.display}
                  </span>
                  <span className="block mt-1 text-sm text-gray-600">
                    We answer straight away
                  </span>
                </a>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-brand-navy">
                    Book Your Free Roof Inspection
                  </h3>
                  <p className="text-gray-600">
                    Leave your details and we'll call you back within 10 minutes
                  </p>
                </div>
              </div>

              <LeadFormWizard
                config={{
                  onSubmit: handleSubmit,
                  submitLabel: 'Request Callback',
                  headingStep1: 'Project & Contact Basics',
                  subStep1: 'Tell us what you need and how to reach you.',
                  headingStep2: 'Location & Final Confirmation',
                  subStep2: 'Add your postcode and any project details.',
                  extraStep2: (values, update) => (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-300 border-l-4 border-l-brand-orange rounded-md">
                      <Checkbox
                        checked={values.sameDayCallback === 'yes'}
                        onCheckedChange={(checked) => update('sameDayCallback', checked ? 'yes' : '')}
                      />
                      <Label className="text-brand-navy font-medium">
                        I'd like a same-day callback
                      </Label>
                    </div>
                  ),
                  validate: (values) => {
                    const email = values.email?.trim() ?? '';
                    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
                    return null;
                  },
                }}
              />

              <p className="mt-6 text-xs text-gray-500 text-center leading-relaxed">
                By submitting, you agree to be contacted about our services.<br />
                No spam, unsubscribe anytime.
              </p>

              {/* Review snippet under form */}
              <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 border-l-4 border-l-brand-navy">
                <div className="flex items-center justify-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-center text-gray-700 italic font-medium mb-2">
                  "Excellent service from start to finish. Very professional team who completed our roof repair quickly and efficiently."
                </p>
                <p className="text-center text-sm text-gray-600 font-semibold">Sarah T., Sandbach</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges · shared accreditation grid */}
      <TrustBadgeGrid />

      {/* Mid-Page Section */}
      <section className="section-padding bg-brand-grey">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <SectionHeader
              kicker="Sandbach Roofing"
              title="Got a Leak or Need a New Roof in Sandbach? We Identify the Problem Fast."
              subtitle="Whether it's a small leak or a full roof replacement, our Sandbach team provides a detailed condition report and a no-obligation repair plan tailored for your home. We've been serving Sandbach homeowners for over 25 years."
            />
            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-8 py-4"
                onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span className="!text-white">Book My Free Roof Check</span>
              </Button>
              <CtaSubMessage />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding bg-gradient-to-r from-brand-navy to-brand-navy/90 text-white">
        <div className="container-custom text-center">
          <SectionHeader
            dark
            kicker="Free Inspection"
            title="Ready to Get Your Sandbach Roof Checked for Free?"
            subtitle="Don't wait until leaks become damage. We'll call you within 10 minutes to confirm your booking."
          />

          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-8 py-4 text-lg"
              onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="!text-white">Book My Free Inspection</span>
            </Button>
            <CtaSubMessage dark />
          </div>
        </div>
      </section>

      {/* Local Area Content */}
      <LocalAreaContent
        town="Sandbach"
        postcode="CW11"
        population="18,000"
        description="Sandbach is a historic market town in Cheshire East, known for its cobbled town square and Saxon crosses. The town features a mix of period properties, Victorian terraces, and modern housing estates, each with distinct roofing requirements. Our team has extensive experience working on Sandbach properties, from heritage buildings in the town centre to new builds on the outskirts."
        neighborhoods={[
          'Sandbach Town Centre',
          'Sandbach Heath',
          'Wheelock',
          'Elworth',
          'Ettiley Heath',
          'Bradwall',
          'Arclid',
          'Hassall Green',
        ]}
        roofingChallenges={[
          'Period properties requiring sympathetic slate and tile repairs',
          'Victorian terraces with original clay tile roofs needing restoration',
          'Flat roofs on 1960s-70s extensions prone to leaks',
          'Chimney repairs on older properties with lime mortar',
          'Storm damage from exposed positions near open countryside',
        ]}
        commonRoofTypes={[
          'Clay tile roofs (Victorian/Edwardian)',
          'Concrete interlocking tiles',
          'Natural Welsh slate',
          'Flat felt and EPDM roofs',
          'GRP fibreglass flat roofs',
          'Lead flashings and valleys',
        ]}
        nearbyAreas={[
          { name: 'Crewe', href: '/roofers-crewe' },
          { name: 'Middlewich', href: '/roofers-middlewich' },
          { name: 'Congleton', href: '/roofers-congleton' },
          { name: 'Holmes Chapel', href: '/roofers-holmes-chapel' },
          { name: 'Alsager', href: '/roofers-alsager' },
        ]}
      />

      {/* Local Service Areas · Internal Linking Hub (shared) */}
      <ServiceAreaHub
        title={<>Roofing Services Across <span className="text-brand-orange">Cheshire</span></>}
        subtitle="Based in Sandbach, we serve homeowners and businesses throughout south and mid-Cheshire."
        callout={
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-white border border-gray-300 border-t-2 border-t-brand-orange">
            <MapPin className="w-5 h-5 text-brand-orange" />
            <span className="text-sm font-semibold text-brand-navy">
              Looking for{' '}
              <Link href="/roofers-sandbach" className="text-brand-orange hover:underline font-bold">
                roofers in Cheshire
              </Link>
              ?
            </span>
          </div>
        }
        areas={orderAreaLinks({ exclude: ['/roofers-sandbach'] })}
      />

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-40 bg-brand-navy text-white p-3 rounded hover:bg-brand-navy/90 transition-all"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Schema Markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Upgrade Roofs",
        "address": { "@type": "PostalAddress", "streetAddress": "20 Crewe Road", "addressLocality": "Sandbach", "addressRegion": "Cheshire", "postalCode": "CW11 4NE", "addressCountry": "GB" },
        "telephone": "+441270897606",
        "url": "https://www.upgraderoofs.co.uk/offer-sandbach",
        "areaServed": "Sandbach"
      })}} />
    </div>
  );
}
