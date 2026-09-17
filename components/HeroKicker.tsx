import type { ReactNode } from 'react';

interface HeroKickerProps {
  /** The kicker label text shown between the accent lines. */
  children: ReactNode;
  /** Optional align control. Defaults to center on dark heroes, left on light. */
  align?: 'left' | 'center';
  /** Use a light (white) label instead of brand-orange — for dark navy heroes. */
  light?: boolean;
  /** Extra classes merged onto the container (e.g. mb-6, mb-8). */
  className?: string;
}

/**
 * Accent-line-flanked kicker badge used above page/section titles.
 *
 * The homepage hero was the pattern this was extracted from; its own kicker now
 * reads just "Cheshire" in white. The longer "Est. Sandbach, Cheshire" label
 * still appears on the two offer pages, which pass it as children in orange.
 */
export function HeroKicker({ children, align = 'left', light = false, className = '' }: HeroKickerProps) {
  return (
    <div
      className={`inline-flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''} ${className}`}
    >
      <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
      <span
        className={`text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] ${
          light ? 'text-white' : 'text-brand-orange'
        }`}
      >
        {children}
      </span>
      <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
    </div>
  );
}
