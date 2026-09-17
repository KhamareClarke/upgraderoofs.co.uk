import type { Metadata } from 'next';
import { Calendar, User, Clock, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { CtaSubMessage } from '@/components/CtaSubMessage';

export const metadata: Metadata = {
  title: 'Flat vs Tile Roofs | Which Lasts Longer?',
  description: 'Compare flat roofing vs tile roofing durability in UK weather. Expert analysis from Sandbach roofers on lifespan, costs, and best choice for your property.',
  keywords: 'flat roof vs tile roof, roof lifespan UK, best roofing materials Cheshire, flat roofing durability Sandbach, tile roof longevity',
  openGraph: {
    title: 'Flat vs. Tile Roofs – Which Lasts Longer in the UK?',
    description: 'Expert comparison of flat and tile roofing systems for UK properties.',
    type: 'article',
  },
};

export default function FlatVsTileRoofsPost() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-brand-navy/95 to-brand-navy/90">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-brand-orange mb-4">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">November 4, 2024</span>
              <span className="text-white/50">•</span>
              <User className="w-4 h-4" />
              <span className="text-sm">Upgrade Roofs Team</span>
              <span className="text-white/50">•</span>
              <Clock className="w-4 h-4" />
              <span className="text-sm">7 min read</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Flat vs. Tile Roofs – Which Lasts Longer in the UK?
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl">
              A comprehensive comparison of flat and tile roofing systems from experienced Cheshire roofers. 
              Discover which option offers the best longevity for your property.
            </p>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="section-padding">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              <div className="mb-8">
                <Image
                  src="/images/7.jpeg"
                  alt="Comparison of flat roof and tile roof systems in Cheshire"
                  width={800}
                  height={400}
                  className="rounded-xl shadow-lg w-full object-cover"
                />
              </div>

              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                When choosing roofing materials for properties in <strong>Sandbach and Cheshire</strong>, 
                longevity is a crucial factor. As professional roofing contractors with over 25 years of experience, 
                we're frequently asked: "Which lasts longer – flat roofs or tile roofs?" The answer depends on several factors.
              </p>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Tile Roofs</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Tile Roofing Lifespan in the UK</h2>
              </div>

              <p className="mb-4">
                Traditional tile roofing systems are renowned for their longevity:
              </p>

              <div className="bg-green-50 border border-green-200 border-l-4 border-l-green-500 p-6 mb-6">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Tile Roof Advantages
                </h3>
                <ul className="space-y-2 text-green-700">
                  <li><strong>Clay tiles:</strong> 50-100+ years with proper maintenance</li>
                  <li><strong>Concrete tiles:</strong> 30-50 years average lifespan</li>
                  <li><strong>Natural slate:</strong> 75-150 years (premium option)</li>
                  <li><strong>Weather resistance:</strong> Excellent performance in UK climate</li>
                  <li><strong>Individual replacement:</strong> Damaged tiles can be replaced individually</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-brand-navy mb-3">
                Factors Affecting Tile Roof Longevity
              </h3>

              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li><strong>Material quality</strong> - Premium clay and slate outlast budget concrete tiles</li>
                <li><strong>Installation quality</strong> - Professional installation crucial for longevity</li>
                <li><strong>Roof pitch</strong> - Steeper pitches shed water more effectively</li>
                <li><strong>Maintenance</strong> - Regular inspections and minor repairs extend lifespan</li>
                <li><strong>Local weather</strong> - Cheshire's freeze-thaw cycles can affect some materials</li>
              </ul>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Flat Roofs</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Flat Roofing Lifespan in the UK</h2>
              </div>

              <p className="mb-4">
                Modern flat roofing systems have significantly improved in recent decades:
              </p>

              <div className="bg-blue-50 border border-blue-200 border-l-4 border-l-blue-500 p-6 mb-6">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Modern Flat Roof Lifespans
                </h3>
                <ul className="space-y-2 text-blue-700">
                  <li><strong>EPDM rubber:</strong> 20-30 years with excellent weather resistance</li>
                  <li><strong>GRP fibreglass:</strong> 25-30 years, seamless and durable</li>
                  <li><strong>Modified bitumen:</strong> 15-25 years, good value option</li>
                  <li><strong>Built-up felt:</strong> 10-20 years, traditional but shorter lifespan</li>
                  <li><strong>Liquid applied systems:</strong> 20-25 years, ideal for complex shapes</li>
                </ul>
              </div>

              <div className="bg-brand-orange/10 border-l-4 border-brand-orange p-6 mb-8">
                <p className="text-brand-navy font-semibold mb-2">Professional Insight:</p>
                <p className="text-gray-700">
                  The key to flat roof longevity is proper drainage and regular maintenance. Our <Link href="/services/flat-roofing" className="text-brand-orange hover:underline">flat roofing specialists</Link> 
                  recommend annual inspections to maximize lifespan.
                </p>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Comparison</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Direct Comparison: Longevity Analysis</h2>
              </div>

              <div className="overflow-x-auto mb-8">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">Roofing Type</th>
                      <th className="border border-gray-300 p-3 text-left">Average Lifespan</th>
                      <th className="border border-gray-300 p-3 text-left">Weather Resistance</th>
                      <th className="border border-gray-300 p-3 text-left">Maintenance Needs</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">Natural Slate</td>
                      <td className="border border-gray-300 p-3">75-150 years</td>
                      <td className="border border-gray-300 p-3 text-green-600">Excellent</td>
                      <td className="border border-gray-300 p-3">Low</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">Clay Tiles</td>
                      <td className="border border-gray-300 p-3">50-100 years</td>
                      <td className="border border-gray-300 p-3 text-green-600">Excellent</td>
                      <td className="border border-gray-300 p-3">Low</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">Concrete Tiles</td>
                      <td className="border border-gray-300 p-3">30-50 years</td>
                      <td className="border border-gray-300 p-3 text-green-600">Good</td>
                      <td className="border border-gray-300 p-3">Medium</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">EPDM Flat Roof</td>
                      <td className="border border-gray-300 p-3">20-30 years</td>
                      <td className="border border-gray-300 p-3 text-blue-600">Very Good</td>
                      <td className="border border-gray-300 p-3">Medium</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-semibold">GRP Flat Roof</td>
                      <td className="border border-gray-300 p-3">25-30 years</td>
                      <td className="border border-gray-300 p-3 text-blue-600">Very Good</td>
                      <td className="border border-gray-300 p-3">Low</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">UK Climate</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">UK Climate Considerations</h2>
              </div>

              <p className="mb-4">
                Cheshire's climate presents unique challenges for both roofing types:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                  <h3 className="font-semibold text-brand-navy mb-3">Tile Roofs in UK Weather</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">Excellent wind resistance</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">Natural water shedding</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">Freeze-thaw can crack tiles</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">Individual tiles can be damaged</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                  <h3 className="font-semibold text-brand-navy mb-3">Flat Roofs in UK Weather</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">Modern materials very durable</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">Seamless water protection</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">Requires proper drainage</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">More maintenance intensive</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Cost Analysis</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Cost vs. Longevity Analysis</h2>
              </div>

              <p className="mb-4">
                When considering total cost of ownership over the roof's lifetime:
              </p>

              <div className="bg-brand-navy text-white p-8 border-l-4 border-l-brand-orange mb-8">
                <h3 className="text-xl font-bold mb-4">Cost Per Year Analysis</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-orange mb-2">£15-30</div>
                    <div className="text-sm">Natural Slate per year</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-orange mb-2">£25-50</div>
                    <div className="text-sm">Clay Tiles per year</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-orange mb-2">£80-150</div>
                    <div className="text-sm">Modern Flat Roof per year</div>
                  </div>
                </div>
                <p className="text-sm text-white/80 mt-4 text-center">
                  *Based on average installation costs and lifespan expectations
                </p>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Your Choice</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Which Should You Choose?</h2>
              </div>

              <p className="mb-4">
                The best choice depends on your specific situation:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="border border-green-200 border-l-4 border-l-green-500 p-6">
                  <h3 className="font-semibold text-green-800 mb-3">Choose Tile Roofing If:</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• You want maximum longevity (50+ years)</li>
                    <li>• Your roof has adequate pitch (&gt;30°)</li>
                    <li>• You prefer traditional aesthetics</li>
                    <li>• Long-term cost efficiency is priority</li>
                    <li>• You want low maintenance requirements</li>
                  </ul>
                </div>
                <div className="border border-blue-200 border-l-4 border-l-blue-500 p-6">
                  <h3 className="font-semibold text-blue-800 mb-3">Choose Flat Roofing If:</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• You have a low-pitch or flat roof</li>
                    <li>• Modern aesthetics are preferred</li>
                    <li>• Lower initial cost is important</li>
                    <li>• You plan to move within 20-30 years</li>
                    <li>• You want usable roof space</li>
                  </ul>
                </div>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Installation</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Professional Installation is Key</h2>
              </div>

              <p className="mb-6">
                Regardless of which system you choose, professional installation is crucial for achieving maximum lifespan. 
                Poor installation can reduce even the best materials' longevity by 50% or more.
              </p>

              <p className="mb-8">
                Our experienced team provides expert installation of both <Link href="/services/tile-slate-roofing" className="text-brand-orange hover:underline">tile roofing systems</Link> and 
                <Link href="/services/flat-roofing" className="text-brand-orange hover:underline"> modern flat roofing solutions</Link> throughout 
                Sandbach and Cheshire.
              </p>

              <div className="bg-brand-orange/10 border border-brand-orange border-l-4 border-l-brand-orange p-8 mb-8">
                <h3 className="text-xl font-bold text-brand-navy mb-4">Get Expert Advice</h3>
                <p className="mb-4">
                  Unsure which roofing system is best for your property? Our experienced team provides free consultations 
                  and detailed assessments to help you make the right choice.
                </p>
                <div className="flex flex-col items-start gap-2">
                  <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold" asChild>
                    <Link href="/contact">
                      Get Free Consultation
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <CtaSubMessage />
                </div>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Summary</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Conclusion</h2>
              </div>

              <p className="mb-6">
                While tile roofing systems generally offer superior longevity (50-100+ years vs 20-30 years for flat roofs), 
                modern flat roofing materials have significantly improved and can be the right choice for many properties. 
                The key factors are proper material selection, professional installation, and regular maintenance.
              </p>

              <p className="mb-8">
                For expert advice on the best roofing solution for your Cheshire property, contact our experienced team. 
                We provide honest assessments and quality installations backed by comprehensive warranties. 
                Explore our <Link href="/new-roofs" className="text-brand-orange hover:underline">new roof installations</Link> for 
                complete re-roofing, or our <Link href="/roof-repairs" className="text-brand-orange hover:underline">roof repair services</Link> if 
                your current roof just needs attention.
              </p>
            </div>

            {/* Related Articles */}
            <div className="border-t pt-8 mt-8">
              <h3 className="text-xl font-bold text-brand-navy mb-6">Related Articles</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Link href="/blog/roof-damage-signs" className="group">
                  <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy hover:border-brand-orange/50 hover:border-l-brand-orange transition-all">
                    <h4 className="font-semibold text-brand-navy group-hover:text-brand-orange mb-2">
                      How to Spot Roof Damage Before It Gets Expensive
                    </h4>
                    <p className="text-sm text-gray-600">
                      Learn to identify early signs of roof damage and prevent costly repairs.
                    </p>
                  </div>
                </Link>
                <Link href="/blog/gutter-repair-costs" className="group">
                  <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy hover:border-brand-orange/50 hover:border-l-brand-orange transition-all">
                    <h4 className="font-semibold text-brand-navy group-hover:text-brand-orange mb-2">
                      The Real Cost of Ignoring Gutter Repairs
                    </h4>
                    <p className="text-sm text-gray-600">
                      Discover how neglected gutters can lead to expensive structural damage.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
