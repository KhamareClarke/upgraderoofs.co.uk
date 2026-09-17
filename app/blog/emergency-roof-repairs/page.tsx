import type { Metadata } from 'next';
import { Calendar, User, Clock, ArrowRight, Phone, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Emergency Roof Repairs Cheshire | 24/7',
  description: 'Need emergency roof repairs in Cheshire? 24/7 storm damage response. Leaks, missing tiles, wind damage. Fast response across Sandbach, Crewe, Middlewich. Call 01270 897606.',
  keywords: 'emergency roof repairs Cheshire, storm damage roof, 24/7 roofer, roof leak emergency, urgent roof repair Sandbach Crewe',
  openGraph: {
    title: 'Emergency Roof Repairs Cheshire | 24/7 Response',
    description: 'Fast emergency roof repairs across Cheshire. Storm damage, leaks, missing tiles.',
    type: 'article',
    url: 'https://www.upgraderoofs.co.uk/blog/emergency-roof-repairs',
  },
  alternates: {
    canonical: 'https://www.upgraderoofs.co.uk/blog/emergency-roof-repairs',
  },
};

export default function EmergencyRoofRepairsPost() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative py-20 bg-gradient-to-r from-red-900/95 to-brand-navy/90">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-brand-orange mb-4">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">March 15, 2026</span>
              <span className="text-white/50">•</span>
              <User className="w-4 h-4" />
              <span className="text-sm">Upgrade Roofs Team</span>
              <span className="text-white/50">•</span>
              <Clock className="w-4 h-4" />
              <span className="text-sm">4 min read</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Emergency Roof Repairs in Cheshire: What to Do When Disaster Strikes
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl">
              Storm damage, sudden leaks, or fallen debris? Learn how to handle roofing emergencies 
              and when to call professional help. Available 24/7 across Cheshire.
            </p>
            <div className="flex flex-col items-start gap-2">
              <TrackedPhoneLink href="tel:01270897606" placement="blog_emergency_hero" className="inline-flex items-center gap-2 bg-brand-orange text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-orange/90 transition-colors">
                <Phone className="w-5 h-5" />
                Call Now: 01270 897606
              </TrackedPhoneLink>
              <CtaSubMessage dark />
            </div>
          </div>
        </div>
      </section>

      <article className="section-padding">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              <div className="mb-8">
                <Image
                  src="/images/1.jpeg"
                  alt="Emergency roof repair after storm damage in Cheshire"
                  width={800}
                  height={400}
                  className="rounded-xl shadow-lg w-full object-cover"
                />
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-8">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-red-800 font-semibold mb-2">Roof Emergency?</p>
                    <p className="text-red-700">
                      If you have an active leak or structural damage, call us immediately on <strong>01270 897606</strong>. 
                      We provide 24/7 emergency response across Sandbach, Crewe, Middlewich, Congleton, and all of Cheshire.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Emergency Guide</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">What Counts as a Roofing Emergency?</h2>
              </div>

              <p className="mb-4">
                Not every roof problem requires immediate attention, but these situations demand urgent professional help:
              </p>

              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li><strong>Active water leaks</strong> entering your property</li>
                <li><strong>Large sections of missing tiles or slates</strong> exposing the roof structure</li>
                <li><strong>Storm damage</strong> with visible holes or structural compromise</li>
                <li><strong>Fallen trees or debris</strong> on your roof</li>
                <li><strong>Chimney collapse or severe damage</strong></li>
                <li><strong>Sagging roof sections</strong> indicating structural failure</li>
              </ul>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">First Response</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Immediate Steps to Take</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                  <h3 className="font-semibold text-brand-navy mb-3">1. Ensure Safety First</h3>
                  <ul className="text-sm space-y-2">
                    <li>• Move family members away from affected areas</li>
                    <li>• Turn off electricity if water is near electrics</li>
                    <li>• Place buckets to catch dripping water</li>
                    <li>• Move valuable items to safety</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy">
                  <h3 className="font-semibold text-brand-navy mb-3">2. Document the Damage</h3>
                  <ul className="text-sm space-y-2">
                    <li>• Take photos and videos of all damage</li>
                    <li>• Note the time and weather conditions</li>
                    <li>• Keep damaged materials if safe to do so</li>
                    <li>• This helps with insurance claims</li>
                  </ul>
                </div>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">How We Respond</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Our Emergency Response Process</h2>
              </div>

              <p className="mb-4">
                When you call Upgrade Roofs for an emergency in Cheshire, here's what happens:
              </p>

              <ol className="list-decimal pl-6 mb-6 space-y-3">
                <li><strong>Immediate phone assessment</strong> to understand the severity</li>
                <li><strong>Rapid dispatch</strong> of our emergency team (usually within 1-2 hours)</li>
                <li><strong>Temporary weatherproofing</strong> to prevent further damage</li>
                <li><strong>Full damage assessment</strong> and repair quote</li>
                <li><strong>Insurance documentation</strong> provided if needed</li>
                <li><strong>Permanent repairs</strong> scheduled at your convenience</li>
              </ol>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Coverage Area</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Areas We Cover for Emergency Repairs</h2>
              </div>

              <p className="mb-4">
                Our emergency roofing team covers all of Cheshire and surrounding areas:
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {['Sandbach', 'Crewe', 'Middlewich', 'Congleton', 'Alsager', 'Nantwich', 'Holmes Chapel', 'Knutsford'].map((town) => (
                  <div key={town} className="bg-brand-navy/5 p-3 rounded-lg text-center">
                    <span className="font-medium text-brand-navy">{town}</span>
                  </div>
                ))}
              </div>

              <div className="bg-brand-navy text-white p-8 border-l-4 border-l-brand-orange mb-8">
                <h3 className="text-xl font-bold mb-4">24/7 Emergency Roof Repairs</h3>
                <p className="mb-4">
                  Don't wait for minor damage to become a major problem. Our experienced team is ready 
                  to respond to roofing emergencies across Cheshire, day or night.
                </p>
                <div className="flex flex-col items-center gap-2">
                  <TrackedPhoneLink href="tel:01270897606" placement="blog_emergency_cta" className="inline-flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                    <Phone className="w-5 h-5" />
                    01270 897606
                  </TrackedPhoneLink>
                  <CtaSubMessage dark />
                </div>
              </div>

              <div className="text-center max-w-2xl mx-auto mt-12 mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                  <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Prevention</span>
                  <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-4">Preventing Future Emergencies</h2>
              </div>

              <p className="mb-4">
                The best way to avoid emergency repairs is regular maintenance:
              </p>

              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>Annual professional roof inspections</li>
                <li>Regular gutter cleaning (twice yearly)</li>
                <li>Prompt repair of minor damage</li>
                <li>Trimming overhanging tree branches</li>
                <li>Checking roof after severe weather</li>
              </ul>

              <p className="mb-8">
                <Link href="/special-offer" className="text-brand-orange hover:underline font-semibold">
                  Book a FREE roof inspection
                </Link> today and identify potential problems before they become emergencies.
              </p>
            </div>

            {/* Money Page Links */}
            <div className="bg-brand-navy/5 border border-brand-navy/10 border-l-4 border-l-brand-navy p-6 mb-8">
              <h3 className="font-bold text-brand-navy mb-3">Need Emergency Help Now?</h3>
              <p className="text-gray-600 text-sm mb-3">
                Visit our <Link href="/emergency-roofing" className="text-brand-orange hover:underline font-medium">24/7 emergency roofing page</Link> for 
                immediate assistance. Based in Sandbach, we respond fast across all of Cheshire. For non-urgent issues, see our 
                <Link href="/roof-repairs" className="text-brand-orange hover:underline font-medium"> roof repair service</Link> or 
                browse <Link href="/roofers-sandbach" className="text-brand-orange hover:underline font-medium">roofers in Sandbach</Link> for 
                local case studies and reviews.
              </p>
            </div>

            <div className="border-t pt-8 mt-8">
              <h3 className="text-xl font-bold text-brand-navy mb-6">Related Articles</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Link href="/blog/roof-damage-signs" className="group">
                  <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy hover:border-brand-orange/50 hover:border-l-brand-orange transition-all">
                    <h4 className="font-semibold text-brand-navy group-hover:text-brand-orange mb-2">
                      How to Spot Roof Damage Before It Gets Expensive
                    </h4>
                    <p className="text-sm text-gray-600">
                      Learn the early warning signs of roof problems.
                    </p>
                  </div>
                </Link>
                <Link href="/blog/roof-damage-signs" className="group">
                  <div className="bg-gray-50 p-6 border border-gray-200 border-l-4 border-l-brand-navy hover:border-brand-orange/50 hover:border-l-brand-orange transition-all">
                    <h4 className="font-semibold text-brand-navy group-hover:text-brand-orange mb-2">
                      How to Spot Roof Damage Early
                    </h4>
                    <p className="text-sm text-gray-600">
                      Identify problems before they become emergencies.
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
