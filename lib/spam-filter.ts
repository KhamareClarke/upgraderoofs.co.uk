/**
 * lib/spam-filter.ts
 *
 * Content-level spam detection for the lead-capture routes. Sits alongside
 * (and after) the honeypot / rate-limit / Turnstile / validateLeadFields guards,
 * but targets a specific class of junk those miss: B2B solicitation pitches
 * — outsourced estimating, marketing/SEO cold outreach, boilerplate — plus
 * scraper artifacts like URLs pasted into free-text fields.
 *
 * THREE OUTCOMES, NOT TWO — READ THIS BEFORE TIGHTENING ANY RULE
 * --------------------------------------------------------------
 * This module used to answer a boolean: spam or not. Every "yes" silently
 * destroyed the lead (decoy 200, no CRM, no email). That asymmetry is what made
 * the filter so dangerous: a rule that was 99% right still deleted real
 * customers, and nothing anywhere recorded that it had happened. It ran that way
 * for 19 days.
 *
 * So the verdict is now three-valued:
 *
 *   'block'  — confident spam. Dropped with a decoy 200 so bots can't adapt.
 *              Only for signals a genuine roofing enquiry essentially cannot
 *              produce. Every rule that reaches this tier must be defensible.
 *   'review' — suspicious. The lead is DELIVERED NORMALLY and flagged: a durable
 *              log entry plus a `needs-review` tag in GoHighLevel, so a human
 *              can judge it. It is never dropped.
 *   'allow'  — clean.
 *
 * The asymmetry is deliberate. A false negative costs an annoyance in the CRM;
 * a false positive costs a customer. When a rule is ambiguous, it belongs in
 * 'review', and the default for anything unrecognised is 'allow'.
 *
 * DO NOT add a bare substring of an ordinary English word to any block-tier
 * list. `text.includes('marketing')` matched "I saw your marketing leaflet" and
 * `text.includes('seo')` matched anything containing those three letters. Single
 * common words now live in the review tier, word-bounded.
 *
 * All checks are pure and case-insensitive. No network, no I/O.
 */

export type SpamVerdict = 'allow' | 'review' | 'block';

