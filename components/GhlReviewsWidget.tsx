'use client';

import Script from 'next/script';

const WIDGET_SRC =
  'https://reputationhub.site/reputation/widgets/review_widget/Lk9anvdNEEpmFiRndNJk?widgetId=69b5695b24ab18f7cd169219';
const WIDGET_SCRIPT = 'https://reputationhub.site/reputation/assets/review-widget.js';

/**
 * Live Google reviews widget for Upgrade Roofs.
 * Renders GHL's reputation iframe (real Google review snippet) and loads the
 * companion widget script React-safely.
 *
 * Sizing: the widget reports its own height to the parent via postMessage
 * ("lc.setHeight"), and review-widget.js writes that to `iframe.height`. Do NOT
 * give the iframe a CSS height (a Tailwind h-[...] class, or any inline style):
 * CSS beats the height attribute the script sets, so the widget gets clipped
 * with no way to grow. Height is passed as the plain HTML attribute below as a
 * pre-hydration fallback the script then over-writes.
 *
 * Width is load-bearing, not cosmetic. This is the CAROUSEL variant of GHL's
 * reputation widget: `carousel-container > carousel-track > carousel-slide`,
 * with `.carousel-cards { grid-template-columns: repeat(3, 1fr) }` and exactly
 * one breakpoint (768px, which drops it to a single card). It always shows 3
 * cards per slide and card width is iframe-width / 3, so a wide parent yields
 * absurdly wide cards rather than more of them · full-bleed on a 1920px screen
 * gives ~630px cards. The parent must keep this frame near content width.
 *
 * No border: the frame is intentionally unframed, so do not re-add one (an
 * earlier `border-l-4 border-l-brand-navy` here read as a stripe down the page).
 *
 * The number of cards per slide is set in the reputationhub dashboard, not here.
 */
export function GhlReviewsWidget() {
  return (
    <div className="w-full">
      <iframe
        className="lc_reviews_widget block w-full"
        height={620}
        src={WIDGET_SRC}
        frameBorder="0"
        scrolling="no"
        loading="lazy"
        title="Upgrade Roofs customer reviews"
      />
      <Script src={WIDGET_SCRIPT} strategy="afterInteractive" />
    </div>
  );
}
