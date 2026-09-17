import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { SERVICE_AREAS_HUB, orderAreaLinks } from '@/lib/service-areas';

interface ServiceAreaLinksProps {
  serviceName: string;
}

export function ServiceAreaLinks({ serviceName }: ServiceAreaLinksProps) {
  // Sandbach leads here: this block sits on the service pages and the business
  // is based there. The list used to be a second hardcoded copy of the towns,
  // so a new town page could ship and silently be missing from all nine
  // service pages that render this — hence `lib/service-areas.ts`.
  const areas = orderAreaLinks({ lead: '/roofers-sandbach' });

  return (
    <section className="py-10 bg-gray-50 border-t border-gray-200">
      <div className="container-custom">
        <h3 className="text-xl font-bold text-brand-navy mb-4 text-center">
          {serviceName} Across Cheshire
        </h3>
        <p className="text-gray-600 text-sm text-center mb-6 max-w-xl mx-auto">
          We provide {serviceName.toLowerCase()} services across south Cheshire. Based in Sandbach, we cover:
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {areas.map((area) => (
            <Link key={area.href} href={area.href} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-brand-orange/50 hover:shadow-sm transition-all text-sm font-medium text-brand-navy hover:text-brand-orange">
              <MapPin className="w-3.5 h-3.5 text-brand-orange" />
              {area.name}
            </Link>
          ))}
          <Link href={SERVICE_AREAS_HUB.href} className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-orange/10 rounded-lg border border-brand-orange/20 hover:bg-brand-orange/20 transition-all text-sm font-medium text-brand-orange">
            All areas →
          </Link>
        </div>
      </div>
    </section>
  );
}
