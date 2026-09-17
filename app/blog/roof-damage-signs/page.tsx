import type { Metadata } from 'next';
import { Calendar, User, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { CtaSubMessage } from '@/components/CtaSubMessage';

export const metadata: Metadata = {
  title: 'Spotting Roof Damage Before It Gets Costly',
  description: 'Learn to identify early signs of roof damage in Cheshire. Expert tips from Sandbach roofers to save money on repairs. Free roof inspections available.',
  keywords: 'roof damage signs, roof inspection Sandbach, roof problems Cheshire, roof maintenance, early roof damage',
  openGraph: {
    title: 'How to Spot Roof Damage Before It Gets Expensive',
    description: 'Expert guide to identifying roof damage early and preventing costly repairs.',
    type: 'article',
  },
};

export default function RoofDamageSignsPost() {
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
              <span className="text-sm">5 min read</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              How to Spot Roof Damage Before It Gets Expensive
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl">
              Early detection of roof problems can save Cheshire homeowners thousands in repair costs. 
              Learn the warning signs from our experienced roofing professionals.
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
                  src="/images/6.jpeg"
                  alt="Professional roof inspection in Sandbach showing damaged tiles"
                  width={800}
                  height={400}
                  className="rounded-xl shadow-lg w-full object-cover"
                />
              </div>

              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                As professional <strong>roofing contractors in Sandbach</strong>, we've seen how small, unnoticed problems 
                can quickly escalate into major structural issues. The key to avoiding expensive roof repairs is knowing what 
                to look for and when to call in the experts.
              </p>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Indoors</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">1. Interior Warning Signs</h2>
              </div>
              
              <p className="mb-4">
                The first signs of roof damage often appear inside your home. Here's what to watch for:
              </p>

              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li><strong>Water stains on ceilings or walls</strong> - Even small discoloration indicates water penetration</li>
                <li><strong>Peeling paint or wallpaper</strong> - Often caused by moisture from roof leaks</li>
                <li><strong>Musty odors</strong> - Could indicate mold growth from persistent dampness</li>
                <li><strong>Sagging ceiling areas</strong> - A serious sign requiring immediate professional attention</li>
              </ul>

              <div className="bg-brand-orange/10 border-l-4 border-brand-orange p-6 mb-8">
                <p className="text-brand-navy font-semibold mb-2">Professional Tip:</p>
                <p className="text-gray-700">
                  If you notice any interior water damage, don't wait. Contact our <Link href="/contact" className="text-brand-orange hover:underline">emergency roof repair service</Link> immediately 
                  to prevent further structural damage.
                </p>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Outdoors</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">2. Exterior Roof Inspection Points</h2>
              </div>

              <p className="mb-4">
                Regular visual inspections from ground level can reveal many problems:
              </p>

              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li><strong>Missing, cracked, or curling roof tiles</strong> - Common in Cheshire's variable weather</li>
                <li><strong>Damaged flashing</strong> - Check around chimneys, vents, and skylights</li>
                <li><strong>Clogged or damaged gutters</strong> - Can cause water backup and roof damage</li>
                <li><strong>Moss or algae growth</strong> - Indicates moisture retention and potential tile damage</li>
                <li><strong>Granules in gutters</strong> - Sign of aging roof tiles needing replacement</li>
              </ul>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Seasonal</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">3. Seasonal Damage in Cheshire</h2>
              </div>

              <p className="mb-4">
                Our local climate presents unique challenges for roofing systems:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                  <h3 className="font-semibold text-brand-navy mb-3">Winter Damage</h3>
                  <ul className="text-sm space-y-1">
                    <li>• Ice dam formation</li>
                    <li>• Freeze-thaw tile cracking</li>
                    <li>• Snow load stress</li>
                    <li>• Gutter ice damage</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                  <h3 className="font-semibold text-brand-navy mb-3">Storm Damage</h3>
                  <ul className="text-sm space-y-1">
                    <li>• Wind-lifted tiles</li>
                    <li>• Debris impact damage</li>
                    <li>• Flashing displacement</li>
                    <li>• Chimney damage</li>
                  </ul>
                </div>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Call a Pro</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">4. When to Call Professional Roofers</h2>
              </div>

              <p className="mb-4">
                While homeowners can spot many warning signs, professional inspection is crucial for:
              </p>

              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>Detailed structural assessment</li>
                <li>Hidden damage detection</li>
                <li>Insurance claim documentation</li>
                <li>Preventive maintenance planning</li>
              </ul>

              <div className="bg-brand-navy text-white p-8 border-l-4 border-l-brand-orange mb-8">
                <h3 className="text-xl font-bold mb-4">Free Professional Roof Inspection</h3>
                <p className="mb-4">
                  Our experienced team provides comprehensive roof inspections throughout Sandbach and Cheshire. 
                  We'll identify potential problems before they become expensive repairs.
                </p>
                <div className="flex flex-col items-start gap-2">
                  <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold" asChild>
                    <Link href="/contact">
                      Book Free Inspection
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <CtaSubMessage dark />
                </div>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">The Cost</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">5. Cost of Delayed Repairs</h2>
              </div>

              <p className="mb-4">
                Ignoring early warning signs can lead to:
              </p>

              <div className="overflow-x-auto mb-8">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">Problem</th>
                      <th className="border border-gray-300 p-3 text-left">Early Repair Cost</th>
                      <th className="border border-gray-300 p-3 text-left">Delayed Repair Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3">Missing tiles</td>
                      <td className="border border-gray-300 p-3">£50-£150</td>
                      <td className="border border-gray-300 p-3">£500-£2,000</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3">Small leak</td>
                      <td className="border border-gray-300 p-3">£200-£500</td>
                      <td className="border border-gray-300 p-3">£2,000-£8,000</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3">Damaged flashing</td>
                      <td className="border border-gray-300 p-3">£150-£400</td>
                      <td className="border border-gray-300 p-3">£1,000-£5,000</td>
                    </tr>
                  </tbody>
                </table>
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
                Regular roof inspections and early intervention are the keys to maintaining your property's value and avoiding 
                costly emergency repairs. As experienced <strong>roofing contractors serving Sandbach and Cheshire</strong>, 
                we recommend annual professional inspections and immediate attention to any warning signs.
              </p>

              <p className="mb-8">
                For expert <Link href="/roof-repairs" className="text-brand-orange hover:underline">roof repair services</Link> or 
                to schedule your free inspection, contact our team today. If damage is severe or you're dealing with an active leak, 
                call our <Link href="/emergency-roofing" className="text-brand-orange hover:underline">24/7 emergency roofing line</Link> on 01270 897 606. 
                When repairs aren't enough, we also offer <Link href="/new-roofs" className="text-brand-orange hover:underline">complete new roof installations</Link> with 10-year guarantees.
              </p>
            </div>

            {/* Related Articles */}
            <div className="border-t pt-8 mt-8">
              <h3 className="text-xl font-bold text-brand-navy mb-6">Related Articles</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Link href="/blog/flat-vs-tile-roofs" className="group">
                  <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy hover:border-brand-orange/50 hover:border-l-brand-orange transition-all">
                    <h4 className="font-semibold text-brand-navy group-hover:text-brand-orange mb-2">
                      Flat vs. Tile Roofs – Which Lasts Longer in the UK?
                    </h4>
                    <p className="text-sm text-gray-600">
                      Compare roofing materials and their longevity in British weather conditions.
                    </p>
                  </div>
                </Link>
                <Link href="/blog/roof-inspection-guide" className="group">
                  <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy hover:border-brand-orange/50 hover:border-l-brand-orange transition-all">
                    <h4 className="font-semibold text-brand-navy group-hover:text-brand-orange mb-2">
                      What to Expect from a Professional Roof Inspection
                    </h4>
                    <p className="text-sm text-gray-600">
                      Detailed guide to professional roof inspection processes and reports.
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
