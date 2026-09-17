import type { Metadata } from 'next';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/SectionHeader';
import { HeroKicker } from '@/components/HeroKicker';
import { CtaSubMessage } from '@/components/CtaSubMessage';

// Moved here from the layout: see the comment in app/blog/layout.tsx. `title`
// carries no brand — the root layout's template appends it.
export const metadata: Metadata = {
  title: 'Roofing Blog | Tips & Advice',
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function calculateReadTime(content: string) {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

const staticPosts = [
  {
    slug: 'emergency-roof-repairs',
    title: 'Emergency Roof Repairs in Cheshire: What to Do When Disaster Strikes',
    excerpt: 'Storm damage, sudden leaks, or fallen debris? Learn how to handle roofing emergencies and when to call professional help.',
    category: 'Emergency',
    image: '/images/1.jpeg',
    date: 'March 15, 2026',
    readTime: '4 min',
  },
  {
    slug: 'roof-maintenance-checklist',
    title: 'Complete Roof Maintenance Checklist for Cheshire Homeowners',
    excerpt: 'Keep your roof in top condition year-round with our comprehensive seasonal maintenance guide.',
    category: 'Maintenance',
    image: '/images/6.jpeg',
    date: 'March 10, 2026',
    readTime: '6 min',
  },
  {
    slug: 'how-long-does-roof-last',
    title: 'How Long Does a Roof Last? Complete UK Guide',
    excerpt: 'Understanding roof lifespans helps you plan for replacement. Learn how long different roofing materials last.',
    category: 'Guide',
    image: '/images/7.jpeg',
    date: 'March 8, 2026',
    readTime: '7 min',
  },
  {
    slug: 'gutter-maintenance-guide',
    title: 'Complete Guide to Gutter Maintenance in Cheshire',
    excerpt: 'Properly maintained gutters protect your home from water damage. Learn how to keep them flowing freely.',
    category: 'Maintenance',
    image: '/images/2.jpeg',
    date: 'March 5, 2026',
    readTime: '5 min',
  },
  {
    slug: 'chimney-repair-guide',
    title: 'Chimney Repairs in Cheshire: Complete Homeowner\'s Guide',
    excerpt: 'From repointing to full rebuilds, learn everything about chimney maintenance and repairs.',
    category: 'Repairs',
    image: '/images/1.jpeg',
    date: 'March 1, 2026',
    readTime: '6 min',
  },
  {
    slug: 'choosing-roofing-contractor',
    title: 'How to Choose a Reliable Roofing Contractor in Cheshire',
    excerpt: 'Avoid cowboy builders and rogue traders. Learn what to look for when hiring a roofing contractor.',
    category: 'Advice',
    image: '/images/6.jpeg',
    date: 'February 25, 2026',
    readTime: '8 min',
  },
  {
    slug: 'skylight-installation-guide',
    title: 'Skylight Installation Guide: Transform Your Home with Natural Light',
    excerpt: 'Everything you need to know about adding skylights to your Cheshire home.',
    category: 'Installation',
    image: '/images/10.jpeg',
    date: 'February 20, 2026',
    readTime: '7 min',
  },
  {
    slug: 'flat-roof-problems',
    title: 'Common Flat Roof Problems and How to Fix Them',
    excerpt: 'Flat roofs need special attention. Learn about common issues and when repairs vs replacement makes sense.',
    category: 'Repairs',
    image: '/images/3.jpeg',
    date: 'February 15, 2026',
    readTime: '6 min',
  },
  {
    slug: 'roof-damage-signs',
    title: 'How to Spot Roof Damage Before It Gets Expensive',
    excerpt: 'Early detection of roof problems can save thousands. Learn the warning signs from our professionals.',
    category: 'Maintenance',
    image: '/images/6.jpeg',
    date: 'November 4, 2024',
    readTime: '5 min',
  },
  {
    slug: 'flat-vs-tile-roofs',
    title: 'Flat vs. Tile Roofs – Which Lasts Longer in the UK?',
    excerpt: 'Compare roofing materials and their longevity in British weather conditions.',
    category: 'Guide',
    image: '/images/3.jpeg',
    date: 'October 28, 2024',
    readTime: '6 min',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative h-[300px] sm:h-[350px] md:h-[400px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-navy/70" />
        </div>

        <div className="container-custom relative z-10 text-center px-4">
          <HeroKicker light align="center" className="mb-3 sm:mb-4">Expert Insights</HeroKicker>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 px-2">Roofing Blog</h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto px-2">
            Expert tips, advice, and insights from Cheshire&#39;s leading roofing specialists
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div>
            <SectionHeader
              align="left"
              kicker="Expert Insights"
              title="All Articles"
            />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {staticPosts.map((post) => (
                <article
                  key={post.slug}
                  className="group bg-white border border-gray-200 border-l-4 border-l-brand-navy overflow-hidden hover:border-brand-orange/50 hover:border-l-brand-orange transition-all duration-300"
                >
                  <div className="relative h-40 sm:h-48 md:h-56 overflow-hidden bg-gray-200">
                    <img
                      src={post.image}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
                      <span className="px-2 py-1 sm:px-3 sm:py-1 rounded-full bg-brand-orange text-white text-[10px] sm:text-xs font-medium">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 md:p-6">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>{post.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-brand-navy mb-1 sm:mb-2 group-hover:text-brand-orange transition-colors break-words">
                      {post.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3 sm:mb-4">{post.excerpt}</p>

                    <Link href={`/blog/${post.slug}`}>
                      <Button
                        variant="ghost"
                        className="p-0 h-auto text-brand-orange hover:text-brand-orange/80 font-semibold text-xs sm:text-sm group/btn"
                      >
                        <span>Read More</span>
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Photo Gallery Section - All Images */}
      <section className="section-padding bg-brand-grey">
        <div className="container-custom">
          <div className="text-center mb-8 sm:mb-10">
            <SectionHeader
              kicker="Our Work"
              title="See Our Work in Action"
              subtitle="Browse our portfolio of 40+ completed roofing projects across Cheshire"
            />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[
              { src: '/images/1.jpeg', alt: 'Professional roof repair completed in Sandbach Cheshire by Upgrade Roofs', title: 'Roof Repair - Sandbach, CW11', category: 'Tile Roofs' },
              { src: '/images/2.jpeg', alt: 'EPDM rubber flat roof installation on garage extension in Crewe with 20 year guarantee', title: 'Flat Roof - Crewe, CW1', category: 'Flat Roofs' },
              { src: '/images/3.jpeg', alt: 'GRP fibreglass flat roof in Middlewich showing seamless waterproof finish', title: 'GRP Flat Roof - Middlewich, CW10', category: 'Flat Roofs' },
              { src: '/images/4.jpeg', alt: 'Chimney stack rebuild with lead flashing in Congleton heritage style finish', title: 'Chimney Rebuild - Congleton, CW12', category: 'Chimneys' },
              { src: '/images/5.jpeg', alt: 'New uPVC gutter and fascia replacement in Nantwich with leaf guard protection', title: 'Gutters - Nantwich, CW5', category: 'Gutters' },
              { src: '/images/6.jpeg', alt: 'Professional tile roof installation by Upgrade Roofs in Sandbach Cheshire', title: 'Tile Roof - Sandbach, CW11', category: 'Tile Roofs' },
              { src: '/images/7.jpeg', alt: 'Welsh slate roof repair in Alsager using reclaimed slates for authentic finish', title: 'Slate Roof - Alsager, ST7', category: 'Tile Roofs' },
              { src: '/images/8.jpeg', alt: 'Modern composite cladding installation on commercial property in Crewe', title: 'Cladding - Crewe, CW2', category: 'Cladding' },
              { src: '/images/9.jpeg', alt: 'Emergency storm damage roof repair in Cheshire completed within 24 hours', title: 'Emergency Repair - Cheshire', category: 'Emergency' },
              { src: '/images/10.jpeg', alt: 'Velux skylight installation in Holmes Chapel loft conversion with blackout blinds', title: 'Skylight - Holmes Chapel, CW4', category: 'Skylights' },
              { src: '/images/IMG-20240916-WA0000.jpg', alt: 'Roofing project completed by Upgrade Roofs professional team in Cheshire', title: 'Roofing Project - Cheshire', category: 'Tile Roofs' },
              { src: '/images/IMG-20241030-WA0000.jpg', alt: 'Professional roofing work in progress Sandbach quality materials', title: 'Roof Work - Sandbach', category: 'Tile Roofs' },
              { src: '/images/IMG-20241108-WA0004.jpg', alt: 'Completed roof installation Crewe area expert craftsmanship', title: 'Roof Installation - Crewe', category: 'Tile Roofs' },
              { src: '/images/IMG-20241115-WA0003.jpg', alt: 'Quality roofing craftsmanship Middlewich premium materials', title: 'Quality Roofing - Middlewich', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.52_1947b559.jpg', alt: 'Roof repair project Congleton professional finish by local roofers', title: 'Roof Repair - Congleton', category: 'Repairs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.52_25d5767d.jpg', alt: 'Flat roof waterproofing Nantwich EPDM rubber roofing', title: 'Flat Roof - Nantwich', category: 'Flat Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.52_3070e212.jpg', alt: 'Tile roof restoration Holmes Chapel traditional methods', title: 'Tile Restoration - Holmes Chapel', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.52_4b1b18d7.jpg', alt: 'Chimney repointing and repair Alsager lime mortar work', title: 'Chimney Repair - Alsager', category: 'Chimneys' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.52_980ddb1b.jpg', alt: 'Gutter cleaning and maintenance Sandbach prevent blockages', title: 'Gutter Maintenance - Sandbach', category: 'Gutters' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.52_e8fdd95f.jpg', alt: 'Professional roofing team at work Crewe experienced roofers', title: 'Roofing Team - Crewe', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.52_e9aca2cc.jpg', alt: 'Roof inspection and assessment Middlewich free quotes', title: 'Roof Inspection - Middlewich', category: 'Inspections' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.53_003d3c21.jpg', alt: 'Lead flashing installation Congleton Code 5 lead work', title: 'Lead Work - Congleton', category: 'Lead Work' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.53_6336d6af.jpg', alt: 'Fascia and soffit replacement Nantwich uPVC white finish', title: 'Fascias - Nantwich', category: 'Gutters' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.53_6be5d9aa.jpg', alt: 'Complete roof replacement Holmes Chapel new tiles and felt', title: 'Roof Replacement - Holmes Chapel', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.53_c118c125.jpg', alt: 'Storm damage repair Alsager emergency roofing service 24/7', title: 'Storm Repair - Alsager', category: 'Emergency' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.53_dbf84946.jpg', alt: 'Slate roof maintenance Sandbach preserving heritage roofs', title: 'Slate Maintenance - Sandbach', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.54_8a48077e.jpg', alt: 'Roof valley repair Crewe lead work waterproofing', title: 'Valley Repair - Crewe', category: 'Lead Work' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.54_a038d68f.jpg', alt: 'Flat roof repair Middlewich EPDM patch and seal', title: 'Flat Roof Repair - Middlewich', category: 'Flat Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.54_ab257b7f.jpg', alt: 'Roof tile replacement Congleton matching existing tiles', title: 'Tile Replacement - Congleton', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.54_cbd4d281.jpg', alt: 'Chimney cowl installation Nantwich prevent bird nesting', title: 'Chimney Cowl - Nantwich', category: 'Chimneys' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.54_e3f2bc59.jpg', alt: 'Roofing materials quality workmanship Holmes Chapel premium', title: 'Quality Materials - Holmes Chapel', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.55_1e294251.jpg', alt: 'Roof ridge repair Alsager dry ridge system installation', title: 'Ridge Repair - Alsager', category: 'Repairs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.55_581ab1f8.jpg', alt: 'Gutter downpipe installation Sandbach rainwater drainage', title: 'Downpipes - Sandbach', category: 'Gutters' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.55_6a3edf83.jpg', alt: 'Roof flashing repair Crewe waterproofing lead work', title: 'Flashing Repair - Crewe', category: 'Lead Work' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.55_929330ef.jpg', alt: 'Professional roofing service Middlewich trusted local roofers', title: 'Professional Service - Middlewich', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.56_420e66d1.jpg', alt: 'Roof ventilation installation Congleton prevent condensation', title: 'Ventilation - Congleton', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.56_5a14b8eb.jpg', alt: 'Moss removal and roof cleaning Nantwich restore appearance', title: 'Roof Cleaning - Nantwich', category: 'Maintenance' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.56_848eb65d.jpg', alt: 'Roof inspection drone survey Holmes Chapel detailed assessment', title: 'Drone Survey - Holmes Chapel', category: 'Inspections' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.56_c8ad1c5f.jpg', alt: 'Completed roofing project Alsager satisfied customer review', title: 'Completed Project - Alsager', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.57_2a6462b1.jpg', alt: 'Roof repair in progress Sandbach expert workmanship', title: 'Repair in Progress - Sandbach', category: 'Repairs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.57_2c9b3b50.jpg', alt: 'Quality roofing finish Crewe attention to detail', title: 'Quality Finish - Crewe', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.57_51667db9.jpg', alt: 'Roofing expertise Middlewich 25 years experience', title: 'Expert Work - Middlewich', category: 'Tile Roofs' },
              { src: '/images/WhatsApp Image 2024-12-09 at 21.50.57_a3a65185.jpg', alt: 'Professional roofing Congleton Cheshire trusted company', title: 'Professional Roofing - Congleton', category: 'Tile Roofs' },
            ].map((img, i) => (
              <article 
                key={i} 
                className="group relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all"
                itemScope
                itemType="https://schema.org/ImageObject"
              >
                <meta itemProp="name" content={img.title} />
                <meta itemProp="description" content={img.alt} />
                <img
                  src={img.src}
                  alt={img.alt}
                  title={img.title}
                  loading={i < 10 ? 'eager' : 'lazy'}
                  itemProp="contentUrl"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                    <span className="inline-block px-1.5 py-0.5 bg-brand-orange text-white text-[8px] sm:text-[10px] rounded-full mb-1">
                      {img.category}
                    </span>
                    <p className="text-white text-[10px] sm:text-xs font-medium line-clamp-2">{img.title}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 mb-4">Showing 43 completed projects across Sandbach, Crewe, Middlewich, Congleton, Nantwich, Holmes Chapel, Alsager & Cheshire</p>
            <Link href="/gallery">
              <Button className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-6 py-3">
                View Full Gallery
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="section-padding bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white">
        <div className="container-custom text-center px-2">
          <SectionHeader
            dark
            kicker="Get Started"
            title="Need Expert Roofing Advice?"
            subtitle="Our team is here to help with all your roofing questions"
          />
          <div className="flex flex-col items-center gap-2">
            <Link href="/contact">
              <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 !text-white font-bold px-6 sm:px-8 md:px-10 h-12 sm:h-14 text-base sm:text-lg w-full sm:w-auto max-w-xs sm:max-w-none mx-auto">
                Contact Us Today
              </Button>
            </Link>
            <CtaSubMessage dark />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <Link href="/roofers-sandbach" className="text-white/70 hover:text-white transition-colors">Roofers Sandbach</Link>
            <span className="text-white/30">·</span>
            <Link href="/roof-repairs" className="text-white/70 hover:text-white transition-colors">Roof Repairs</Link>
            <span className="text-white/30">·</span>
            <Link href="/new-roofs" className="text-white/70 hover:text-white transition-colors">New Roofs</Link>
            <span className="text-white/30">·</span>
            <Link href="/emergency-roofing" className="text-white/70 hover:text-white transition-colors">Emergency Roofing</Link>
            <span className="text-white/30">·</span>
            <Link href="/services" className="text-white/70 hover:text-white transition-colors">All Services</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
