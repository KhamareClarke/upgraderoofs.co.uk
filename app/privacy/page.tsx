import type { Metadata } from 'next';
import { Shield, Lock, Eye, FileText, Mail, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Your Data Protection',
  description: 'Read our comprehensive privacy policy. Learn how Upgrade Roofs collects, uses, and protects your personal information. GDPR compliant and transparent data practices.',
  keywords: 'privacy policy, data protection, GDPR, roofing company privacy, Cheshire roofing data policy',
  openGraph: {
    title: 'Privacy Policy | Upgrade Roofs',
    description: 'Our commitment to protecting your personal information and data privacy.',
    type: 'website',
  },
  alternates: { canonical: 'https://www.upgraderoofs.co.uk/privacy' },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-brand-grey to-white">
      <div className="container-custom section-padding">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4 justify-center">
              <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
              <span className="text-brand-orange text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">Your Privacy Matters</span>
              <span className="h-px w-8 sm:w-12 bg-brand-orange" aria-hidden="true" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-brand-navy mb-6">
              Privacy Policy
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
                Upgrade Roofs, operated by UPGRADE ROOFS LTD ("we", "our", or "us"), is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services. We are based in Sandbach, Cheshire, UK, and comply with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">2. Information We Collect</h2>
              </div>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <div>
                  <h3 className="font-semibold text-brand-navy mb-2">Personal Information:</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Name and contact details (email address, phone number, postal address)</li>
                    <li>Property information (address, type of property)</li>
                    <li>Project details and service requests</li>
                    <li>Communication preferences</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-brand-navy mb-2">Automatically Collected Information:</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>IP address and browser type</li>
                    <li>Device information and operating system</li>
                    <li>Pages visited and time spent on our website</li>
                    <li>Referring website addresses</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">3. How We Use Your Information</h2>
              </div>
              <div className="space-y-2 text-gray-700 leading-relaxed">
                <p>We use your information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and manage our roofing services</li>
                  <li>Respond to your inquiries and quote requests</li>
                  <li>Send service updates and project communications</li>
                  <li>Improve our website and customer experience</li>
                  <li>Comply with legal obligations</li>
                  <li>Send marketing communications (with your consent)</li>
                  <li>Process payments and maintain financial records</li>
                </ul>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">4. Data Security</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes secure servers, encrypted communications, and regular security audits. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">5. Your Rights</h2>
              </div>
              <div className="space-y-2 text-gray-700 leading-relaxed">
                <p>Under UK GDPR, you have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate personal data</li>
                  <li>Request erasure of your personal data</li>
                  <li>Object to processing of your personal data</li>
                  <li>Request restriction of processing</li>
                  <li>Data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-cyan-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">6. Cookies</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Our website uses cookies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie settings through your browser preferences. Essential cookies are necessary for the website to function properly.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">7. Third-Party Services</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                We may share your information with trusted third-party service providers who assist us in operating our website, conducting our business, or servicing you. These parties are contractually obligated to keep your information confidential and use it only for the purposes we specify.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-brand-navy">8. Contact Us</h2>
              </div>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:</p>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-brand-orange" />
                  <span>Email: upgraderoofs@yahoo.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-brand-orange" />
                  <span>Phone: +44 7379 440583</span>
                </div>
              </div>
            </section>

            <section className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 leading-relaxed">
                We reserve the right to update this Privacy Policy at any time. Changes will be posted on this page with an updated revision date. We encourage you to review this Privacy Policy periodically for any changes.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
