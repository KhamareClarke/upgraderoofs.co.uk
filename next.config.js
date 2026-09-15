/**
 * Build memory note: the production build can exceed V8's default ~2 GB heap and
 * throw "JavaScript heap out of memory". If you hit this, rebuild with
 *   (POSIX)  NODE_OPTIONS=--max-old-space-size=4096 npm run build
 *   (Win PS) $env:NODE_OPTIONS="--max-old-space-size=4096"; npm run build
 * The `build` script itself stays plain `next build` so it works cross-platform.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
  },
  compiler: {
    // Keep warn/error in production; drop only the chatty levels.
    //
    // This was `removeConsole: true`, which strips EVERY console call from the
    // production bundle — including console.error. Verified against a real
    // build: the string "[spam]" appeared 0 times in .next/server, as did the
    // "[lead] GHL upsert failed — lead NOT in CRM" error.
    //
    // That is why a spam-filter bug silently discarded every lead carrying an
    // email address for 19 days. The failure paths were correct and "logged",
    // but the logging had been compiled out of production, so there was no
    // signal to find — not a signal nobody looked at. A quiet week and a dead
    // pipeline were genuinely indistinguishable.
    //
    // warn/error are low-volume by construction (they fire on failure, not on
    // success), so keeping them costs nothing and makes Vercel logs, log drains
    // and the `[lead-dropped]` prefix usable as an alerting source again.
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  swcMinify: true,
  reactStrictMode: true,
  async redirects() {
    // GSC 404 fixes — legacy URLs 301 to their canonical destinations.
    // Next.js first 308-normalizes a trailing slash (/home/ → /home), so each
    // rule must match BOTH the slash and non-slash source to catch every variant.
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/home/', destination: '/', permanent: true },
      { source: '/thank-you-contact-us', destination: '/', permanent: true },
      { source: '/thank-you-contact-us/', destination: '/', permanent: true },
      { source: '/flat-roofs', destination: '/services/flat-roofing', permanent: true },
      { source: '/flat-roofs/', destination: '/services/flat-roofing', permanent: true },
      // GSC 404 fixes — legacy plural/top-level service URLs redirect to /services/*
      { source: '/gutters-fascias', destination: '/services/gutters-fascias', permanent: true },
      { source: '/gutters-fascias/', destination: '/services/gutters-fascias', permanent: true },
      { source: '/tile-slate-roofs', destination: '/services/tile-slate-roofing', permanent: true },
      { source: '/tile-slate-roofs/', destination: '/services/tile-slate-roofing', permanent: true },
      { source: '/chimney-repairs', destination: '/services/chimney-repairs', permanent: true },
      { source: '/chimney-repairs/', destination: '/services/chimney-repairs', permanent: true },
      { source: '/skylights', destination: '/services/skylights-roof-windows', permanent: true },
      { source: '/skylights/', destination: '/services/skylights-roof-windows', permanent: true },
      { source: '/cladding-installations', destination: '/services/cladding', permanent: true },
      { source: '/cladding-installations/', destination: '/services/cladding', permanent: true },
      // GSC 404 fixes — legacy town-service URLs redirect to their local-commercial parent
      { source: '/roof-replacements-sandbach', destination: '/roofers-sandbach', permanent: true },
      { source: '/roof-replacements-sandbach/', destination: '/roofers-sandbach', permanent: true },
      { source: '/roof-repairs-sandbach', destination: '/roofers-sandbach', permanent: true },
      { source: '/roof-repairs-sandbach/', destination: '/roofers-sandbach', permanent: true },
      { source: '/roof-repairs-crewe', destination: '/roofers-crewe', permanent: true },
      { source: '/roof-repairs-crewe/', destination: '/roofers-crewe', permanent: true },
      { source: '/roof-repairs-congleton', destination: '/roofers-congleton', permanent: true },
      { source: '/roof-repairs-congleton/', destination: '/roofers-congleton', permanent: true },
    ];
  },
};

module.exports = nextConfig;
