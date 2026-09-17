import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/BreadcrumbSchema';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { ContactForm } from '@/components/ContactForm';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { TrackedEmailLink } from '@/components/TrackedEmailLink';
import { SectionHeader } from '@/components/SectionHeader';
import { HeroKicker } from '@/components/HeroKicker';
import { CtaSubMessage } from '@/components/CtaSubMessage';

export const metadata: Metadata = {
  title: 'Contact Us | Free Roofing Quote',
  description: 'Contact Upgrade Roofs for free quotes. Call 01270 897606. Serving Sandbach, Crewe, Middlewich, Congleton and all Cheshire. Fast response guaranteed.',
  keywords: 'contact roofer Cheshire, roofing quote Cheshire, roofing enquiry, free roof quote, Cheshire roofing contact, emergency roofer contact',
  openGraph: {
    title: 'Contact Upgrade Roofs | Free Quote Cheshire',
    description: 'Get a free roofing quote. Call 01270 897606. Fast response guaranteed.',
    url: 'https://www.upgraderoofs.co.uk/contact',
    siteName: 'Upgrade Roofs',
    images: [
      {
        url: 'https://www.upgraderoofs.co.uk/images/6.jpeg',
        width: 1200,
        height: 630,
        alt: 'Contact Upgrade Roofs · Free Quotes',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Upgrade Roofs | 01270 897606',
    description: 'Free roofing quotes. Fast response guaranteed.',
    images: ['https://www.upgraderoofs.co.uk/images/6.jpeg'],
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/contact',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactPage() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://www.upgraderoofs.co.uk' },
        { name: 'Contact', url: 'https://www.upgraderoofs.co.uk/contact' },
      ]} />
      <div className="min-h-screen bg-white">
      <section className="relative h-[300px] sm:h-[350px] md:h-[400px] flex items-center justify-center overflow-hidden px-4">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-navy/70" />
        </div>

        <div className="container-custom relative z-10 text-center">
          <HeroKicker light align="center" className="mb-3 sm:mb-4">Get In Touch</HeroKicker>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 px-2">Contact Us</h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto px-2">
            We're here to help with all your roofing needs
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
            <div className="order-2 lg:order-1">
              <SectionHeader
                align="left"
                kicker="Free &amp; No-Obligation"
                title="Get a Free Quote"
              />
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-6 sm:mb-8">
                Fill out the form below and we'll get back to you within 24 hours with a detailed quote for your roofing project. All quotes are completely free and come with no obligation.
              </p>

              <ContactForm />
            </div>

            <div className="space-y-6 sm:space-y-8 order-1 lg:order-2">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-brand-navy mb-4 sm:mb-6">Contact Information</h3>
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-brand-orange" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base text-brand-navy mb-1 sm:mb-2">Phone</h4>
                      <TrackedPhoneLink href="tel:01270897606" placement="contact_info_landline" className="text-sm sm:text-base text-gray-600 hover:text-brand-orange block break-all sm:break-normal">
                        01270 897 606
                      </TrackedPhoneLink>
                                          </div>
                  </div>

                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-brand-orange" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base text-brand-navy mb-1 sm:mb-2">Email</h4>
                      <TrackedEmailLink href="mailto:upgraderoofs@yahoo.com" placement="contact_page" className="text-sm sm:text-base text-gray-600 hover:text-brand-orange break-all sm:break-normal">
                        upgraderoofs@yahoo.com
                      </TrackedEmailLink>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-brand-orange" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base text-brand-navy mb-1 sm:mb-2">Address</h4>
                      <p className="text-sm sm:text-base text-gray-600">
                        20 Crewe Rd<br />
                        Sandbach, Cheshire<br />
                        CW11 4NE<br />
                        United Kingdom
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-brand-orange" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base text-brand-navy mb-1 sm:mb-2">Opening Hours</h4>
                      <div className="text-sm sm:text-base text-gray-600 space-y-1">
                        <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
                        <p>Saturday: 9:00 AM - 4:00 PM</p>
                        <p>Sunday: Closed</p>
                        <p className="text-brand-orange font-medium mt-2">24/7 Emergency Services Available</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-brand-grey p-4 sm:p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                <h4 className="font-semibold text-sm sm:text-base text-brand-navy mb-3 sm:mb-4">Areas We Serve</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-gray-600 text-xs sm:text-sm">
                  {[
                    'Sandbach',
                    'Crewe',
                    'Congleton',
                    'Nantwich',
                    'Alsager',
                    'Haslington',
                    'Middlewich',
                    'Holmes Chapel',
                  ].map((area, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-orange flex-shrink-0"></div>
                      <span className="break-words">{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <SectionHeader
              kicker="Why Choose Us"
              title="Why Choose Upgrade Roofs?"
            />
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-brand-grey p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                <h3 className="text-lg font-semibold text-brand-navy mb-3">25+ Years of Experience</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Our team brings over two decades of roofing expertise to every project. We've completed thousands of roofing jobs across Cheshire, from simple repairs to complete roof replacements. Our experience means we can handle any roofing challenge efficiently and professionally.
                </p>
              </div>
              <div className="bg-brand-grey p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                <h3 className="text-lg font-semibold text-brand-navy mb-3">Fully Insured & CORC Certified</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We carry £10 million public liability insurance for your complete peace of mind. As CORC (Confederation of Roofing Contractors) certified professionals, we adhere to the highest industry standards and best practices in all our roofing work.
                </p>
              </div>
              <div className="bg-brand-grey p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                <h3 className="text-lg font-semibold text-brand-navy mb-3">Free No-Obligation Quotes</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We provide detailed, transparent quotes at no cost to you. Our estimates include a full breakdown of materials, labour, and timescales. There's never any pressure to proceed - we believe in letting our quality work and fair pricing speak for themselves.
                </p>
              </div>
              <div className="bg-brand-grey p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                <h3 className="text-lg font-semibold text-brand-navy mb-3">Local Cheshire Roofers</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Based in Sandbach, we serve homeowners and businesses throughout Cheshire. Being local means faster response times, knowledge of local building regulations, and a reputation we're proud to maintain in our community.
                </p>
              </div>
            </div>
            
            <div className="bg-brand-navy/5 p-6 border border-gray-200 border-l-4 border-l-brand-navy mb-8">
              <h3 className="text-lg font-semibold text-brand-navy mb-3">Our Roofing Services</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Upgrade Roofs offers a comprehensive range of roofing services to meet all your needs. Whether you require emergency roof repairs, a complete roof replacement, or routine maintenance, our skilled team is ready to help.
              </p>
              <ul className="grid sm:grid-cols-2 gap-2 text-sm text-gray-600">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>Tile and slate roof repairs</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>Flat roof installations (EPDM, GRP)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>Chimney repairs and rebuilds</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>Guttering and fascia replacement</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>Velux skylight installation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>Roof cleaning and moss removal</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>Lead work and flashing</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>Emergency storm damage repairs</li>
              </ul>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-brand-navy mb-3">What Happens After You Contact Us?</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="p-4">
                  <div className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">1</div>
                  <h4 className="font-semibold text-brand-navy mb-2">Quick Response</h4>
                  <p className="text-gray-600">We'll respond to your enquiry within 24 hours, often much sooner. For emergencies, call us directly for immediate assistance.</p>
                </div>
                <div className="p-4">
                  <div className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">2</div>
                  <h4 className="font-semibold text-brand-navy mb-2">Free Survey</h4>
                  <p className="text-gray-600">We'll arrange a convenient time to inspect your roof, assess the work needed, and discuss your options with no obligation.</p>
                </div>
                <div className="p-4">
                  <div className="w-10 h-10 bg-brand-orange text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">3</div>
                  <h4 className="font-semibold text-brand-navy mb-2">Detailed Quote</h4>
                  <p className="text-gray-600">You'll receive a comprehensive written quote with clear pricing, materials specification, and estimated completion time.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-brand-grey">
        <div className="container-custom">
          <div className="bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white border-l-4 border-l-brand-orange p-6 sm:p-8 md:p-12 text-center">
            <SectionHeader
              dark
              kicker="24/7 Emergency"
              title="Emergency Roofing Services"
            />
            <p className="text-sm sm:text-base md:text-lg text-white/90 mb-4 sm:mb-6 max-w-2xl mx-auto px-2">
              Storm damage? Leak? We offer 24/7 emergency roofing services across Cheshire. Our emergency team can be with you within hours to secure your property and prevent further damage. Don't wait - water damage can quickly escalate and cause structural issues.
            </p>
            <TrackedPhoneLink href="tel:01270897606" placement="contact_emergency_cta" className="inline-block w-full sm:w-auto">
              <button className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-6 sm:px-8 md:px-10 h-12 sm:h-14 text-base sm:text-lg rounded-md transition-colors w-full sm:w-auto">
                <span className="hidden sm:inline">Call Now: </span>01270 897 606
              </button>
            </TrackedPhoneLink>
            <div className="mt-3"><CtaSubMessage dark /></div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
