'use client';

import { LeadFormWizard } from '@/components/LeadFormWizard';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase, type QuoteRequest } from '@/lib/supabase';
import { trackQuoteRequest, getGclid } from '@/lib/tracking';

/**
 * The site-wide lead form card: an inline LeadFormWizard in a bordered white
 * panel.
 *
 * It is rendered in exactly one place — `SiteLeadForm`, which
 * `ConditionalLayout` mounts above the footer on every page. It used to also sit
 * inline in the six `/services/*` heroes, which is why it took a `serviceName`
 * and why the docstring here once described it as an alternative to the modal.
 * Both are gone: those heroes now carry the standard `QuoteForm` button, and
 * with one call site the prop had no way to stay honest, so it was removed
 * rather than left to look configurable.
 *
 * `serviceName` is not the only thing that did not survive the move — so did the
 * per-service heading. The card is deliberately generic now. It appears on ~45
 * pages, and a heading that names one service is wrong on all the others.
 */
export function ServiceLeadForm() {
  const handleSubmit = async (
    values: Record<string, string>,
    extra: { turnstileToken: string; honeypot: string },
  ) => {
    const formData: QuoteRequest = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      postcode: values.postcode,
      service_type: values.service_type,
      message: values.message,
      roof_type: values.roof_type,
    };

    const response = await fetch('/api/send-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, gclid: getGclid(), turnstileToken: extra.turnstileToken, website: extra.honeypot }),
    });

    const result = await response.json().catch(() => ({}));

    // Persist BEFORE acting on the response. This row is the only copy of the
    // lead that survives a GHL/mail outage, and it is independent of both — so
    // it has to run even when the API reports total delivery failure (5xx),
    // which is precisely when it is the last copy left. It is skipped only on
    // 4xx: those are submissions rejected as invalid, rate-limited, or failed
    // at the CAPTCHA, and we do not want those rows.
    if (response.ok || response.status >= 500) {
      try {
        const { error: supabaseError } = await supabase.from('quote_requests').insert([formData]);
        if (supabaseError) {
          // supabase-js RESOLVES with { error } rather than throwing, so this
          // was invisible before: the row silently never landed.
          console.error('[lead] Supabase backstop write failed:', supabaseError.code, supabaseError.message);
        }
      } catch (supabaseError) {
        console.error('[lead] Supabase backstop write threw:', supabaseError);
      }
    }

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send request');
    }

    trackQuoteRequest({
      service_type: formData.service_type || formData.roof_type,
      postcode: formData.postcode,
    });
  };

  return (
    <div className="bg-white p-6 sm:p-8 border border-gray-200 border-l-4 border-l-brand-navy rounded-md shadow-md text-left w-full">
      <div className="text-left mb-6">
        <h3 className="text-2xl font-bold text-brand-navy">
          Book Your Free Roof Inspection
        </h3>
        <p className="text-gray-600 mt-1">
          Leave your details and we'll call you back within 10 minutes
        </p>
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
  );
}
