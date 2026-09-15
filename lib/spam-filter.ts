/**
 * lib/spam-filter.ts
 *
 * Content-level spam detection for the lead-capture routes. Sits alongside
 * (and after) the honeypot / rate-limit / Turnstile / validateLeadFields guards, but
 * targets a specific class of junk those guards miss: B2B solicitation pitches
 * — outsourced estimating, marketing/SEO cold outreach, "I came across your
 * company…" boilerplate — plus scraper/automation artifacts like URLs embedded
 * in free-text fields and literal placeholder names (e.g. "gclid").
 *
 * Unlike validateLeadFields (which rejects garbage a human would never submit), this
 * filter exists to catch *plausibly human* messages that are merely unwanted.
 * The route silently drops them (returns fake success) so the sender can't
 * tell they were filtered, and — critically — never dispatches them to
 * GoHighLevel or the notify inbox.
 *
 * All checks are pure, case-insensitive substring / pattern matches.
 */

// --- B2B pitch keyword / phrase substrings --------------------------------
// Lower-cased phrases that signal an unsolicited commercial pitch rather than
// a genuine roofing enquiry. Matched as substrings so "we provide estimating
// support" still lands.
const B2B_PHRASES = [
  'come across your company',
  'came across your company',
  'estimating support',
  'price more projects',
  'virtual assistant',
  'outsource',
  'lead generation',
  'lead-gen',
  'search engine optimization',
  'search engine optimisation',
  'google ranking',
  'seo services',
  'seo audit',
  'backlinks',
  'link building',
  'social media marketing',
  'digital marketing',
  'content marketing',
  'web design service',
  'website redesign',
  'we provide ',
  'we specialise in',
  'we specialize in',
  'grow your business',
  'scale your business',
  'boost your sales',
  'increase your conversions',
  'cold outreach',
  'appointment setting',
  'data scraping',
  'web scraping',
  'click here',
  'learn more at',
  'visit our website',
  'check out our',
  'free consultation',
  'this is not spam',
  'unsolicited',
];

// Domain / TLD fragments that shouldn't appear in a genuine short enquiry.
// A legitimate customer doesn't paste a URL into a phone/name/postcode field,
// and a "message" that has one is almost always a scraper or a sales bot.
const URL_PATTERNS = [
  /\bhttps?:\/\//i,
  /\bwww\./i,
  /\b[a-z0-9-]+\.(com|co\.uk|org\.uk|net|org|io|biz|info|xyz|me|uk)\b/i,
];

// Literal placeholder / automation handles in the name field.
const SUSPICIOUS_NAME_PATTERNS = [
  /^gclid$/i,
  /^null$/i,
  /^undefined$/i,
  /^(test|testing|tester)$/i,
  /^user$/i,
  /^bot$/i,
  /^admin$/i,
  /^www\./i,
  /\b(bot|crawler|scraper|spider)\b/i,
];

function isUrlLike(value: string): boolean {
  return URL_PATTERNS.some((re) => re.test(value));
}

// An email address is not a URL, but it always contains a `<label>.<tld>` run
// that the TLD pattern above cannot help matching — so `isUrlLike('a@gmail.com')`
// is true. Mask any embedded address before running URL detection over free
// text, so a genuine enquiry that says "reply to me at a@b.com" is not mistaken
// for link spam while a pasted URL still trips the rule.
const EMAIL_LIKE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function maskEmails(value: string): string {
  return value.replace(EMAIL_LIKE, ' [email] ');
}

function hasB2bPitch(value: string): boolean {
  const text = value.toLowerCase();
  if (text.includes('seo')) return true;
  if (text.includes('marketing')) return true;
  return B2B_PHRASES.some((phrase) => text.includes(phrase));
}

/**
 * Pull every string value out of the payload (recursing one level into nested
 * objects) so the filter inspects all free-text the client sent.
 */
function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStrings(v, out);
    }
  }
}

/**
 * Determine whether a submission looks like spam that should be silently
 * dropped (no GHL dispatch, no notify email) rather than an enquiry we want.
 *
 * - Any URL / domain fragment in a non-URL-free-text field → spam.
 * - A B2B pitch phrase in the message/subject/service text → spam.
 * - A placeholder/automation name → spam.
 */
export function isSpamSubmission(payload: object): boolean {
  if (!payload || typeof payload !== 'object') return true;

  const record = payload as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name : '';

  // Name-based automation artifact.
  if (SUSPICIOUS_NAME_PATTERNS.some((re) => re.test(name))) return true;

  // URL presence in name/phone/postcode — fields a human never puts a URL in.
  // The `email` field is deliberately excluded: an address is not a URL, yet its
  // domain (`gmail.com`) always matches the TLD pattern, so checking it here
  // discarded every submission that carried one — i.e. all of them.
  for (const key of ['name', 'phone', 'postcode']) {
    const v = record[key];
    if (typeof v === 'string' && isUrlLike(v)) return true;
  }

  // B2B pitch + URL detection across every remaining string field
  // (message, subject, service_type, roof_type, serviceNeeded, etc.). Embedded
  // email addresses are masked before URL matching, so free text that merely
  // mentions an address is not mistaken for link spam.
  const all: string[] = [];
  collectStrings(payload, all);
  for (const raw of all) {
    const text = maskEmails(raw);
    if (hasB2bPitch(text)) return true;
    if (isUrlLike(text)) return true;
  }

  return false;
}
