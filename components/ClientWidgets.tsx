'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const WhatsAppButton = dynamic(() => import('./WhatsAppButton').then(m => m.WhatsAppButton), { ssr: false });
const ScrollToTop = dynamic(() => import('./ScrollToTop').then(m => m.ScrollToTop), { ssr: false });
const MobileContactBar = dynamic(() => import('./MobileContactBar').then(m => m.MobileContactBar), { ssr: false });
const CookieConsent = dynamic(() => import('./CookieConsent').then(m => m.CookieConsent), { ssr: false });

export function ClientWidgets() {
  const pathname = usePathname();

  // The private dashboard is an app, not a page of the website: a WhatsApp
  // button, a sticky call bar and a cookie banner would all sit on top of the
  // figures on a phone screen, and the banner in particular would cover the
  // whole viewport on first open. The dashboard also sets no cookies, so there
  // is nothing for a consent banner to consent to.
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return null;

  return (
    <>
      <WhatsAppButton />
      <MobileContactBar />
      <ScrollToTop />
      <CookieConsent />
    </>
  );
}
