'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { trackContactForm, trackWhatsAppClick, trackEmailClick, getGclid } from '@/lib/tracking';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { LeadFormWizard } from '@/components/LeadFormWizard';
import {
  CheckCircle2,
  PhoneCall,
  Send,
  MapPin,
  CalendarClock,
  MessageSquareMore
} from 'lucide-react';

const SERVICE_LABELS: Record<string, string> = {
  'leak-repair': 'Leak repair enquiry',
  'new-roof': 'New roof enquiry',
  'flat-roof': 'Flat roof enquiry',
  'tile-replacement': 'Tile replacement enquiry',
  'guttering': 'Guttering / fascias enquiry',
  'general': 'General roofing enquiry',
};

export function EnhancedContactSection() {
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values: Record<string, string>, extra: { turnstileToken: string; honeypot: string }) => {
    // This section's backend keeps `subject` free-text; under the standardized
    // two-step flow we derive it from the service selection so it stays populated.
    const subject = SERVICE_LABELS[values.service_needed] || 'General roofing enquiry';

    // The contact backend has no postcode column; fold it into the message.
    const postcode = values.postcode?.trim();
    const messageParts = [values.message || ''];
    if (postcode) messageParts.unshift(`Postcode: ${postcode}`);
    const message = messageParts.filter(Boolean).join('\n\n');

    const formData = {
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
        const { supabase } = await import('@/lib/supabase');
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
    setTimeout(() => setSuccess(false), 8000);
  };

  return (
    <section className="section-padding bg-gradient-to-br from-brand-grey to-white">
      <div className="container-custom">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="h-px w-12 bg-gray-300" aria-hidden="true" />
            <span className="text-brand-orange font-semibold text-sm uppercase tracking-[0.2em]">Get In Touch</span>
            <span className="h-px w-12 bg-gray-300" aria-hidden="true" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-brand-navy mb-4">
            Ready to Start Your Roofing Project?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Contact us for a free, no-obligation quote. Fill in the form and we'll get back to you within 10 minutes.
          </p>
        </div>

        {/* Single Contact Us card */}
        <Card className="w-full max-w-5xl mx-auto border border-brand-navy/30 border-l-4 border-l-brand-orange">
          <div className="grid lg:grid-cols-3">
            {/* Contact Form (2 of 3 columns) */}
            <div className="lg:col-span-2 p-6 sm:p-8">
              <CardTitle className="text-2xl text-brand-navy mb-2">Send Us a Message</CardTitle>
              <CardDescription className="text-base mb-6">
                Fill out the form below and we'll get back to you within 10 minutes.
              </CardDescription>
              {success ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-brand-navy mb-2">Message Sent Successfully!</h3>
                  <p className="text-gray-600 mb-4">
                    Thank you for contacting us. We'll review your message and get back to you within 10 minutes.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setSuccess(false)}
                      className="border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white"
                    >
                      Send Another Message
                    </Button>
                    <Button asChild className="bg-brand-orange hover:bg-brand-orange/90">
                      <TrackedPhoneLink placement="contact_form_success">
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Call Now
                      </TrackedPhoneLink>
                    </Button>
                  </div>
                </div>
              ) : (
                <LeadFormWizard
                  config={{
                    onSubmit: handleSubmit,
                    submitLabel: 'Send Message',
                    headingStep1: 'Project & Contact Basics',
                    subStep1: 'Tell us what you need and how to reach you.',
                    headingStep2: 'Location & Final Confirmation',
                    subStep2: 'Add your postcode and a short message.',
                    fieldKeys: {
                      serviceNeeded: 'service_needed',
                      roofType: 'roof_type',
                      message: 'message',
                    },
                    validate: (values) => {
                      const email = values.email?.trim() ?? '';
                      if (!email) return 'An email address is required so we can reply.';
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
                      const phone = values.phone?.trim() ?? '';
                      if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) return 'Please enter a valid phone number.';
                      const message = values.message?.trim() ?? '';
                      if (!message) return 'Please add a short message about your project.';
                      if (message.length < 10) return 'Please add a little more detail (at least 10 characters).';
                      return null;
                    },
                  }}
                />
              )}
            </div>

            {/* Contact Information, Hours & Map */}
            <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-200 bg-brand-navy p-6 sm:p-8">
              <CardTitle className="text-2xl text-white mb-6">Contact Information</CardTitle>
              <div className="space-y-6">
              {/* Contact methods */}
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-orange/20 flex items-center justify-center flex-shrink-0">
                    <PhoneCall className="w-6 h-6 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Call Us</h3>
                    <p className="text-gray-300 text-sm mb-1">Get immediate assistance</p>
                    <TrackedPhoneLink
                      placement="contact_sidebar"
                      className="text-brand-orange font-semibold hover:underline"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-orange/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquareMore className="w-6 h-6 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">WhatsApp</h3>
                    <p className="text-gray-300 text-sm mb-1">Quick messaging</p>
                    <a
                      href="https://wa.me/447379440583"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-orange font-semibold hover:underline"
                      onClick={() => trackWhatsAppClick('contact_sidebar')}
                    >
                      Message Us
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-orange/20 flex items-center justify-center flex-shrink-0">
                    <Send className="w-6 h-6 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Email</h3>
                    <p className="text-gray-300 text-sm mb-1">Send us an email</p>
                    <a
                      href="mailto:upgraderoofs@yahoo.com"
                      className="text-brand-orange font-semibold hover:underline"
                      onClick={() => trackEmailClick('contact_section_sidebar')}
                    >
                      upgraderoofs@yahoo.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-orange/20 flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="w-6 h-6 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Business Hours</h3>
                    <div className="text-gray-300 text-sm space-y-1">
                      <p>Mon - Fri: 8:00 AM - 6:00 PM</p>
                      <p>Saturday: 9:00 AM - 4:00 PM</p>
                      <p>Sunday: Emergency only</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Area */}
              <div className="pt-5 border-t border-white/15">
                <h3 className="flex items-center gap-2 font-semibold text-white mb-3">
                  <MapPin className="w-5 h-5 text-brand-orange" />
                  Service Area
                </h3>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d76832.89194948935!2d-2.4738!3d53.1365!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487a4c5b7c4b0b0b%3A0x0!2sCheshire%2C%20UK!5e0!3m2!1sen!2suk!4v1699000000000!5m2!1sen!2suk"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Upgrade Roofs Service Area - Cheshire"
                  />
                </div>
                <div className="mt-4 text-sm text-gray-300">
                  <p className="font-medium text-white mb-2">Areas we cover:</p>
                  <p>Sandbach · Crewe · Middlewich · Congleton · Alsager · Nantwich · Holmes Chapel · and surrounding areas throughout Cheshire and the North West.</p>
                </div>
              </div>

              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
