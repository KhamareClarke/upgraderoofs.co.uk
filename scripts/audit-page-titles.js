#!/usr/bin/env node
/**
 * Audit every prerendered page's <title>.
 *
 * Run AFTER a build:   npm run build && node scripts/audit-page-titles.js
 *
 * Why this exists — the root layout sets `title: { template: '%s | Upgrade Roofs' }`,
 * but the template does NOT reach every page, and both failure modes are silent:
 *
 *   1. A page whose metadata.title already contains "Upgrade Roofs" renders the
 *      brand twice. It is templated only if Next stashed the template for it.
 *   2. A page the template does not reach renders NO brand at all — and if its
 *      literal has no brand either, nothing in the source looks wrong.
 *
 * The rule, from next/dist/lib/metadata/resolve-metadata.js:
 *
 *     // If the layout is the same layer with page, skip the leaf layout and leaf page
 *     if (i < metadataItems.length - 2) {
 *       titleTemplates = { title: resolvedMetadata.title?.template || null, ... }
 *     }
 *
 * So the stashed template is dropped two ways:
 *   - The ROOT PAGE is its own segment, leaving only two metadata items, so the
 *     template is never stashed at all: app/page.tsx must spell out the brand.
 *   - ANY item before the last two that declares a plain-string title (which
 *     leaves `title.template` null) WIPES the template for everything beneath it.
 *     app/blog/layout.tsx did exactly this, un-branding all ten blog posts.
 *
 * Adding a `title` to an intermediate layout is therefore not a local change —
 * check this script after touching any layout.tsx.
 */
const fs = require('fs');
const path = require('path');

const BRAND = 'Upgrade Roofs';
const SERP_LIMIT = 60; // Google truncates around here; longer is a warning, not a failure
const ROOT = path.join(__dirname, '..', '.next', 'server', 'app');

// The built-in 404 uses Next's own title and has no app/not-found.tsx to hang
// metadata on, so it is exempt rather than a standing failure.
const EXEMPT = new Set(['/_not-found']);

if (!fs.existsSync(ROOT)) {
  console.error('No build found at ' + path.relative(process.cwd(), ROOT));
  console.error('Run `npm run build` first.');
  process.exit(2);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
}

const doubled = [];
const unbranded = [];
const missing = [];
const long = [];
let ok = 0;

for (const file of walk(ROOT)) {
  const route =
    '/' +
    path
      .relative(ROOT, file)
      .split(path.sep)
      .join('/')
      .replace(/\.html$/, '')
      .replace(/\/index$/, '')
      .replace(/^index$/, '');

  if (EXEMPT.has(route)) continue;

  const html = fs.readFileSync(file, 'utf8');
  const match = html.match(/<title>([\s\S]*?)<\/title>/);
  if (!match) {
    missing.push(route);
    continue;
  }

  const title = decode(match[1]);
  const count = title.split(BRAND).length - 1;

  if (count === 0) unbranded.push({ route, title });
  else if (count > 1) doubled.push({ route, title, count });
  else {
    ok++;
    if (title.length > SERP_LIMIT) long.push({ route, title, len: title.length });
  }
}

console.log('checked ' + (ok + doubled.length + unbranded.length + missing.length) + ' pages');
console.log('  ok            ' + ok);
console.log('  doubled brand ' + doubled.length);
console.log('  no brand      ' + unbranded.length);
console.log('  no <title>    ' + missing.length);
console.log('  over ' + SERP_LIMIT + ' chars  ' + long.length + '   (warning only)');

const section = (label, rows, fmt) => {
  if (!rows.length) return;
  console.log('\n' + label);
  for (const r of rows) console.log('   ' + fmt(r));
};

section('DOUBLED BRAND — strip it from metadata.title', doubled, r => `[x${r.count}] ${r.route}\n         ${r.title}`);
section('NO BRAND — template did not reach it; spell the brand out', unbranded, r => `${r.route}\n         ${r.title}`);
section('NO <title> TAG', missing, r => r);

if (long.length) {
  console.log('\nOVER ' + SERP_LIMIT + ' CHARS — truncated in search results (warning only)');
  for (const r of long.sort((a, b) => b.len - a.len)) {
    console.log('   ' + String(r.len).padStart(3) + '  ' + r.title);
  }
}

process.exit(doubled.length || unbranded.length || missing.length ? 1 : 0);
