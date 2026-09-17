import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrickWall, Layers, Flame, CloudRain, Sun, Fence, ArrowRight } from 'lucide-react';
import { QuoteForm } from '@/components/QuoteForm';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import Image from 'next/image';

export function Services({
  cardsOpenForm = false,
  dark = false,
}: {
  cardsOpenForm?: boolean;
  dark?: boolean;
}) {
  const services = [
    {
      title: 'Tile & Slate Roofs',
      icon: BrickWall,
      image: '/images/6.jpeg',
      alt: 'Professional tile and slate roof installation in Cheshire',
      href: '/services/tile-slate-roofing',
    },
    {
      title: 'Flat Roofs',
      icon: Layers,
      image: '/images/3.jpeg',
      alt: 'EPDM and GRP flat roof installation Cheshire',
      href: '/services/flat-roofing',
    },
    {
      title: 'Chimney Repairs',
      icon: Flame,
      image: '/images/1.jpeg',
      alt: 'Chimney repair and repointing service Cheshire',
      href: '/services/chimney-repairs',
    },
    {
      title: 'Gutters & Fascias',
      icon: CloudRain,
      image: '/images/2.jpeg',
      alt: 'Gutter and fascia installation Cheshire',
      href: '/services/gutters-fascias',
    },
    {
      title: 'Skylights & Roof Windows',
      icon: Sun,
      image: '/images/10.jpeg',
      alt: 'Velux skylight and roof window installation Cheshire',
      href: '/services/skylights-roof-windows',
    },
    {
      title: 'Cladding Installations',
      icon: Fence,
      image: '/images/4.jpeg',
      alt: 'External wall cladding installation Cheshire',
      href: '/services/cladding',
    },
  ];

  return (
    <section
      id="services"
      className={`section-padding relative overflow-hidden ${dark ? 'bg-brand-navy' : 'bg-white'}`}
    >
      <div className="container-custom relative">
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <span className={`h-px flex-1 sm:flex-none sm:w-16 ${dark ? 'bg-white/30' : 'bg-gray-300'}`} aria-hidden="true" />
            <span className="text-brand-orange font-semibold text-sm uppercase tracking-[0.2em]">Our Roofing Services</span>
            <span className={`h-px flex-1 sm:hidden ${dark ? 'bg-white/30' : 'bg-gray-300'}`} aria-hidden="true" />
          </div>
          <div className="sm:grid sm:grid-cols-2 sm:gap-8 sm:items-end">
            <h2
              className={`text-3xl sm:text-4xl md:text-5xl font-bold leading-tight ${
                dark ? 'text-white' : 'text-brand-navy'
              }`}
            >
              One Local Team for <span className="text-brand-orange">Every Roofing Job</span>
            </h2>
            <p
              className={`text-lg leading-relaxed mt-4 sm:mt-0 sm:border-l-4 sm:border-brand-orange sm:pl-6 ${
                dark ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              From a slipped tile to a full roof replacement, one local team handles the whole job. Every one carries a written guarantee.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            const cardClass = `group relative overflow-hidden bg-white border transition-colors duration-300 ${
              dark ? 'border-transparent hover:border-brand-orange' : 'border-gray-300 hover:border-brand-navy'
            }`;

            const cardBody = (
              <>
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-brand-orange to-brand-orange/0" aria-hidden="true" />

                <div className="relative overflow-hidden h-48">
                  <Image
                    src={service.image}
                    alt={service.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    loading="lazy"
                    quality={60}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/50 to-transparent" />

                  <div className="absolute top-4 left-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-orange flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="hidden sm:block font-mono text-xs tracking-widest text-white/70">
                      {'0' + (index + 1)}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-bold text-white text-2xl">{service.title}</h3>
                  </div>
                </div>
              </>
            );

            // On the homepage the cards link through to the matching service
            // page. Where `cardsOpenForm` is set they open the same quote modal
            // as the button below, so no click in this section is a dead one.
            return cardsOpenForm ? (
              <QuoteForm
                key={index}
                trigger={
                  <button type="button" className={`${cardClass} w-full text-left`}>
                    {cardBody}
                  </button>
                }
              />
            ) : (
              <Link key={index} href={service.href} className={`${cardClass} block`}>
                {cardBody}
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <QuoteForm trigger={
            <Button
              size="lg"
              className={`group bg-brand-orange text-white font-semibold px-8 py-3 h-12 rounded-lg inline-flex items-center gap-2.5 ${
                // On the navy section a navy hover would dissolve the button into
                // the background, so it inverts to white instead.
                dark ? 'hover:bg-white hover:text-brand-navy' : 'hover:bg-brand-navy'
              }`}
            >
              Get Your Free Quote
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          } />
          <CtaSubMessage dark={dark} className="mt-3" />
        </div>
      </div>
    </section>
  );
}
