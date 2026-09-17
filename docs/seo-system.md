# SEO System Guide — Upgrade Roofs (Developer Reference)

> How SEO works in this codebase. Read this before adding pages, changing metadata, or modifying internal links.

---

## Architecture Overview

This is a Next.js App Router site. SEO is managed through:

1. **Metadata API** — `export const metadata: Metadata` in `layout.tsx` files
2. **JSON-LD Schema** — Via components like `BlogArticleSchema`
3. **Centralised town data** — `lib/town-data.ts`
4. **Reusable templates** — `components/AreaPageTemplate.tsx`
5. **Sitemap** — `app/sitemap.ts` (auto-generated)
6. **robots.txt** — `app/robots.ts`

---

## Adding a New Town Page

1. **Add town data** to `lib/town-data.ts`:
   ```ts
   newtown: {
     slug: 'roofers-newtown',
     town: 'Newtown',
     postcode: 'CW99',
     distanceFromBase: 'X miles from our Sandbach base',
     emergencyResponseTime: 'XX–XX minutes',
     intro: '...',
     localContext: '...',
     roofingChallenges: '...',
     landmarks: ['...'],
     propertyTypes: ['...'],
     commonProblems: [{ problem: '...', solution: '...' }],
     proofPoint: '...',
     ctaLine: '...',
     faqs: [{ q: '...', a: '...' }],
     nearbyAreas: [{ name: '...', href: '/roofers-...' }],
   }
   ```

2. **Create the page** at `app/roofers-newtown/page.tsx`:
   ```tsx
   import { AreaPageTemplate } from '@/components/AreaPageTemplate';
   import { townData } from '@/lib/town-data';

   export const dynamic = 'force-static';
   export const revalidate = false;

   const data = townData.newtown;

   export default function RoofersNewtownPage() {
     return (
       <AreaPageTemplate
         town={data.town}
         postcode={data.postcode}
         distanceFromBase={data.distanceFromBase}
         emergencyResponseTime={data.emergencyResponseTime}
         intro={data.intro}
         localContext={data.localContext}
         roofingChallenges={data.roofingChallenges}
         landmarks={data.landmarks}
         propertyTypes={data.propertyTypes}
         commonProblems={data.commonProblems}
         proofPoint={data.proofPoint}
         ctaLine={data.ctaLine}
         faqs={data.faqs}
         nearbyAreas={data.nearbyAreas}
       />
     );
   }
   ```

