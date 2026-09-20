/**
 * The live phone number — one module-level store, read through
 * `useSyncExternalStore`.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * Google Ads can swap the number on the page for a forwarding number when a
 * visitor arrived from an ad click, so it can record whether the call was
 * answered and how long it lasted. The swap is delivered to us through
 * `phone_conversion_callback`, and WE render the result — see the config call
 * in components/Analytics.tsx.
 *
 * That is a global mutation driven by a network response, and it has to reach
 * every phone render on the page: the header, the footer, the hero, the
 * floating button. Those live in unrelated subtrees, so a React context would
 * mean wrapping the whole tree and hoping the provider sits above every
 * consumer. A module store has no provider-ordering constraints.
 *
 * ── The rule that keeps hydration honest ────────────────────────────────────
 *
 * `useSyncExternalStore` renders from `getServerSnapshot()` during SSR **and
 * during the hydration render**. Only afterwards does its passive effect
 * compare `getSnapshot()` against what was rendered and force a re-render if
 * they differ.
 *
 * Be precise about the consequence, because the obvious guess is wrong: a
 * pre-hydration write does NOT produce a hydration mismatch warning. The DOM
 * still matches the server HTML; you get a silent extra render instead. The
 * real rule is therefore not "writes cause errors" but:
 *
 *     the hydration render MUST produce the real number, because it has to
 *     match statically-generated HTML — so the swap can only ever land as a
 *     POST-hydration re-render.
 *
 * That is why `getServerSnapshot` returns the real number rather than reading
 * `current`, and why it returns the frozen `REAL_PHONE` constant rather than a
 * fresh object (a new object each call is the documented cause of React's
 * "getServerSnapshot should be cached" infinite loop).
 *
 * So: the store may ONLY be written from inside a `useEffect`. Never during
 * render, never at module scope. `components/Analytics.tsx` is the sole writer
 * and it writes from an effect, so every mutation happens after hydration by
 * construction. Nothing enforces this but the convention — hence this note.
 *
 * Keeping the server render on the real number is also what keeps all ~106
 * marketing pages statically generated and the HTML SEO-clean.
 *
 * ── Only import this from client components ─────────────────────────────────
 *
 * `usePhoneNumber` is a hook and behaves like one. Server components cannot use
 * it. For server components, use `components/TrackedPhoneLink`, which renders
 * the number internally so the swap can reach it.
 */

import { useSyncExternalStore } from 'react';
import { PHONE_DISPLAY, PHONE_TEL } from '@/lib/contact';

export interface PhoneNumber {
  /** Display form, e.g. `01270 897 606`. */
  display: string;
  /** Dial form, e.g. `tel:01270897606`. */
  tel: string;
}

/** The real number. Always what the server renders, and the client's default. */
const REAL_PHONE: PhoneNumber = Object.freeze({
  display: PHONE_DISPLAY,
  tel: PHONE_TEL,
});

/**
 * The current number. Reassigned only in `setTrackedPhone`, and only to a NEW
 * object when something actually changed — `useSyncExternalStore` compares
 * snapshots by identity, so returning a fresh object from `getSnapshot` on
 * every call would re-render forever.
 */
let current: PhoneNumber = REAL_PHONE;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PhoneNumber {
  return current;
}

function getServerSnapshot(): PhoneNumber {
  return REAL_PHONE;
}

/**
 * Reduce any phone format to a comparable national number.
 *
 * `+441270897606`, `01270897606` and `tel:01270897606` are the same line and
 * must compare equal. Without the country-code collapse, Google handing back
 * the real number in its E.164 form would look like a *change* and quietly
 * rewrite every href on the page to `tel:+441270897606` — valid dialling, but a
 * pointless rewrite of ~36 call sites that also makes the URL inconsistent with
 * the display text.
 */
function nationalDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits.startsWith('44')) return digits;
  // `+44 (0) 1270 897606` is a real way to write a UK number, and stripping the
  // 44 leaves the trunk `0` already in place. Prepending unconditionally would
  // yield `001270897606` — a string that matches nothing and compares unequal
  // to the real number, so the guard below would let a no-op swap through.
  const withoutCountryCode = digits.slice(2);
  return withoutCountryCode.startsWith('0') ? withoutCountryCode : `0${withoutCountryCode}`;
}

/**
 * Turn whatever Google hands back into a `tel:` href that actually dials.
 *
 * Google's `phone_conversion_callback` documentation describes the second
 * argument as the "plain format" (`18001234567`) while its own code sample
 * shows the E.164 form (`+16505555555`). Interpolating it blindly therefore
 * risks `tel:44770897606`, which is not a valid dial string, on precisely the
 * paid traffic this feature exists to measure — a break that stays invisible
 * until someone reads a phone bill.
 *
 * So: normalise to a leading `+`, inferring the UK country code for a national
 * format. This business is UK-only and so is every forwarding number Google
 * issues for it, so that inference is safe here.
 */
export function toTelHref(dial: string): string {
  const digits = (dial || '').replace(/\D/g, '');
  if (!digits) return '';
  if (dial.trim().startsWith('+')) return `tel:+${digits}`;
  if (digits.startsWith('44')) return `tel:+${digits}`;
  if (digits.startsWith('0')) return `tel:+44${digits.slice(1)}`;
  return `tel:+${digits}`;
}

/**
 * Point every phone render at a different number.
 *
 * Called from the Google Ads `phone_conversion_callback`.
 *
 * It refuses to do anything when the incoming number IS the real number, and
 * that guard is load-bearing rather than an optimisation. Google documents the
 * callback only for ad clickers; what it does on an organic or direct visit is
 * NOT documented. All three plausible behaviours — callback fires with a
 * forwarding number, fires with the real number, or never fires at all — must
 * land on the correct rendered number, and this guard is what makes that true
 * whichever one it turns out to be. Do not delete it on the assumption that
 * non-ad visits behave a particular way.
 *
 * MUST be called from an effect, never during render — see the header.
 */
export function setTrackedPhone(display: string, tel: string): void {
  const nextDisplay = display.trim();
  const nextTel = tel.trim();
  if (!nextDisplay || !nextTel) return;

  // Same line as the real number → nothing to swap.
  if (nationalDigits(nextTel) === nationalDigits(REAL_PHONE.tel)) return;

  if (current.display === nextDisplay && current.tel === nextTel) return;

  current = { display: nextDisplay, tel: nextTel };
  listeners.forEach((listener) => listener());
}

/** Put the real number back. Exported for tests; nothing in the app calls it. */
export function resetTrackedPhone(): void {
  if (current === REAL_PHONE) return;
  current = REAL_PHONE;
  listeners.forEach((listener) => listener());
}

/** The real number, without subscribing. Safe to call anywhere. */
export function getRealPhone(): PhoneNumber {
  return REAL_PHONE;
}

/**
 * The number to render. Re-renders the calling component when the swap lands,
 * which is what turns a callback into an on-page number change.
 */
export function usePhoneNumber(): PhoneNumber {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
