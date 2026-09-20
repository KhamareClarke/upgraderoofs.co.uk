import { secretMatches } from '@/lib/shared-secret';

/**
 * lib/dashboard-slug.ts
 *
 * The access control for the private lead dashboard at /dashboard/<slug>.
 *
 * ── The model, stated plainly ────────────────────────────────────────────────
 *
 * There is no login. The URL is the credential. That is a deliberate product
 * choice, and it has exactly one security requirement: the slug must be long,
 * random, and treated as a secret. It is 24 hex characters (96 bits), generated
 * from `crypto.randomBytes`, which is not guessable by enumeration.
 *
 * The consequence a reader should hold onto: anyone who obtains the URL sees
 * the numbers. That is why the value lives in an env var and never in source —
 * a literal here would be committed, and a secret in git is a published secret.
 * It is also why the page and the API route are both `noindex` and disallowed in
 * robots.txt: the slug must not reach a search index or a referrer header.
 *
 * ── Fail closed, matching /api/fleet/diagnose ────────────────────────────────
 *
 * When `DASHBOARD_MARCUS_SLUG` is unset this returns false for everything, so the
 * dashboard 404s. The alternative — treating "unset" as "no guard needed" — is
 * the failure mode this codebase has already shipped twice (the call-tracking
 * webhook accepted every caller because its secret was unset; /api/fleet/diagnose
 * had no guard at all). A private dashboard that silently becomes public when an
 * env var goes missing is worse than one that goes offline, because nobody
 * notices the first one.
 *
 * ── Why the comparison is constant-time ──────────────────────────────────────
 *
 * `provided !== expected` short-circuits on the first differing byte, so the time
 * to reject leaks how many leading characters of a guess were correct. With a
 * 404 as the only feedback, that is the difference between 2^96 guesses and 24
 * sequential ones. `secretMatches` SHA-256s both sides first, so the comparison
 * is between equal-length buffers (`timingSafeEqual` throws on a length mismatch,
 * and that throw is itself a length oracle).
 *
 * Note the slug is a URL PATH SEGMENT, so it also passes through Vercel's and
 * Next's access logs. That is unavoidable for a path-based credential and is
 * acceptable because the value is random rather than derived from anything.
 */

const ENV_VAR = 'DASHBOARD_MARCUS_SLUG';

/**
 * The configured slug, or null when unset/blank.
 *
 * Trimmed because a trailing newline pasted into a Vercel env var UI is a real
 * occurrence, and it would otherwise mean every URL 404s with no clue why.
 */
export function configuredSlug(): string | null {
  const value = (process.env[ENV_VAR] || '').trim();
  return value.length > 0 ? value : null;
}

/**
 * Whether `provided` is the dashboard slug.
 *
 * Returns false when the env var is unset — see the fail-closed note above.
 * Never throws: `provided` comes straight off a URL path, so it can be anything
 * including an empty string or a percent-encoded oddity.
 */
export function isDashboardSlug(provided: string | null | undefined): boolean {
  const expected = configuredSlug();
  if (!expected) return false;
  return secretMatches(provided, expected);
}

/**
 * Whether the dashboard is configured at all. Used to distinguish "this
 * deployment has no dashboard" from "you have the wrong URL" in the server log,
 * and to let the UI say so instead of rendering an empty shell.
 */
export function dashboardIsConfigured(): boolean {
  return configuredSlug() !== null;
}
