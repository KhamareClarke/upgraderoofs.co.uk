import { Button } from '@/components/ui/button';
import { Check, ArrowRight } from 'lucide-react';
import { QuoteForm } from '@/components/QuoteForm';
import { CtaSubMessage } from '@/components/CtaSubMessage';

export function WhyChooseUs() {
  const benefits = [
    'Up-front pricing, no hidden costs',
    '25+ years of roofing experience',
    'One dedicated roofer, one point of contact',
  ];

  return (
    <section id="about" className="section-padding bg-brand-navy relative overflow-hidden">
      <div className="container-custom">
        {/* Centred on mobile, left from sm up — the same alignment the h2 and p
            below declare for themselves. Without it on the parent, the kicker's
            inline-flex box shrinks to its content and sits left of them. */}
        <div className="mb-12 text-center sm:text-left">
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
            <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Why Cheshire Homeowners Choose Us</span>
            <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
          </div>
          <div className="sm:grid sm:grid-cols-2 sm:gap-8 sm:items-end">
            <h2 className="text-center sm:text-left text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
              Quality Work from a <span className="text-brand-orange">Team You Can Trust</span>
            </h2>
            <p className="text-center sm:text-left text-lg text-gray-300 leading-relaxed mt-4 sm:mt-0 sm:border-l-4 sm:border-brand-orange sm:pl-6">
              We price every job up front and back it with a written guarantee, so you know the cost and the cover before any work starts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center">
          <div className="relative overflow-hidden border border-brand-navy/40 border-l-4 border-l-brand-orange bg-gray-900">
            <video
              className="w-full h-full object-cover aspect-video"
              controls
              preload="metadata"
              poster="/images/7.jpeg"
            >
              <source src="/upgraderoofs.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <div>
            <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-10">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start justify-center sm:justify-start space-x-3 sm:space-x-4">
                  <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 bg-brand-orange rounded-full flex items-center justify-center mt-1">
                    <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" strokeWidth={2.5} />
                  </div>
                  <p className="text-xl sm:text-2xl text-white/90">{benefit}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              <QuoteForm trigger={
                <Button
                  size="lg"
                  className="group relative bg-brand-orange hover:bg-brand-navy-light text-white font-semibold px-8 sm:px-10 text-sm sm:text-base tracking-wide h-12 sm:h-14 rounded-lg shadow-lg shadow-black/20 ring-1 ring-white/10 transition-colors duration-300 w-full sm:w-auto inline-flex items-center gap-2.5"
                >
                  Book Your Free Quote
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
