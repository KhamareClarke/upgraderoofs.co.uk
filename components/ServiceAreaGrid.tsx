'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import type { ServiceAreaLink } from '@/lib/service-areas';

interface ServiceAreaGridProps {
  /** Town links in display order — the first `visibleCount` render up front. */
  areas: ServiceAreaLink[];
  /** Optional trailing hub link. Never counted in the toggle label. */
  hubLink?: ServiceAreaLink;
  /** How many tiles show before the expander. */
  visibleCount?: number;
  className?: string;
}

/**
 * The "Where We Work" tile grid with its show-all expander.
 *
 * Every tile is always rendered into the HTML — the collapsed ones are hidden
 * with `display: none` rather than unmounted, so the links stay crawlable. This
 * is why the section is a client component while `ServiceAreaHub` around it is
 * not: the toggle needs state, but the surrounding section is server-rendered.
 */
export function ServiceAreaGrid({
  areas,
  hubLink,
  visibleCount = 6,
  className = '',
}: ServiceAreaGridProps) {
  const [expanded, setExpanded] = useState(false);
  const gridId = useId();

  const hiddenCount = areas.length - visibleCount;
  const tiles = hubLink ? [...areas, hubLink] : areas;

  return (
    <div className={className}>
      {hiddenCount > 0 && (
        <div className="text-center mb-6">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={gridId}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-orange hover:text-brand-navy transition-colors"
          >
            {expanded ? 'Show fewer areas' : `Show all ${areas.length} areas`}
            {expanded ? (
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      )}

      <div id={gridId} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tiles.map((area, i) => (
          <Link
            key={area.href}
            href={area.href}
            className={`group flex items-center gap-2 p-4 bg-white border border-gray-300 hover:border-brand-navy transition-colors ${
              i >= visibleCount && !expanded ? 'hidden' : ''
            }`}
          >
            <MapPin className="w-4 h-4 text-brand-orange flex-shrink-0" />
            <span className="text-sm font-semibold text-brand-navy group-hover:text-brand-orange transition-colors">
              {area.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
