'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, type ContactMessage } from '@/lib/supabase';
import { trackContactForm, getGclid } from '@/lib/tracking';
import { CircleCheck as CheckCircle2 } from 'lucide-react';
import { LeadFormWizard } from '@/components/LeadFormWizard';

export function ContactForm() {
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values: Record<string, string>, extra: { turnstileToken: string; honeypot: string }) => {
    // The contact backend has no postcode column; fold it into the message so
    // the visitor's location still reaches us without changing the schema.
    const postcode = values.postcode?.trim();
    // The contact form's backend field "subject" was free-text; under the
    // standardized two-step flow we derive it from the service the visitor
    // selected so the required column stays populated.
    const SERVICE_LABELS: Record<string, string> = {
      'leak-repair': 'Leak repair enquiry',
      'new-roof': 'New roof enquiry',
      'flat-roof': 'Flat roof enquiry',
      'tile-replacement': 'Tile replacement enquiry',
      'guttering': 'Guttering / fascias enquiry',
      'general': 'General roofing enquiry',
    };
    const subject = SERVICE_LABELS[values.service_needed] || 'General enquiry';
    const messageParts = [values.message || ''];
    if (postcode) messageParts.unshift(`Postcode: ${postcode}`);
    const message = messageParts.filter(Boolean).join('\n\n');

    const formData: ContactMessage = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      subject,
      message,
      roof_type: values.roof_type,
      service_needed: values.service_needed,
    };

    const response = await fetch('/api/send-contact', {
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
        const { error: supabaseError } = await supabase.from('contact_messages').insert([formData]);
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
      throw new Error(result.error || 'Failed to send email');
    }

    trackContactForm({ subject });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 5000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Send Us a Message</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {success ? (
          <div className="py-6 sm:py-8 text-center px-4">
            <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-brand-navy mb-2">Message Sent!</h3>
            <p className="text-sm sm:text-base text-gray-600">Thank you for contacting us. We'll be in touch soon.</p>
          </div>
        ) : (
          <LeadFormWizard
            config={{
              onSubmit: handleSubmit,
              submitLabel: 'Send Message',
              headingStep1: 'Project & Contact Basics',
              subStep1: 'Tell us what you need and how to reach you.',
              headingStep2: 'Location & Final Confirmation',
              subStep2: 'Add your postcode and we will do the rest.',
              fieldKeys: {
                serviceNeeded: 'service_needed',
                roofType: 'roof_type',
                message: 'message',
              },
              validate: (values) => {
                if (!values.email?.trim()) return 'An email address is required so we can reply.';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return 'Please enter a valid email address.';
                return null;
              },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
