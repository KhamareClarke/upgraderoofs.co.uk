/**
 * lib/lead-validation.ts
 *
 * Server-side spam / junk-lead validation for the lead-capture routes.
 * The honeypot + in-memory rate limiter alone were letting bot submissions
 * through (serverless instances reset the rate-limit Map on cold start, and
 * bots rotate IPs / skip hidden fields). These checks validate the actual
 * content of a lead, which is far harder for a bot to fake convincingly.
 *
 * All checks are pure functions returning a reason string on failure, or null
 * when the value looks legitimate. The route decides the HTTP response.
 */

// --- UK phone ---------------------------------------------------------------
// Validate on digits only. Normalise to the National Significant Number (NSN,
// no trunk 0 / country code) then check length + a valid UK leading digit.
// UK NSNs are 10 digits (with a few 9-digit ranges); mobiles start 7,
// geographic start 1/2, non-geographic 3/8/9.

export function invalidPhoneReason(phone: unknown): string | null {
  if (typeof phone !== 'string') return 'phone missing';
  const digits = phone.replace(/\D/g, '');
  // Normalise: strip country code (44) then any single trunk 0.
  let nsn = digits.startsWith('0044') ? digits.slice(4)
    : digits.startsWith('44') && digits.length > 10 ? digits.slice(2)
    : digits;
  if (nsn.startsWith('0')) nsn = nsn.slice(1);
  if (nsn.length < 9 || nsn.length > 10) return `phone length ${nsn.length} out of range`;
  // Reject obvious repeated/sequential junk (e.g. 0000000000, 1234567890).
  if (/^(\d)\1{8,}$/.test(nsn)) return 'phone is a repeated digit';
  if (/123456789|987654321/.test(nsn)) return 'phone is sequential';
  // Must start with a valid UK NSN leading digit.
  if (!/^[123789]/.test(nsn)) return 'phone not a UK format';
  return null;
}

// --- UK postcode ------------------------------------------------------------
// Standard UK postcode regex (outcode + incode), case-insensitive.
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function invalidPostcodeReason(postcode: unknown): string | null {
  if (typeof postcode !== 'string' || !postcode.trim()) return 'postcode missing';
  const p = postcode.trim();
  if (!UK_POSTCODE.test(p)) return 'postcode not a UK format';
  return null;
}

// --- Name -------------------------------------------------------------------
// Catches gibberish / keyboard-mash / single-char / numeric "names" that bots
// submit, while allowing real multi-word and hyphenated/apostrophe names.
export function invalidNameReason(name: unknown): string | null {
  if (typeof name !== 'string') return 'name missing';
  const n = name.trim();
  if (n.length < 2) return 'name too short';
  if (n.length > 80) return 'name too long';
  if (/\d/.test(n)) return 'name contains digits';
  // Must contain at least one vowel or a recognised name particle — pure
  // consonant strings (e.g. "qwrtypsdfg") are almost always bot junk.
  if (!/[aeiouy]/i.test(n)) return 'name has no vowels';
  // Reject long runs of the same character (e.g. "aaaaaa").
  if (/(.)\1{3,}/i.test(n)) return 'name has repeated characters';
  // Reject if it looks like random case-mashed gibberish: no spaces and a
  // high ratio of consonant clusters. Keep this lenient to avoid false
  // positives on real surnames.
  const letters = n.replace(/[^a-z]/gi, '');
  if (letters.length >= 6 && !/\s/.test(n)) {
    const consonantClusters = letters.match(/[bcdfghjklmnpqrstvwxz]{4,}/gi);
    if (consonantClusters && consonantClusters.length > 0) return 'name looks like gibberish';
  }
  return null;
}

// --- Name / gclid isolation ---------------------------------------------------
// Google Ads (and other ad platform) click identifiers sometimes leak into the
// "name" field when a tracking script writes the token into the wrong input.
// A gclid is 20-128 chars of [A-Za-z0-9_-]; it is never a human name, so detect
// it and the token-ish shapes that commonly bleed in, and resolve the lead's
// display name to a safe fallback rather than persisting a broken token.

const GCLID_LIKE_RE = /^[A-Za-z0-9_-]{20,128}$/;
const AD_TOKEN_PREFIX_RE = /^(gclid|gbraid|wbraid|msclkid|fbclid|ttclid|twclid|li_fat_id|utm|ad_id|click_id|adid)\b/i;

/** True when the submitted "name" is actually an ad-tracking token, not a person. */
export function nameLooksLikeTrackingToken(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  if (!n) return false;
  if (AD_TOKEN_PREFIX_RE.test(n)) return true;
  // A self-authored name is rarely a naked 20+ char token with no space —
  // while a gclid always is. Guard against false positives on long hyphenated
  // legal names by requiring the token shape AND an absence of whitespace.
  return !/\s/.test(n) && GCLID_LIKE_RE.test(n);
}

/**
 * Resolve the lead display name, isolating any ad-tracking token that leaked
 * into the name field. Returns a safe name (falling back to a placeholder) and
 * the captured token, so the caller can merge it into its dedicated gclid
 * metadata instead of persisting it as the contact's name.
 */
export function sanitizeLeadName(name: unknown): { name: string; leakedGclid?: string } {
  if (!nameLooksLikeTrackingToken(name)) {
    return { name: typeof name === 'string' && name.trim() ? name : name as string };
  }
  const raw = String(name).trim();
  // Keep the token for offline-conversion attribution; do not make it the name.
  return {
    name: 'Web Lead (Unnamed)',
    leakedGclid: GCLID_LIKE_RE.test(raw) ? raw : undefined,
  };
}

