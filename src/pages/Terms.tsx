import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 px-8 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold">ChatAutoDMs</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: March 2025</p>

        <div className="prose prose-gray space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using ChatAutoDMs, you agree to be bound by these Terms of Service. If you do not agree, do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              ChatAutoDMs provides Instagram automation tools, including auto-replies, lead capture, and analytics. You must comply with Meta&apos;s Platform Terms and Instagram&apos;s policies when using our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">3. User Responsibilities</h2>
            <p className="text-gray-600 leading-relaxed">
              You are responsible for your use of the service, the content of your automations, and ensuring compliance with applicable laws. You must not use the service for spam, harassment, or illegal activities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">4. Subscription and Payments</h2>
            <p className="text-gray-600 leading-relaxed">
              Paid plans are billed via Stripe. You may cancel at any time. Refunds are subject to our refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">5. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              ChatAutoDMs is provided &quot;as is&quot;. We are not liable for indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">6. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about these terms, contact us at: <a href="mailto:likithm08922@gmail.com" className="text-blue-600 hover:underline">likithm08922@gmail.com</a>
            </p>
          </section>
        </div>

        <Link to="/" className="inline-block mt-12 text-blue-600 font-semibold hover:underline">← Back to Home</Link>
      </main>
    </div>
  );
};
