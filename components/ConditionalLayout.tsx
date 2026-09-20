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

/**
 * The private dashboard opts out by PREFIX, not by exact path.
 *
 * Its URL is `/dashboard/<slug>`, and the slug is a secret held in an env var —
 * so there is no literal to match, and hardcoding one here would both be wrong
 * and put the secret in source. The dashboard is an installed app that owns the
 * whole screen: a site header, a footer and a lead-capture form on it would each
 * be actively wrong, and the form in particular would put a customer-facing
 * enquiry box inside an internal tool.
 */
function isDashboard(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChromeless = isDashboard(pathname) || CHROMELESS_PATHS.includes(pathname);
  const showLeadForm = !isChromeless && !NO_LEAD_FORM_PATHS.includes(pathname);

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
