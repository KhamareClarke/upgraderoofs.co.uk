'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SiteLeadForm } from '@/components/SiteLeadForm';

/**
 * Routes that deliberately opt out of the site chrome, and routes that opt out
 * of the site-wide lead form. Two different lists on purpose — they only happen
 * to overlap on /special-offer today.
 *
 * `/special-offer` is a paid-traffic landing page with a single job: no header,
 * no footer, no navigation, nothing to click except the form it already carries.
 *
 * `/thank-you` is what a visitor sees seconds after submitting a lead. It is
 * the one place the site-wide form is actively wrong rather than merely
 * redundant, so it renders chrome but not the form.
 */
const CHROMELESS_PATHS = ['/special-offer'];
const NO_LEAD_FORM_PATHS = ['/special-offer', '/thank-you'];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChromeless = CHROMELESS_PATHS.includes(pathname);
  const showLeadForm = !NO_LEAD_FORM_PATHS.includes(pathname);

  return (
    <>
      {!isChromeless && <Header />}
      {/* The lead form lives INSIDE <main>, after the page's own content: it is
          page content, and this keeps one <main> per document rather than
          putting a second landmark around it. */}
      <main>
        {children}
        {showLeadForm && <SiteLeadForm />}
      </main>
      {!isChromeless && <Footer />}
    </>
  );
}
