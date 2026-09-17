import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import {
  Home, 
  Info, 
  Wrench, 
  MapPin, 
  Star, 
  Image as ImageIcon, 
  FileText, 
  Users, 
  Mail,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { SectionHeader } from '@/components/SectionHeader';
import { CtaSubMessage } from '@/components/CtaSubMessage';
export const metadata: Metadata = {
  title: 'Sitemap | All Pages',
  description: 'Complete sitemap of all pages on Upgrade Roofs website. Easy navigation to all our roofing services, areas, and information.',
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/sitemap-page' },
  robots: {
    index: true,
    follow: true,
  },
};

const sitePages = [
  {
    category: 'Main Pages',
    icon: Home,
    pages: [
      { title: 'Homepage', url: '/', description: 'Main landing page with overview of services' },
      { title: 'About Us', url: '/about', description: 'Company information and experience' },
      { title: 'Contact', url: '/contact', description: 'Get in touch and request quotes' },
      { title: 'Special Offer', url: '/special-offer', description: '🎯 FREE Roof Inspection - Limited Time' },
    ]
  },
  {
    category: 'Services',
    icon: Wrench,
    pages: [
      { title: 'All Services', url: '/services', description: 'Complete overview of roofing services' },
      { title: 'Tile & Slate Roofing', url: '/services/tile-slate-roofing', description: 'Traditional roofing solutions' },
      { title: 'Flat Roofing', url: '/services/flat-roofing', description: 'Modern flat roofing systems' },
      { title: 'Chimney Repairs', url: '/services/chimney-repairs', description: 'Professional chimney services' },
      { title: 'Gutters & Fascias', url: '/services/gutters-fascias', description: 'Complete guttering solutions' },
      { title: 'Skylights & Roof Windows', url: '/services/skylights-roof-windows', description: 'Natural light solutions' },
      { title: 'Cladding', url: '/services/cladding', description: 'Wall and roof cladding systems' },
    ]
  },
  {
    category: 'Areas & Locations',
    icon: MapPin,
    pages: [
      { title: 'Service Areas', url: '/service-areas', description: 'All areas we serve across Cheshire' },
    ]
  },
  {
    category: 'Content & Resources',
    icon: FileText,
    pages: [
      { title: 'Blog', url: '/blog', description: 'Roofing tips and industry insights' },
      { title: 'How to Spot Roof Damage', url: '/blog/roof-damage-signs', description: 'Expert guide to identifying roof problems' },
      { title: 'Flat vs Tile Roofs Comparison', url: '/blog/flat-vs-tile-roofs', description: 'Which roofing type lasts longer in the UK?' },
      { title: 'Gallery', url: '/gallery', description: 'Photos of our completed roofing projects' },
      { title: 'Reviews', url: '/reviews', description: 'Customer testimonials and feedback' },
    ]
  },
  {
    category: 'Legal & Information',
    icon: Info,
    pages: [
      { title: 'Privacy Policy', url: '/privacy', description: 'How we handle your personal information' },
      { title: 'Terms & Conditions', url: '/terms', description: 'Service terms and conditions' },
      { title: 'Sitemap', url: '/sitemap-page', description: 'This page - complete site navigation' },
      { title: 'Thank You', url: '/thank-you', description: 'Confirmation page after form submissions' },
    ]
  }
];

const quickActions = [
  {
    title: 'Get Free Quote',
    url: '/special-offer',
    icon: Star,
    color: 'bg-brand-orange',
    description: 'Limited time offer - FREE roof inspection'
  },
  {
    title: 'Call Now',
    url: 'tel:01270897606',
    icon: Mail,
    color: 'bg-green-500',
    description: '01270 897606 - Immediate assistance'
  },
  {
    title: 'View Services',
    url: '/services',
    icon: Wrench,
    color: 'bg-blue-500',
    description: 'Complete list of roofing services'
  },
  {
    title: 'Service Areas',
    url: '/service-areas',
    icon: MapPin,
    color: 'bg-purple-500',
    description: 'Areas we cover across Cheshire'
  }
];

export default function SitemapPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-brand-grey to-white">
      {/* Header */}
      <section className="py-16 bg-gradient-to-r from-brand-navy to-brand-navy/90 text-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Website Sitemap
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Complete navigation guide to all pages on Upgrade Roofs website. 
              Find exactly what you're looking for.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="section-padding">
        <div className="container-custom">
          <SectionHeader
            kicker="Quick Actions"
            title="Quick Actions"
            subtitle="Most popular pages and actions"
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {quickActions.map((action, index) => (
              <Card key={index} className="hover-lift transition-all duration-300 border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 ${action.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <action.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-brand-navy mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                  <Button className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white" asChild>
                    {action.url.startsWith('tel:') ? (
                      <TrackedPhoneLink href={action.url} placement="sitemap_page">
                        Access Now
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </TrackedPhoneLink>
                    ) : (
                      <Link href={action.url}>
                        Access Now
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* All Pages */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionHeader
            kicker="Site Directory"
            title="All Website Pages"
            subtitle="Complete directory organized by category"
          />

          <div className="space-y-12">
            {sitePages.map((section, index) => (
              <div key={index}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-brand-orange/10 rounded-xl flex items-center justify-center">
                    <section.icon className="w-6 h-6 text-brand-orange" />
                  </div>
                  <h3 className="text-2xl font-bold text-brand-navy">{section.category}</h3>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {section.pages.map((page, pageIndex) => (
                    <Card key={pageIndex} className="hover-lift transition-all duration-300">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-brand-navy flex items-center justify-between">
                          {page.title}
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">{page.description}</p>
                        <div className="flex items-center justify-between">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                            {page.url}
                          </code>
                          <Button size="sm" variant="outline" className="border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white" asChild>
                            <Link href={page.url}>Visit</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search & Navigation Help */}
      <section className="section-padding bg-brand-grey">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <SectionHeader
              kicker="Help"
              title="Need Help Finding Something?"
              subtitle="Can't find what you're looking for? Here are some helpful suggestions."
            />

            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-brand-navy">Looking for Services?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Browse our complete service directory with detailed information about each roofing service we offer.
                  </p>
                  <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white" asChild>
                    <Link href="/services">
                      View All Services
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-brand-navy">Need Immediate Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    For urgent roofing issues or to speak with our team directly, contact us immediately.
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    <Button className="bg-green-500 hover:bg-green-600 text-white" asChild>
                      <TrackedPhoneLink href="tel:01270897606" placement="sitemap_page">Call Now</TrackedPhoneLink>
                    </Button>
                    <CtaSubMessage dark={false} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="section-padding bg-gradient-to-r from-brand-orange to-brand-orange/90 text-white">
        <div className="container-custom text-center">
          <SectionHeader
            dark
            kicker="Get Started"
            title="Ready to Get Started?"
            subtitle="Don't wait - get your free roof inspection today and protect your home."
          />
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" className="bg-white text-brand-orange hover:bg-gray-100 font-bold px-8 py-4" asChild>
              <Link href="/special-offer">
                <Star className="w-5 h-5 mr-2" />
                Get FREE Inspection
              </Link>
            </Button>
            <CtaSubMessage dark />
          </div>
        </div>
      </section>
    </div>
  );
}
