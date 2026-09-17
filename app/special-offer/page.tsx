'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowUp, MapPin } from 'lucide-react';
import { trackQuoteRequest, trackPhoneClick, getGclid } from '@/lib/tracking';
import Image from 'next/image';
import Link from 'next/link';
import { LeadFormWizard } from '@/components/LeadFormWizard';
import { HeroKicker } from '@/components/HeroKicker';
import { ReviewsSection } from '@/components/ReviewsSection';
import { FAQ } from '@/components/FAQ';
import { TrustBadgeGrid, ServiceAreaHub, InspectionChecklist, FinalCta } from '@/components/SpecialOfferSections';

export default function SpecialOfferPage() {
  const [mounted, setMounted] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Set mounted state after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll functionality
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
      body: JSON.stringify({ ...formData, gclid: getGclid(), turnstileToken: extra.turnstileToken, website: extra.honeypot }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit form');
    }

    // Track only after confirmed success
    trackQuoteRequest({
      service_type: formData.serviceNeeded || formData.roofType,
      postcode: formData.postcode,
    });

    // Redirect to thank you page on success
    window.location.href = '/thank-you';
  };

  const handlePhoneClick = () => {
    trackPhoneClick('special_offer');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-start justify-center overflow-hidden pt-8 md:pt-12">
        <div className="absolute inset-0">
          <Image
            src="/images/6.jpeg"
            alt="Professional roof inspection Sandbach Cheshire"
            fill
            className="object-cover scale-110"
            priority
            quality={85}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/90 via-brand-navy/80 to-brand-navy/70" />
        </div>

        <div className="container-custom relative z-10 py-4 md:py-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Headlines (mirrors homepage hero) */}
            <div className="text-white space-y-6">
              <HeroKicker light>Est. Sandbach, Cheshire</HeroKicker>

              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-balance">
                Get Your{' '}
                <span className="text-brand-orange">Free Roof Inspection</span>
                <br />
                in Cheshire
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
                  href="tel:01270897606"
                  onClick={handlePhoneClick}
                  className="block w-full border-2 border-brand-navy p-5 mb-6 text-center hover:border-brand-orange transition-colors"
                >
                  <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">
                    Call us direct
                  </span>
                  <span className="block mt-1 text-2xl font-bold text-brand-navy">
                    01270 897 606
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
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges · matches homepage accreditation section */}
      <TrustBadgeGrid />

      {/* Local Service Areas · Internal Linking Hub (matches homepage) */}
      <ServiceAreaHub
        areas={[
          { name: 'Roofers Sandbach', href: '/roofers-sandbach' },
          { name: 'Roofers Crewe', href: '/roofers-crewe' },
          { name: 'Roofers Middlewich', href: '/roofers-middlewich' },
          { name: 'Roofers Congleton', href: '/roofers-congleton' },
          { name: 'Roofers Nantwich', href: '/roofers-nantwich' },
          { name: 'Roofers Alsager', href: '/roofers-alsager' },
          { name: 'Roofers Holmes Chapel', href: '/roofers-holmes-chapel' },
          { name: 'All Service Areas', href: '/service-areas' },
        ]}
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
      />

      {/* What Inspection Covers */}
      <InspectionChecklist />

      {/* Final CTA */}
      <FinalCta />

      {/* Customer Reviews · reputationhub widget */}
      <ReviewsSection reviewCta="quote" />

      {/* FAQ · cloned from homepage, styled to match this page */}
      <FAQ />

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-40 bg-brand-navy text-white p-3 rounded hover:bg-brand-navy/90 transition-all"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