3. **Create the layout** at `app/roofers-newtown/layout.tsx` with metadata:
   - Title format: `Roofers Newtown | [Unique Differentiator]` — no phone number, no
     brand (the root layout's template appends `| Upgrade Roofs`). See
     [Title Format by Page Type](#title-format-by-page-type).
   - Include postcode in description
   - Set canonical URL
   - Set `robots: { index: true, follow: true }`

4. **Update existing town pages** — add Newtown to their `nearbyAreas` in `town-data.ts`

5. **Update `ServiceAreaLinks`** component if needed

6. **Update `lib/town-data.ts`** with the new page entry

---

## Adding a New Blog Post

1. **Create page** at `app/blog/[slug]/page.tsx` with article content

2. **Create layout** at `app/blog/[slug]/layout.tsx`:
   ```tsx
   import type { Metadata } from 'next';
   import { BlogArticleSchema } from '@/components/BlogArticleSchema';

   export const metadata: Metadata = {
     title: '...',
     description: '...',
     keywords: '...',
     openGraph: { title: '...', description: '...', type: 'article', url: '...' },
     twitter: { card: 'summary_large_image', title: '...', description: '...' },
     alternates: { canonical: 'https://www.upgraderoofs.co.uk/blog/[slug]' },
     robots: { index: true, follow: true },
   };

   export default function Layout({ children }: { children: React.ReactNode }) {
     return (
       <>
         <BlogArticleSchema
           title="..."
           description="..."
           url="https://www.upgraderoofs.co.uk/blog/[slug]"
           datePublished="YYYY-MM-DD"
           image="/images/X.jpeg"
         />
         {children}
       </>
     );
   }
   ```

3. **Add internal links** to 2-3 money pages within the article body (contextual, not forced)

4. **Add the post** to the blog index at `app/blog/page.tsx`

5. **Update money pages** — add a blog link to the relevant money page's cross-links section if the post is highly relevant

6. **Update `lib/town-data.ts`**

---

## Metadata Rules

### Title Format by Page Type

**Target ≤60 characters rendered.** Google truncates around there, and the brand
suffix costs 16, so a page's own literal gets 44.

**No phone numbers in titles.** They cost 15 characters of a 60-character budget,
they don't help ranking, and Google often rewrites them away. The number is in the
meta description, the header and the footer of every page.

The root layout's `title.template` appends `| Upgrade Roofs`, so these formats
omit the brand — with two exceptions noted below.

| Type | Format | Example |
|------|--------|---------|
| Money page | `[Service] Cheshire \| [Differentiator]` | `Roof Repairs Cheshire \| Same-Day` |
| Town page | `Roofers [Town] \| [Differentiator]` | `Roofers Crewe \| CW1 & CW2 Roofing` |
| Blog post | `[Topic] \| [Location]` | `Gutter Maintenance Guide Cheshire` |
| Service × town | `[Service] [Town] \| Upgrade Roofs` | `Skylights Winsford \| Upgrade Roofs` |
| Homepage | `[Positioning] \| Upgrade Roofs` | `Trusted Roofers in Sandbach & Cheshire \| Upgrade Roofs` |
| Offer page | `Free Roof Inspection [Town]` | (noindex) |

The two rows that spell out the brand are the two the template does **not** reach.
Next stashes the template only for metadata items before the last two, and drops it
when an item declares a plain-string title (`resolve-metadata.js`):

- **Homepage** — the root page shares its segment with the root layout, leaving only
  two items, so the template is never stashed.
- **Service × town** — `app/roofers-<town>/layout.tsx` declares a plain-string title,
  which wipes the template for everything beneath it.

Never add a `title` to an intermediate `layout.tsx` without checking this: it
silently strips the brand from every page under it. Run
`npm run build && node scripts/audit-page-titles.js` after touching any layout.

### Geographic Targeting

- **Money pages** → target **Cheshire** (county level)
- **Town pages** → target **specific town** (with postcode)
- **Blog posts** → target **Cheshire** (county level, informational)
- **Offer pages** → target **specific town** (noindex, PPC only)

**Never mix geographic levels.** A Cheshire-scoped page must not have a town in its H1. A town page must not claim Cheshire-wide scope.

### Robots Directives

| Page type | index | follow |
|-----------|-------|--------|
| Money pages | yes | yes |
| Town pages | yes | yes |
| Blog posts | yes | yes |
| Service sub-pages | yes | yes |
| Offer pages (PPC) | **no** | yes |
| Thank you page | **no** | **no** |
| Privacy policy | **no** | yes |

---

## Internal Linking Rules

### Direction of Link Flow

```
Blog Posts --[links UP to]--> Money Pages --[links DOWN to]--> Town Pages
     ^                           |                                |
     |                           +--[links to blog]               |
     +--[related articles]       +--[links across services]       +--[nearby towns]
```

### Requirements

1. Every blog post must link to at least 2 money pages (contextual text links, not banners)
2. Every money page must link to at least 2 blog posts
3. Every money page must link to all town pages (via `ServiceAreaLinks`)
4. Every town page must link to nearby town pages (via `nearbyAreas`)
5. Every town page links up to money pages (via `AreaPageTemplate` services section)

### Anchor Text

- Use descriptive, varied anchor text — not just "click here" or naked URLs
- Include the target keyword naturally: "our roof repair services", "24/7 emergency roofing"
- Avoid exact-match keyword stuffing in anchors

---

## Schema Markup

### Blog Posts — Article Schema

All blog posts use the `BlogArticleSchema` component in their layout. Props:

| Prop | Required | Description |
|------|----------|-------------|
| `title` | yes | Article headline |
| `description` | yes | Short description |
| `url` | yes | Full canonical URL |
| `datePublished` | yes | ISO date (YYYY-MM-DD) |
| `image` | no | Image path (e.g. `/images/1.jpeg`) |

### Site-Wide — LocalBusiness

Handled by the root layout / Analytics component. No per-page action needed.

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/town-data.ts` | Single source of truth for all town-specific content |
| `components/AreaPageTemplate.tsx` | Renders town pages from TownData props |
| `components/BlogArticleSchema.tsx` | JSON-LD Article schema for blog posts |
| `components/ServiceAreaLinks.tsx` | Town page links used on money pages |
| `app/sitemap.ts` | Auto-generated sitemap |
| `app/robots.ts` | robots.txt configuration |
| `lib/town-data.ts` | Town footprint source of truth |

---

## Common Mistakes to Avoid

1. **Duplicating town content** — All town data lives in `town-data.ts` only. Page files just import and pass props.
2. **Geographic mismatch** — If the `<title>` says "Cheshire", the H1 and body must also target Cheshire, not a specific town.
3. **Indexing PPC pages** — Offer pages must always be `noindex`. They exist for Google Ads only.
4. **Missing canonical URLs** — Every indexable page needs `alternates.canonical` set.
5. **Missing blog schema** — Every blog post layout must include `BlogArticleSchema`.
6. **Orphan pages** — Every new page must be linked to from at least one other page.
7. **Broken internal links** — When adding/removing pages, check all `nearbyAreas` arrays and cross-link sections.