export interface SpamAssessment {
  verdict: SpamVerdict;
  /**
   * Short, PII-free rule tags (e.g. "multiple-links"). Safe to persist to
   * lead_pipeline_events — never include the matched text itself.
   */
  reasons: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 1 — unambiguous solicitation. Blocking on one of these carries almost no
// false-positive risk, because the phrasing is second-person sales copy that a
// homeowner or landlord has no reason to write.
// ─────────────────────────────────────────────────────────────────────────────
const B2B_STRONG_PHRASES = [
  'estimating support',
  'price more projects',
  'virtual assistant',
  'lead generation',
  'lead-gen',
  'search engine optimization',
  'search engine optimisation',
  'seo services',
  'seo audit',
  'backlinks',
  'link building',
  'social media marketing',
  'digital marketing',
  'content marketing',
  'web design service',
  'website redesign',
  'google ranking',
  'grow your business',
  'scale your business',
  'boost your sales',
  'increase your conversions',
  'cold outreach',
  'appointment setting',
  'data scraping',
  'web scraping',
  'this is not spam',
];

// ─────────────────────────────────────────────────────────────────────────────
// Tier 2 — ambiguous. These can appear in a genuine enquiry, so they flag for
// human review and NEVER drop the lead.
//
// 'came across your company' used to be a hard block. It is one of the most
// natural things a real customer writes ("I came across your company on
// Google"), which made it a lead-deleting rule; it is review-tier now.
// ─────────────────────────────────────────────────────────────────────────────
const B2B_WEAK_PHRASES = [
  'come across your company',
  'came across your company',
  'came across your website',
  'outsource',
  'we provide ',
  'we specialise in',
  'we specialize in',
  'click here',
  'learn more at',
  'visit our website',
  'check out our',
  'free consultation',
  'unsolicited',
  'reach out to you',
  'touch base',
];

// Single ordinary words, word-bounded. Substring matching is NOT used here:
// `includes('seo')` also matches "Seoul", and `includes('marketing')` matches
// any sentence about a leaflet, a van, or a letterbox. These words are common
// enough in legitimate customer messages that they must never reach the block
// tier — a plumbing/roofing customer writing "I saw your marketing leaflet" is
// describing how they found the business, not selling anything.
const B2B_WEAK_WORDS = [/\bseo\b/i, /\bmarketing\b/i, /\bbacklink/i, /\bcold call/i];

// Literal placeholder / automation handles in the name field. A real person does
// not type these, so they are safe to block.
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

// ─────────────────────────────────────────────────────────────────────────────
// Link detection
//
// The rule this replaces — "any `<label>.<tld>` run is spam" — is what broke.
// It matched the domain inside every email address, and it also matched a
// customer writing "I found you on checkatrade.co.uk". A domain-shaped string is
// evidence only in combination, never on its own; single mentions are review.
//
// The TLD list is an allow-list rather than `[a-z]{2,}`, which matters: the
// generic form matches sentence fragments like "quote.Thanks" and "approx.Need",
// producing phantom link hits from ordinary prose.
// ─────────────────────────────────────────────────────────────────────────────
const TLDS =
  'com|co\\.uk|org\\.uk|gov\\.uk|ac\\.uk|sch\\.uk|uk\\.com|net|org|io|uk|me|biz|info|' +
  'xyz|top|click|link|shop|store|online|site|live|icu|sbs|cyou|rest|buzz|monster|loan|' +
  'co|us|tv|cc|app|dev|ai|cloud|email|pro|name|biz';

const DOMAIN_RE = new RegExp(
  `\\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${TLDS})\\b`,
  'gi',
);

// Free/high-abuse TLDs. These appear in genuine UK roofing enquiries about as
// often as they appear in a customer's postcode field, which is to say never.
const ABUSE_TLDS = new Set([
  'xyz', 'top', 'click', 'link', 'loan', 'buzz', 'monster', 'cyou',
  'sbs', 'icu', 'rest', 'quest', 'cfd', 'tk', 'ml', 'ga', 'cf', 'gq',
]);

const SHORTENER_HOSTS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'rebrand.ly', 'cutt.ly', 'shorturl.at', 'rb.gy', 'surl.li', 'tiny.cc',
  'bit.do', 'soo.gd', 'clck.ru', 'shorte.st', 'adf.ly',
]);

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Shortener hosts and abuse TLDs are matched against the raw text as well as
// against DOMAIN_RE's hosts, and that redundancy is load-bearing. Most shortener
// suffixes (`ly`, `gl`, `gd`, `st`, `ru`, `at`) and half the abuse list (`tk`,
// `ml`, `ga`, `cf`, `gq`) are absent from TLDS on purpose — they are not
// plausible suffixes in a UK roofing enquiry — which means DOMAIN_RE can never
// produce a host carrying them. Checking only the sets above would leave both
// rules as dead code that passes any test which feeds them by hand.
//
// The trailing `(?![\w-])` prevents a partial-host match ("is.gd" inside
// "is.gdfoo") while still matching at a sentence end, where a period follows.
const SHORTENER_RE = new RegExp(
  `\\b(?:${Array.from(SHORTENER_HOSTS).map(escapeRe).join('|')})(?![\\w-])`,
  'i',
);

const ABUSE_TLD_RE = new RegExp(
  `\\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${Array.from(ABUSE_TLDS).join('|')})(?![\\w-])`,
  'i',
);

// An email address is not a URL, but it always contains a `<label>.<tld>` run
// that DOMAIN_RE would otherwise match. Mask embedded addresses so a genuine
// enquiry that says "reply to me at a@b.com" is not flagged as link spam.
const EMAIL_LIKE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function maskEmails(value: string): string {
  return value.replace(EMAIL_LIKE, ' [email] ');
}

/**
 * Distinct hosts mentioned in a string, lower-cased and de-prefixed of `www.`,
 * so "www.x.com and x.com" counts once.
 */
function hostsIn(text: string): Set<string> {
  const found = text.match(DOMAIN_RE) || [];
  return new Set(found.map((h) => h.toLowerCase().replace(/^www\./, '')));
}

function tldOf(host: string): string {
  const parts = host.split('.');
  // Two-part public suffixes used by this list (co.uk, org.uk, …).
  const lastTwo = parts.slice(-2).join('.');
  if (/^(co|org|gov|ac|sch)\.uk$/.test(lastTwo) || lastTwo === 'uk.com') return lastTwo;
  return parts[parts.length - 1];
}

// Fields that carry machine tokens rather than human prose. The Turnstile token
// and gclid are long random strings; scanning them as text is pure noise, and a
// random token is exactly the kind of input that can accidentally look
// domain-shaped. They are never user-authored, so they are never evidence.
const MACHINE_FIELDS = new Set([
  'website', // honeypot — checked by the route before this filter runs
  'turnstileToken',
  'turnstile_token',
  'cf-turnstile-response',
  'gclid',
]);

