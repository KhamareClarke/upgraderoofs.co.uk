'use client';

import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LeadFormWizard } from '@/components/LeadFormWizard';
import { HeroKicker } from '@/components/HeroKicker';
import { trackQuoteRequest, trackPhoneClick, getGclid } from '@/lib/tracking';
import { usePhoneNumber } from '@/lib/phone-number';
import type { ServiceData } from '@/lib/service-data';
import type { TownData } from '@/lib/town-data';

interface ServiceHeroProps {
  service: ServiceData;
  town: TownData;
}

/**
 * Client hero for service-location pages — mirrors the area hero's two-column
 * layout (headline + trust left, white form card right) but with
 * service-specific copy. Kept as a separate 'use client' island so the parent
 * ServiceLocationTemplate remains a server component (preserving force-static).
 */
export function ServiceHero({ service, town }: ServiceHeroProps) {
  // Google Ads may swap this for a forwarding number on ad traffic; organic and
  // direct visitors get the real line. See lib/phone-number.
  const phone = usePhoneNumber();

  const handleSubmit = async (
    values: Record<string, string>,
    extra: { turnstileToken: string; honeypot: string },
  ) => {
    const formData = {
      name: values.name,
      phone: values.phone,
      postcode: values.postcode,
      email: values.email,
      roof_type: values.roof_type,
      service_type: values.service_type,
      message: values.message,
      sameDayCallback: values.sameDayCallback === 'yes',
    };

    const response = await fetch('/api/send-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        gclid: getGclid(),
        turnstileToken: extra.turnstileToken,
        website: extra.honeypot,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit form');
    }

    trackQuoteRequest({
      service_type: formData.service_type || formData.roof_type,
      postcode: formData.postcode,
    });
  };

  const handlePhoneClick = () => {
    trackPhoneClick(`service_page_${service.slug}_${town.slug}`);
  };

  return (
    <section className="relative min-h-screen flex items-start justify-center overflow-hidden pt-8 md:pt-12">
      <div className="absolute inset-0">
        <Image
          src="/images/6.jpeg"
          alt={`Professional ${service.name.toLowerCase()} in ${town.town} Cheshire`}
          fill
          className="object-cover scale-110"
          priority
          quality={85}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/90 via-brand-navy/80 to-brand-navy/70" />
      </div>

      <div className="container-custom relative z-10 py-4 md:py-6">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column — Headlines */}
          <div className="text-white space-y-6">
            <HeroKicker light>Free {service.name} · {town.town}</HeroKicker>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-balance">
              {service.name} in <span className="text-brand-orange">{town.town}</span>
            </h1>

            <p className="text-lg md:text-xl font-semibold text-brand-orange leading-snug">
              We call you back within 10 minutes
              <br />
              <span className="text-white">guaranteed</span>
            </p>

            <p className="text-base text-white/90 leading-relaxed max-w-lg">
              {service.description}
            </p>
          </div>

          {/* Right Column — Clean Form */}
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
                  Book Your Free {service.name} Inspection
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
                fieldKeys: {
                  serviceNeeded: 'service_type',
                  roofType: 'roof_type',
                  message: 'message',
                },
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
  );
}
