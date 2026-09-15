import { createHash, timingSafeEqual } from 'crypto';

/**
 * lib/shared-secret.ts
 *
 * Constant-time comparison for the shared secrets that guard the webhook and
 * diagnostic routes. Extracted so the three call sites cannot drift apart, and
 * because getting this subtly wrong is invisible: every implementation below
 * "works" in the sense that it returns the right boolean.
 *
 * Why constant time. `provided !== expected` short-circuits on the first
 * differing byte, so the time it takes to reject leaks how many leading
 * characters of a guess were correct — enough to recover a secret byte by byte.
 * A plain `===` on a secret is a real vulnerability, not a style nit.
 *
 * Why SHA-256 first. `crypto.timingSafeEqual` throws when the two buffers
 * differ in length, and that throw is itself a length oracle. Hashing both sides
 * normalises every input to 32 bytes, so the comparison is between two
 * equal-length buffers no matter what the caller sent.
 *
 * There is no `secretMatches` variant that fails open. A guard is only as good
 * as its worst branch, and "the env var was missing" has been the actual failure
 * mode on this codebase twice (`CALL_TRACKING_WEBHOOK_SECRET`, and this route's
 * complete lack of a guard). Callers decide what an unset var means; they must
 * decide it explicitly.
 */

/** Constant-time equality. Safe for any input, including null/undefined. */
export function secretMatches(
  provided: string | null | undefined,
  expected: string,
): boolean {
  if (!provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Read the caller's secret from any of the places our providers and scripts
 * actually put it. Structural types so this stays importable from a route
 * without pulling in Next's request types.
 *
 * @param opts.headers    header names to try, in order (default `x-shared-secret`)
 * @param opts.queryParam query parameter name (default `secret`)
 * @param opts.body       parsed JSON body, if the route reads one
 * @param opts.bodyFields dotted paths to try inside `body` (default `['secret']`)
 */
export function readProvidedSecret(
  request: { headers: { get(name: string): string | null }; url: string },
  opts: {
    headers?: string[];
    queryParam?: string | null;
    body?: unknown;
    bodyFields?: string[][];
  } = {},
): string | null {
  const headerNames = opts.headers ?? ['x-shared-secret'];
  for (const name of headerNames) {
    const value = request.headers.get(name);
    if (value) return value;
  }

  const param = opts.queryParam === undefined ? 'secret' : opts.queryParam;
  if (param) {
    try {
      const value = new URL(request.url).searchParams.get(param);
      if (value) return value;
    } catch {
      // A malformed URL cannot carry a secret; fall through to the body.
    }
  }

  if (opts.body != null) {
    for (const path of opts.bodyFields ?? [['secret']]) {
      let cur: any = opts.body;
      let ok = true;
      for (const key of path) {
        if (cur == null || typeof cur !== 'object' || !(key in cur)) {
          ok = false;
          break;
        }
        cur = cur[key];
      }
      if (ok && cur != null && cur !== '') return String(cur);
    }
  }

  return null;
}