/**
 * Pull every string value out of the payload (recursing into nested objects) so
 * the filter inspects all the free text the client sent — minus machine tokens.
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
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (MACHINE_FIELDS.has(key)) continue;
      collectStrings(v, out);
    }
  }
}

function hasWeakPitch(text: string): boolean {
  const lower = text.toLowerCase();
  if (B2B_WEAK_PHRASES.some((phrase) => lower.includes(phrase))) return true;
  return B2B_WEAK_WORDS.some((re) => re.test(text));
}

function hasStrongPitch(text: string): boolean {
  const lower = text.toLowerCase();
  return B2B_STRONG_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * Classify a submission.
 *
 * `block` requires a signal that ordinary customer prose cannot produce:
 *   - a placeholder/automation name
 *   - a domain in the name/phone/postcode field (a human never types one there)
 *   - a link shortener, or a high-abuse TLD
 *   - two or more distinct hosts (nobody pastes a link list into a roof enquiry)
 *   - one host plus any pitch language
 *   - unambiguous second-person sales copy
 *
 * Everything softer — one domain mentioned in passing, a single ordinary word
 * like "marketing", boilerplate that a real customer might also write — returns
 * 'review', which delivers the lead and flags it.
 */
export function assessSubmission(payload: object): SpamAssessment {
  if (!payload || typeof payload !== 'object') {
    return { verdict: 'block', reasons: ['empty-payload'] };
  }

  const record = payload as Record<string, unknown>;

  // ── 1. Placeholder / automation name ──────────────────────────────────────
  const name = typeof record.name === 'string' ? record.name : '';
  if (name) {
    const hit = SUSPICIOUS_NAME_PATTERNS.find((re) => re.test(name));
    if (hit) return { verdict: 'block', reasons: ['placeholder-name'] };
  }

  // ── 2. Domains in structured fields ───────────────────────────────────────
  // `email` is deliberately absent. An address is not a URL, yet its domain
  // (`gmail.com`) always looks like one — checking it here is what discarded
  // every submission carrying an email address. Name/phone/postcode have rigid
  // formats that a domain cannot legitimately appear in.
  for (const key of ['name', 'phone', 'postcode']) {
    const v = record[key];
    if (typeof v === 'string' && v && hostsIn(maskEmails(v)).size > 0) {
      return { verdict: 'block', reasons: [`domain-in-${key}`] };
    }
  }

  // ── 3. Free-text signals, aggregated across every field ───────────────────
  const all: string[] = [];
  collectStrings(payload, all);

  const hosts = new Set<string>();
  let strongPitch = false;
  let weakPitch = false;
  let shortener = false;
  let abuseTld = false;

  for (const raw of all) {
    const text = maskEmails(raw);
    if (!strongPitch && hasStrongPitch(text)) strongPitch = true;
    if (!weakPitch && hasWeakPitch(text)) weakPitch = true;

    const found = hostsIn(text);
    if (found.size > 0) {
      for (const host of Array.from(found)) {
        hosts.add(host);
        if (SHORTENER_HOSTS.has(host)) shortener = true;
        if (ABUSE_TLDS.has(tldOf(host))) abuseTld = true;
      }
    }
    // Second pass for the suffixes DOMAIN_RE cannot produce — see the comment
    // on SHORTENER_RE. Without this, a bit.ly link in a message is invisible.
    if (!shortener && SHORTENER_RE.test(text)) shortener = true;
    if (!abuseTld && ABUSE_TLD_RE.test(text)) abuseTld = true;
  }

  // ── 4. Verdict ────────────────────────────────────────────────────────────
  if (shortener) return { verdict: 'block', reasons: ['url-shortener'] };
  if (abuseTld) return { verdict: 'block', reasons: ['abuse-tld'] };
  if (hosts.size >= 2) return { verdict: 'block', reasons: ['multiple-links'] };
  if (hosts.size >= 1 && (strongPitch || weakPitch)) {
    return { verdict: 'block', reasons: ['link-plus-pitch'] };
  }
  if (strongPitch) return { verdict: 'block', reasons: ['b2b-pitch'] };

  // Soft signals — deliver the lead, flag it for a human.
  const reviewReasons: string[] = [];
  if (hosts.size >= 1) reviewReasons.push('mentions-a-domain');
  if (weakPitch) reviewReasons.push('possible-b2b-pitch');
  if (reviewReasons.length > 0) return { verdict: 'review', reasons: reviewReasons };

  return { verdict: 'allow', reasons: [] };
}

/**
 * Boolean wrapper retained for callers and scripts that only need "is this
 * confident spam?". `true` means block-tier only — a review-tier submission
 * returns `false` and is delivered, which is the point of the split.
 *
 * New code should prefer assessSubmission() so it can act on the 'review' tier.
 */
export function isSpamSubmission(payload: object): boolean {
  return assessSubmission(payload).verdict === 'block';
}
