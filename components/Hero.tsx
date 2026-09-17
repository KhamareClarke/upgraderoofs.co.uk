'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { QuoteForm } from '@/components/QuoteForm';
import { HeroKicker } from '@/components/HeroKicker';
import { CtaSubMessage } from '@/components/CtaSubMessage';

export function Hero() {
  return (
    <section className="relative min-h-[70vh] lg:min-h-[80vh] flex items-center justify-center overflow-hidden pt-16 pb-20 bg-brand-navy" style={{ contain: 'layout style paint' }}>
      <div className="container-custom relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* `light` so the label is white like the H1 under it. The two offer
              pages (/special-offer, /offer-sandbach) still carry the longer
              "Est. Sandbach, Cheshire" kicker in orange — that is deliberate,
              not an oversight. */}
          <HeroKicker align="center" light className="mb-6 fade-in-up">Cheshire</HeroKicker>

          {/* STATIC H1 - CRITICAL FOR SEO */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-5 text-balance leading-[1.1] tracking-tight px-4 sm:px-0 drop-shadow-2xl">
            Get Your{' '}
            <span className="text-brand-orange">Free Roof Inspection</span>
            <br />
            in Cheshire
          </h1>

          {/* High-urgency subheadline */}
          <p className="text-lg sm:text-xl md:text-2xl font-semibold text-brand-orange mb-10 px-4 sm:px-0 drop-shadow-lg tracking-wide leading-snug">
            We call you back within 10 minutes
            <br />
            <span className="text-white">guaranteed</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto px-4 sm:px-0">
            <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
              <QuoteForm trigger={
                <Button
                  size="lg"
                  className="group relative bg-brand-orange hover:bg-brand-navy-light text-white font-semibold px-8 sm:px-9 md:px-10 text-sm sm:text-base tracking-wide h-12 sm:h-14 md:h-16 rounded-lg shadow-lg shadow-black/20 ring-1 ring-white/10 transition-colors duration-300 w-full sm:w-auto inline-flex items-center gap-2.5"
                >
                  Get Your Free Quote
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              } />
              <CtaSubMessage dark />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
