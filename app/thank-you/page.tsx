import type { Metadata } from 'next';
import { CheckCircle, Phone, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackedPhoneLink } from '@/components/TrackedPhoneLink';
import { ThankYouConversion } from '@/components/ThankYouConversion';
import { CtaSubMessage } from '@/components/CtaSubMessage';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Thank You | Free Roof Inspection Booked',
  description: 'Thank you for booking your free roof inspection. Our expert team will contact you within 10 minutes to arrange your appointment.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-grey to-white flex items-center justify-center">
      <ThankYouConversion />
      <div className="container-custom py-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Main Message */}
          <h1 className="text-4xl md:text-5xl font-bold text-brand-navy mb-6">
            Thank You!
          </h1>
          
          <div className="bg-white border border-gray-200 border-l-4 border-l-brand-navy p-8 mb-8">
            <h2 className="text-2xl font-bold text-brand-navy mb-4">
              Your Free Roof Inspection is Booked!
            </h2>
            
            <p className="text-lg text-gray-700 mb-6">
              Our roofing expert will call you within <strong className="text-brand-orange">10 minutes</strong> to 
              arrange your free inspection at a time that suits you.
            </p>

            {/* What Happens Next */}
            <div className="text-left space-y-4 mb-8">
              <h3 className="font-bold text-brand-navy mb-4">What happens next:</h3>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-brand-orange text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-semibold">Quick Call (Within 10 minutes)</p>
                  <p className="text-sm text-gray-600">We'll call to confirm your details and arrange a convenient time</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-brand-orange text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                <div>
                  <p className="font-semibold">Professional Inspection</p>
                  <p className="text-sm text-gray-600">Our certified roofer will conduct a thorough inspection of your roof</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-brand-orange text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                <div>
                  <p className="font-semibold">Detailed Report & Quote</p>
                  <p className="text-sm text-gray-600">You'll receive a comprehensive report with transparent pricing</p>
                </div>
              </div>
            </div>

            {/* Contact Options */}
            <div className="border-t pt-6">
              <p className="text-sm text-gray-600 mb-4">
                Need to speak to us immediately? Contact us directly:
              </p>
              <div className="flex flex-col items-center gap-2">
                <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold" asChild>
                  <TrackedPhoneLink href="tel:01270897606" placement="thank_you_page">
                    <Phone className="w-4 h-4 mr-2" />
                    Call 01270 897 606
                  </TrackedPhoneLink>
                </Button>
                <CtaSubMessage dark={false} />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy">
              <Clock className="w-8 h-8 text-brand-orange mx-auto mb-3" />
              <h3 className="font-bold text-brand-navy mb-2">Quick Response</h3>
              <p className="text-sm text-gray-600">We'll call you within 10 minutes during business hours</p>
            </div>
            <div className="bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-bold text-brand-navy mb-2">No Obligation</h3>
              <p className="text-sm text-gray-600">Free inspection with no pressure to buy anything</p>
            </div>
            <div className="bg-white p-6 border border-gray-200 border-l-4 border-l-brand-navy">
              <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-bold text-brand-navy mb-2">Expert Service</h3>
              <p className="text-sm text-gray-600">25+ years experience with fully insured professionals</p>
            </div>
          </div>

          {/* Social Proof */}
          <div className="bg-brand-navy text-white p-6 border-l-4 border-l-brand-orange mb-8">
            <h3 className="font-bold mb-4">Join 1,000+ Happy Customers</h3>
            <div className="flex justify-center items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-sm">Average 5-star rating from Google Reviews</p>
          </div>

          {/* Navigation */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              While you wait, learn more about our services:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/services/roof-repairs">
                  Roof Repairs
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/services/flat-roofing">
                  Flat Roofing
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/gallery">
                  Our Work
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
