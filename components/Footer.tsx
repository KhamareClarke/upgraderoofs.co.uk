import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Send, PhoneCall, CalendarClock, MapPin, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { TrackedEmailLink } from '@/components/TrackedEmailLink';
import { SERVICE_AREAS_HUB, orderAreaLinks } from '@/lib/service-areas';

export function Footer() {
  // Sandbach leads: the footer is the one place every page shares, and the
  // business is based there. Sourced from lib/service-areas.ts so a new town
  // page cannot ship and be missing from the footer of the whole site.
  const areas = orderAreaLinks({ lead: '/roofers-sandbach' });
  const areaLinkClass = 'text-white/70 hover:text-brand-orange transition-colors duration-300';
  const quickLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Services', href: '/services' },
    { name: 'Service Areas', href: '/service-areas' },
    { name: 'Gallery', href: '/gallery' },
    { name: 'Blog', href: '/blog' },
    { name: 'Reviews', href: '/reviews' },
    { name: 'Contact', href: '/contact' },
  ];

  const serviceLinks = [
    { name: 'Tile & Slate Roofs', href: '/services/tile-slate-roofing' },
    { name: 'Flat Roofs', href: '/services/flat-roofing' },
    { name: 'Chimney Repairs', href: '/services/chimney-repairs' },
    { name: 'Gutters & Fascias', href: '/services/gutters-fascias' },
    { name: 'Skylights & Windows', href: '/services/skylights-roof-windows' },
    { name: 'Cladding', href: '/services/cladding' },
  ];

  const legalLinks = [
    { name: 'Sitemap', href: '/sitemap-page' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms & Conditions', href: '/terms' },
  ];

  return (
    <footer id="contact" className="bg-brand-navy text-white">
      <div className="container-custom py-12 md:py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-14 lg:gap-16">
          <div>
            <Link href="/" className="flex items-center mb-6">
              <Image
                src="/images/upgrade_logo.png"
                alt="Upgrade Roofs"
                width={96}
                height={96}
                className="w-24 h-24 object-contain"
              />
            </Link>
            <p className="text-white/70 leading-relaxed tracking-wide text-sm sm:text-base">
              Upgrade Roofs offers expert roof repair, replacement, and installation across
              Cheshire and the North West. Accredited, insured, and trusted by local homeowners.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-5 tracking-wide">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-brand-orange transition-colors duration-300 text-sm tracking-wide"
                    scroll={true}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-5 tracking-wide">Our Services</h3>
            <ul className="space-y-3">
              {serviceLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-brand-orange transition-colors duration-300 text-sm tracking-wide"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-5 tracking-wide">Contact Us</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-brand-orange flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white/70 text-sm tracking-wide">20 Crewe Road</p>
                  <p className="text-white/70 text-sm tracking-wide">Sandbach, Cheshire</p>
                  <p className="text-white/70 text-sm tracking-wide">CW11 4NE</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <PhoneCall className="w-5 h-5 text-brand-orange flex-shrink-0" />
                <div className="space-y-1.5">
                  <TrackedPhoneLink
                    href="tel:01270897606"
                    placement="footer_landline"
                    className="block text-white/70 hover:text-brand-orange transition-colors duration-300 text-sm tracking-wide"
                  >
                    01270 897 606
                  </TrackedPhoneLink>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Send className="w-5 h-5 text-brand-orange flex-shrink-0" />
                <TrackedEmailLink
                  href="mailto:upgraderoofs@yahoo.com"
                  placement="footer"
                  className="text-white/70 hover:text-brand-orange transition-colors duration-300 text-sm tracking-wide"
                >
                  upgraderoofs@yahoo.com
                </TrackedEmailLink>
              </div>

              <div className="flex items-start space-x-3">
                <CalendarClock className="w-5 h-5 text-brand-orange flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white/70 text-sm tracking-wide">Monday - Friday: 8am - 6pm</p>
                  <p className="text-white/70 text-sm tracking-wide">Saturday: 9am - 4pm</p>
                  <p className="text-white/70 text-sm tracking-wide">Sunday: Closed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Service Areas */}
        <div className="mt-10 pt-8 border-t border-white/10">
          <h3 className="text-lg font-semibold mb-4 tracking-wide">Areas We Serve</h3>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm tracking-wide leading-relaxed">
            {areas.map((area) => (
              <Fragment key={area.href}>
                <Link href={area.href} className={areaLinkClass}>
                  Roofers {area.name}
                </Link>
                <span className="text-white/70">·</span>
              </Fragment>
            ))}
            <Link href={SERVICE_AREAS_HUB.href} className={areaLinkClass}>
              {SERVICE_AREAS_HUB.name}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-custom py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <p className="text-white/60 text-sm tracking-wide">
                © {new Date().getFullYear()} Upgrade Roofs. All rights reserved.
              </p>
              <p className="text-white/50 text-xs tracking-wide">
                Upgrade Roofs is operated by UPGRADE ROOFS LTD
              </p>
              <div className="flex items-center gap-5 text-sm">
                {legalLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-white/60 hover:text-brand-orange transition-colors duration-300 tracking-wide"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-5 flex-wrap justify-center md:justify-start">
              <span className="text-white/60 text-sm tracking-wide">We accept:</span>
              <div className="flex items-center gap-4">
                <img 
                  src="/images/visa.svg" 
                  alt="Pay with VISA credit or debit card" 
                  className="h-6 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
                />
                <img 
                  src="/images/mastercard.svg" 
                  alt="Pay with Mastercard credit or debit card" 
                  className="h-6 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
                />
                <img 
                  src="/images/paypal.svg" 
                  alt="Pay with PayPal" 
                  className="h-10 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-white/60 text-sm tracking-wide">Follow us:</span>
              <div className="flex items-center gap-3">
                <a 
                  href="https://www.facebook.com/people/Upgrade-Roofs/61564099403039/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow Upgrade Roofs on Facebook"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-orange transition-colors duration-300"
                >
                  <Facebook className="w-4 h-4 text-white" />
                </a>
                <a 
                  href="https://www.instagram.com/upgraderoofs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow Upgrade Roofs on Instagram"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-orange transition-colors duration-300"
                >
                  <Instagram className="w-4 h-4 text-white" />
                </a>
                <a 
                  href="https://www.x.com/upgraderoofs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow Upgrade Roofs on X (Twitter)"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-orange transition-colors duration-300"
                >
                  <Twitter className="w-4 h-4 text-white" />
                </a>
                <a 
                  href="https://www.youtube.com/@upgraderoofs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Watch Upgrade Roofs videos on YouTube"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-orange transition-colors duration-300"
                >
                  <Youtube className="w-4 h-4 text-white" />
                </a>
                <a 
                  href="https://www.pinterest.com/upgraderoofs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow Upgrade Roofs on Pinterest"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-orange transition-colors duration-300"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
