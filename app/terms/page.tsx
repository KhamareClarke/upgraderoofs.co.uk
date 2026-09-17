import type { Metadata } from 'next';
import { FileText, AlertTriangle, Scale, CheckCircle, XCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Service Agreement',
  description: 'Read our terms and conditions for roofing services. Clear, transparent terms for all our roofing projects in Cheshire and surrounding areas.',
  keywords: 'terms and conditions, roofing terms, service agreement, Cheshire roofing terms, roofing contract',
  openGraph: {
    title: 'Terms and Conditions | Upgrade Roofs',
    description: 'Our service terms and conditions for roofing projects.',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/terms' },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-brand-grey to-white">
      <div className="container-custom section-padding">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4 justify-center">
              <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
              <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Legal Terms</span>
              <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-brand-navy mb-6">
              Terms and Conditions
            </h1>
            <p className="text-lg text-gray-600">
              Last updated: October 2024
            </p>
          </div>

          <div className="bg-white border border-gray-200 border-l-4 border-l-brand-navy p-8 md:p-12 space-y-8">
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-brand-orange" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">1. Introduction</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                These Terms and Conditions ("Terms") govern your use of the services and website of Upgrade Roofs, operated by UPGRADE ROOFS LTD. By engaging our services or using our website, you agree to be bound by these Terms. Please read them carefully before proceeding.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">2. Services</h2>
              </div>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>Upgrade Roofs provides professional roofing services including but not limited to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Roof installations, repairs, and replacements</li>
                  <li>Tile and slate roofing</li>
                  <li>Flat roofing systems</li>
                  <li>Chimney repairs and maintenance</li>
                  <li>Gutter and fascia installations</li>
                  <li>Emergency roofing services</li>
                  <li>Roof inspections and surveys</li>
                </ul>
                <p>All services are performed by qualified, insured professionals to the highest industry standards.</p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">3. Quotations and Pricing</h2>
              </div>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>All quotations are:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provided free of charge</li>
                  <li>Valid for 30 days from the date of issue</li>
                  <li>Based on information provided by the customer</li>
                  <li>Subject to site inspection and may be adjusted if conditions differ</li>
                  <li>Inclusive of VAT unless otherwise stated</li>
                  <li>Not binding until a formal contract is signed</li>
                </ul>
                <p>Prices may vary if additional work is required due to unforeseen circumstances discovered during the project.</p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">4. Payment Terms</h2>
              </div>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>Payment terms are as follows:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Deposit: 30% upon acceptance of quotation</li>
                  <li>Progress payment: 40% at midpoint of project (for large projects)</li>
                  <li>Final payment: Balance upon satisfactory completion</li>
                  <li>Payment methods: Bank transfer, credit/debit card, cash</li>
                  <li>Late payments may incur interest charges at 8% per annum above the Bank of England base rate</li>
                </ul>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">5. Warranties and Guarantees</h2>
              </div>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>We provide comprehensive warranties:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Workmanship: 10-year guarantee on all installations</li>
                  <li>Materials: Manufacturer warranties as applicable (typically 10-50 years)</li>
                  <li>Emergency repairs: 12-month guarantee</li>
                  <li>Guarantees are transferable to new property owners</li>
                  <li>Insurance-backed guarantees available upon request</li>
                </ul>
                <p>Warranties do not cover damage caused by extreme weather, third-party interference, or lack of maintenance.</p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">6. Cancellation Policy</h2>
              </div>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>Cancellation terms:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Cancellations more than 7 days before start: Full refund minus £100 admin fee</li>
                  <li>Cancellations 3-7 days before start: 50% of deposit refunded</li>
                  <li>Cancellations less than 3 days before start: No refund of deposit</li>
                  <li>If materials have been ordered, material costs are non-refundable</li>
                  <li>We reserve the right to cancel due to weather or safety concerns</li>
                </ul>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-cyan-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">7. Liability and Insurance</h2>
              </div>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>We maintain comprehensive insurance coverage:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Public Liability Insurance: £10 million</li>
                  <li>Employers' Liability Insurance: £10 million</li>
                  <li>Professional Indemnity Insurance: £5 million</li>
                </ul>
                <p>We are not liable for damage to property caused by access issues, hidden defects, or circumstances beyond our reasonable control.</p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">8. Customer Responsibilities</h2>
              </div>
              <div className="space-y-2 text-gray-700 leading-relaxed">
                <p>Customers are responsible for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Providing accurate information about the property and project</li>
                  <li>Ensuring clear access to work areas</li>
                  <li>Obtaining necessary permissions (planning, building regulations)</li>
                  <li>Protecting personal property and valuables</li>
                  <li>Informing us of any hazardous materials (asbestos, etc.)</li>
                  <li>Ensuring pets are secured during work hours</li>
                </ul>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">9. Dispute Resolution</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                In the event of a dispute, we encourage customers to contact us directly for resolution. If an amicable solution cannot be reached, disputes will be governed by English law and subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-pink-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">10. Modifications</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting on our website. Continued use of our services after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 leading-relaxed">
                For questions about these Terms and Conditions, please contact us at upgraderoofs@yahoo.com or call +44 7379 440583.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
