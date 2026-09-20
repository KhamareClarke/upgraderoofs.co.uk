'use client';

import { useState, type ReactNode, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared 2-step lead-capture wizard.
 *
 * Walks the visitor through a compact two-step flow:
 *   Step 1 · Project & Contact Basics (Service Needed, Roof Type, Full Name, Phone)
 *   Step 2 · Location & Final Confirmation (Postcode, Email, optional notes,
 *            Turnstile widget, Submit)
 *
 * The component is field-name agnostic: each call site passes a `Cta.`
 * config that maps the standard logical fields to the concrete keys its own
 * backend API route / webhook / tracking expects, so no payload contract is
 * changed underneath.
 */

type RoofOption = { value: string; label: string };
type ServiceOption = { value: string; label: string };

type LeadFormWizardConfig = {
  /** Submit handler — receives the assembled typed values and turns them into
   *  the call site's specific API call. The wizard only owns state + steps. */
  onSubmit: (values: Record<string, string>, extra: { turnstileToken: string; honeypot: string }) => Promise<void>;
  /** Custom submit button label for step 2. */
  submitLabel?: string;
  /** Custom heading for step 1. */
  headingStep1?: string;
  /** Custom subheading for step 1. */
  subStep1?: string;
  /** Custom heading for step 2. */
  headingStep2?: string;
  /** Custom subheading for step 2. */
  subStep2?: string;
  /** Map standard logical fields to backend keys. Defaults are identity. */
  fieldKeys?: Partial<{
    name: string;
    phone: string;
    postcode: string;
    email: string;
    serviceNeeded: string;
    roofType: string;
    message: string;
  }>;
  /** Roof-type options. Defaults to the canonical four. */
  roofOptions?: RoofOption[];
  /** Service-needed options. Defaults to the canonical six. */
  serviceOptions?: ServiceOption[];
  /** Extra step-2 fields rendered after email (e.g. "same-day callback"). */
  extraStep2?: (values: Record<string, string>, update: (key: string, value: string) => void) => ReactNode;
  /** Validation applied before submit. Return an error string, or null to pass. */
  validate?: (values: Record<string, string>) => string | null;
};

const DEFAULT_ROOF_OPTIONS: RoofOption[] = [
  { value: 'tile', label: 'Tile Roof' },
  { value: 'slate', label: 'Slate Roof' },
  { value: 'flat', label: 'Flat Roof' },
  { value: 'other', label: 'Other / Not Sure' },
];

const DEFAULT_SERVICE_OPTIONS: ServiceOption[] = [
  { value: 'leak-repair', label: 'Leak Repair' },
  { value: 'new-roof', label: 'New Roof' },
  { value: 'flat-roof', label: 'Flat Roof' },
  { value: 'tile-replacement', label: 'Tile Replacement' },
  { value: 'guttering', label: 'Guttering / Fascias' },
  { value: 'general', label: 'General Inspection' },
];

const IDENTITY_FIELD_KEYS = {
  name: 'name',
  phone: 'phone',
  postcode: 'postcode',
  email: 'email',
  serviceNeeded: 'serviceNeeded',
  roofType: 'roofType',
  message: 'message',
};

export function LeadFormWizard({ config }: { config: LeadFormWizardConfig }) {
  const keys = { ...IDENTITY_FIELD_KEYS, ...(config.fieldKeys ?? {}) };

  // Two-step state machine: step 1 gathers "service + roof type + name + phone";
  // step 2 gathers "postcode + email + notes + turnstile".
  const [step, setStep] = useState<1 | 2>(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Whether the error box also offers the phone number.
   *
   * Kept separate from `error` on purpose. The same box renders both "please
   * enter your postcode" and "we could not reach the server", and a number
   * under the first reads as though the form is broken. Only a failed SUBMIT
   * sets this.
   *
   * The number is rendered as a <TrackedPhoneLink>, never as text — this wizard
   * is the shared form behind all eight lead forms, so a hardcoded number here
   * would be the one number on the page Google's forwarding swap cannot reach,
   * shown at the exact moment a frustrated visitor is most likely to dial it.
   */
  const [errorCanCall, setErrorCanCall] = useState(false);
  const [success, setSuccess] = useState(false);

  /** Clears the error box and, with it, the offer to phone instead. */
  const clearError = () => {
    setError(null);
    setErrorCanCall(false);
  };

  const update = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (error) clearError();
  };

  const roofKey = keys.roofType;
  const serviceKey = keys.serviceNeeded;
  const nameKey = keys.name;
  const phoneKey = keys.phone;
  const postcodeKey = keys.postcode;
  const emailKey = keys.email;
  const messageKey = keys.message;

  const step1FieldsValid = () => {
    const name = values[nameKey]?.trim();
    const phone = values[phoneKey]?.trim();
    const service = values[serviceKey]?.trim();
    const roof = values[roofKey]?.trim();
    // Name, phone, service-needed, and roof-type are the hard minimums for step 1.
    return Boolean(name && phone && service && roof);
  };

  const goToStep2 = () => {
    if (!step1FieldsValid()) {
      setError('Please fill in your name, phone number, and select the service you need and your roof type.');
      return;
    }
    clearError();
    setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (config.validate) {
      const validationError = config.validate(values);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    const postcode = values[postcodeKey]?.trim();
    if (!postcode) {
      setError('Please enter your postcode.');
      return;
    }

    setLoading(true);
    clearError();

    try {
      await config.onSubmit(values, { turnstileToken, honeypot });
      setSuccess(true);
    } catch (err: any) {
      // No number in this string. The three API routes used to append one, and
      // their text renders verbatim in the box below — so a message carrying the
      // real number would bypass the swap even once this component was fixed.
      // They have been stripped; the tracked link renders underneath instead.
      setError(err?.message || 'Something went wrong. Please try again.');
      setErrorCanCall(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <Check className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="mb-1 text-xl font-bold text-brand-navy">Request received</h3>
        <p className="text-sm text-gray-600">Thanks. We will be in touch shortly.</p>
      </div>
    );
  }

  const inputClass =
    'mt-1.5 h-12 text-base border-2 border-brand-navy/20 focus:border-brand-orange rounded-md';
  const labelClass = 'text-brand-navy font-semibold text-sm uppercase tracking-wide';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-3">
        <span className="text-brand-orange font-semibold text-sm uppercase tracking-[0.15em]">
          Step {step} of 2
        </span>
        <div className="flex flex-1 items-center gap-1.5">
          <span
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              step >= 1 ? 'bg-brand-orange' : 'bg-gray-200'
            )}
          />
          <span
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              step >= 2 ? 'bg-brand-orange' : 'bg-gray-200'
            )}
          />
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-5">
          {config.headingStep1 && (
            <div>
              <h3 className="text-lg font-bold text-brand-navy">{config.headingStep1}</h3>
              {config.subStep1 && <p className="mt-1 text-sm text-gray-600">{config.subStep1}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>Service Needed</Label>
              <Select value={values[serviceKey]} onValueChange={(v) => update(serviceKey, v)}>
                <SelectTrigger className={cn(inputClass, 'text-left')}>
                  <SelectValue placeholder="What you need" />
                </SelectTrigger>
                <SelectContent>
                  {(config.serviceOptions ?? DEFAULT_SERVICE_OPTIONS).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Roof Type</Label>
              <Select value={values[roofKey]} onValueChange={(v) => update(roofKey, v)}>
                <SelectTrigger className={cn(inputClass, 'text-left')}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(config.roofOptions ?? DEFAULT_ROOF_OPTIONS).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className={labelClass}>Full Name</Label>
            <Input
              value={values[nameKey] ?? ''}
              onChange={(e) => update(nameKey, e.target.value)}
              placeholder="John Smith"
              autoComplete="name"
              className={inputClass}
            />
          </div>

          <div>
            <Label className={labelClass}>Phone Number</Label>
            <Input
              type="tel"
              value={values[phoneKey] ?? ''}
              onChange={(e) => update(phoneKey, e.target.value)}
              placeholder="01270 123456"
              autoComplete="tel"
              className={inputClass}
            />
          </div>

          <Button
            type="button"
            onClick={goToStep2}
            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold h-12 rounded-md"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {config.headingStep2 && (
            <div>
              <h3 className="text-lg font-bold text-brand-navy">{config.headingStep2}</h3>
              {config.subStep2 && <p className="mt-1 text-sm text-gray-600">{config.subStep2}</p>}
            </div>
          )}

          <div>
            <Label className={labelClass}>Postcode</Label>
            <Input
              value={values[postcodeKey] ?? ''}
              onChange={(e) => update(postcodeKey, e.target.value)}
              placeholder="CW11 4NE"
              autoComplete="postal-code"
              className={inputClass}
            />
          </div>

          <div>
            <Label className={labelClass}>Email Address</Label>
            <Input
              type="email"
              value={values[emailKey] ?? ''}
              onChange={(e) => update(emailKey, e.target.value)}
              placeholder="john@example.com"
              autoComplete="email"
              className={inputClass}
            />
          </div>

          {config.extraStep2 && (
            <div>
              {config.extraStep2(values, update)}
            </div>
          )}

          <div>
            <Label className={labelClass}>Notes (optional)</Label>
            <Textarea
              value={values[messageKey] ?? ''}
              onChange={(e) => update(messageKey, e.target.value)}
              placeholder="Anything else we should know about your project"
              rows={3}
              className="mt-1.5 text-base border-2 border-brand-navy/20 focus:border-brand-orange rounded-md resize-none"
            />
          </div>

          {/* Honeypot · hidden from humans, visible to bots */}
          <div className="hidden" aria-hidden="true">
            <Label>Website</Label>
            <Input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <TurnstileWidget onToken={setTurnstileToken} />

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
              {errorCanCall && (
                <p className="mt-1 text-sm text-red-800">
                  You can also call us on{' '}
                  <TrackedPhoneLink
                    placement="lead_form_error"
                    className="font-semibold underline underline-offset-2"
                  />
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="h-12 rounded-md border-brand-navy/30 text-brand-navy"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold h-12 rounded-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting
                </>
              ) : (
                config.submitLabel ?? 'Submit'
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