// --- Email ------------------------------------------------------------------
// The contact form (send-contact) is the site's only email-collecting surface,
// and its previous regex check was far too loose — bots slip disposable-domain
// and role-address submissions ("support@", "info@", "@mailinator.com") through
// to the notify inbox. These checks sit on top of the basic @-format test the
// route already performs.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'throwawaymail.com', 'sharklasers.com', 'yopmail.com', 'maildrop.cc',
  'getnada.com', 'temp-mail.org', 'dispostable.com', 'mailnesia.com',
  'trashmail.com', 'mailcatch.com', 'mintemail.com', 'eyepaste.com',
  'spambox.us', 'grr.la', 'spamgourmet.com', 'mail.tm',
  '0vv1.com', 'fakemail.net', 'mailtemp.com', 'getairmail.com',
]);
// NOTE: 'mailbox.org' was on this list and is NOT a disposable provider — it is
// a paid, privacy-focused mailbox (a European peer of ProtonMail). Every real
// customer using one was silently discarded as a spammer. Verify a domain
// actually sells throwaway inboxes before adding it here.

/**
 * Local-parts a *customer* would never use to receive a reply.
 *
 * This list is deliberately short, because a false positive here silently
 * destroys a real lead: the route treats a content-validation failure as spam
 * and returns `200 {success:true}`, so nobody — customer, client, or log —
 * ever sees that the enquiry existed.
 *
 * Removed after testing against plausible customer addresses
 * (`scripts/test-email-validation.js`): admin, info, sales, support, contact,
 * help, office, enquiries, enquiry, hello, mail, test, team, marketing,
 * roofing, quotes, leads. All of those are normal addresses for the kind of
 * customer this business wants — a landlord on `info@`, a letting agent on
 * `office@`, a builder on `sales@`, a firm on `enquiries@` — and `hello@` is a
 * common *personal* Gmail local-part that was being discarded as a role address.
 * What remains is mechanical mailboxes: nothing sends a genuine enquiry from
 * one, and nothing reads a reply sent to one.
 */
const ROLE_ADDRESS_PREFIX = /^(noreply|no-reply|donotreply|do-not-reply|postmaster|abuse|webmaster|mailer-daemon)@/i;

export function invalidEmailReason(email: unknown): string | null {
  if (typeof email !== 'string' || !email.trim()) return 'email missing';
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'email invalid format';
  const domain = e.slice(e.lastIndexOf('@') + 1);
  if (DISPOSABLE_DOMAINS.has(domain)) return 'email is a disposable domain';
  if (ROLE_ADDRESS_PREFIX.test(e)) return 'email is a role/department address';
  return null;
}

// --- Aggregate ---------------------------------------------------------------
export interface LeadFields {
  name?: unknown;
  phone?: unknown;
  postcode?: unknown;
  email?: unknown;
}

/** A field this module knows how to check. */
export type LeadField = keyof LeadFields;

const FIELD_CHECKERS: Record<LeadField, (value: unknown) => string | null> = {
  name: invalidNameReason,
  phone: invalidPhoneReason,
  postcode: invalidPostcodeReason,
  email: invalidEmailReason,
};

export interface LeadFieldRules {
  /** Absent or blank fails. */
  required: readonly LeadField[];
  /** Absent or blank passes; a supplied value must still be well-formed. */
  optional?: readonly LeadField[];
}

/**
 * The single source of truth for what each route demands, so validation cannot
 * drift between routes.
 *
 * These are deliberately NOT one shared list. A route may only require what its
 * form actually collects — requiring anything more turns a legitimate
 * submission into a fake `200 {success:true}` and the lead is lost with no
 * trace. That is not hypothetical: `validateLead()` (this file's previous
 * aggregate) demanded an email from every form, which silently discarded every
 * offer-page submission where the customer left the optional Email field blank.
 *
 *  - quote        QuoteForm / ServiceLeadForm — the wizard hard-requires name,
 *                 phone, service and roof type on step 1 and postcode on
 *                 step 2. Email is optional.
 *  - contact      ContactForm / EnhancedContactSection — collects name, email,
 *                 phone. It has NO postcode field: ContactForm folds it into
 *                 the message body ("Postcode: CW11 4NE") and sends no
 *                 `postcode` key, so requiring one drops every submission.
 *                 Phone is optional — email-only enquiries are legitimate.
 *  - specialOffer the two offer pages — the wizard requires name, phone,
 *                 service, roof type and postcode. The Email input has no
 *                 `required` attribute and both pages check its format only
 *                 when it is non-empty, so it must stay optional here too.
 */
export const FORM_FIELD_RULES: Record<'quote' | 'contact' | 'specialOffer', LeadFieldRules> = {
  quote: { required: ['name', 'phone', 'postcode'], optional: ['email'] },
  contact: { required: ['name', 'email'], optional: [] },
  specialOffer: { required: ['name', 'phone', 'postcode'], optional: [] },
};

/**
 * Validate a lead against one form's rules. Returns a list of failure reasons
 * (empty = the lead looks legitimate); routes treat a non-empty list as spam.
 */
export function validateLeadFields(
  body: Record<string, unknown>,
  rules: LeadFieldRules,
): string[] {
  const reasons: string[] = [];
  for (const field of rules.required) {
    const reason = FIELD_CHECKERS[field](body[field]);
    if (reason) reasons.push(reason);
  }
  for (const field of rules.optional ?? []) {
    const value = body[field];
    if (value === undefined || value === null || value === '') continue;
    const reason = FIELD_CHECKERS[field](value);
    if (reason) reasons.push(reason);
  }
  return reasons;
}
