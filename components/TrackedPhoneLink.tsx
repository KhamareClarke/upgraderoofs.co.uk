'use client';

/**
 * The two ways a phone number is rendered on this site.
 *
 * ── Why the API looks like this ─────────────────────────────────────────────
 *
 * Most of the ~20 call sites are SERVER components (`app/contact/page.tsx`,
 * `app/emergency-roofing/page.tsx`, `components/Footer.tsx`, the five
 * `app/services/*` pages, and more). A server component cannot call a hook, and
 * cannot pass a function across the client boundary either.
 *
 * So neither a render-prop (`children` as a function) nor a `usePhoneNumber()`
 * -first API is possible at the majority of sites. Instead the LIVE NUMBER IS
 * RENDERED IN HERE, and call sites pass only serializable values — strings and
 * elements.
 *
 * The consequence for anyone editing a call site: the visible number must never
 * appear in `children`. Text in `children` is static and the swap cannot reach
 * it, which produces a link that looks migrated, still dials the real number,
 * and is invisible to every check that greps for `tel:`. A number in children
 * goes in `prefix` instead.
 *
 * ── The three shapes ────────────────────────────────────────────────────────
 *
 *   Number only      <TrackedPhoneLink placement="contact_info_landline" />
 *   Label + number   <TrackedPhoneLink placement="footer" prefix="Call Us: " />
 *   Label, no number <TrackedPhoneLink placement="cta_banner_book">Call Now</TrackedPhoneLink>
 *
 * Plus `icon` (a serializable element) for a leading glyph or a responsive span.
 */

import { forwardRef } from 'react';
import { trackPhoneClick } from '@/lib/tracking';
import { usePhoneNumber } from '@/lib/phone-number';

interface TrackedPhoneLinkProps {
  /** Where on the site this link lives. Feeds the tap conversion. Required. */
  placement: string;
  /**
   * Escape hatch for a link that must dial somewhere other than the business
   * line. Unset — which is every current call site — means the live number, so
   * Google's swap reaches it.
   */
  href?: string;
  /** Rendered immediately before the number, e.g. `"Call: "`. */
  prefix?: React.ReactNode;
  /**
   * A leading element, e.g. `<Phone className="w-5 h-5 mr-2" />`. Also the place
   * to put a responsive span like `<span className="hidden sm:inline">Call Now: </span>`,
   * since it renders before `prefix`.
   */
  icon?: React.ReactNode;
  /** A label containing NO number, e.g. `"Call Now for a Free Quote"`. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Forwarding the ref is not decoration: this link is used as the child of
 * `<Button asChild>` (components/CTABanner.tsx, components/FloatingCallButton.tsx),
 * and Radix's Slot clones its child with a ref attached. A function component
 * without `forwardRef` cannot accept one — React logs a warning and the ref is
 * silently dropped.
 */
export const TrackedPhoneLink = forwardRef<HTMLAnchorElement, TrackedPhoneLinkProps>(
  function TrackedPhoneLink({ placement, href, prefix, icon, children, className }, ref) {
    const phone = usePhoneNumber();
    const hasChildren = children !== undefined && children !== null;

    return (
      <a
        ref={ref}
        href={href ?? phone.tel}
        className={className}
        onClick={() => trackPhoneClick(placement)}
      >
        {icon}
        {hasChildren ? children : <>{prefix}{phone.display}</>}
      </a>
    );
  },
);

/**
 * The live number as bare text — no link, no tap tracking.
 *
 * For the places the number appears outside a call-to-action: the citation
 * badge row, the postcode-coverage panel, footer body copy. Those still have to
 * swap: a page showing a forwarding number in the header and the real number in
 * the footer is worse than either choice on its own, because the visitor cannot
 * tell which one to dial.
 *
 * This is a component rather than a hook so server components can use it —
 * which is what every one of those sites is.
 */
export function PhoneNumberText() {
  const phone = usePhoneNumber();
  return <>{phone.display}</>;
}
