import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: March 2025</p>

        <div className="prose prose-gray space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              ChatAutoDMs (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Instagram automation platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">2. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-4">We collect information you provide directly:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Account information (email, name) when you sign up</li>
              <li>Instagram and Facebook account data when you connect via Meta OAuth</li>
              <li>Lead data (names, emails, phone numbers) captured through your automation flows</li>
              <li>Usage data and analytics related to your automations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed">
              We use your information to provide, maintain, and improve our services; process transactions; send you updates; and comply with legal obligations. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">4. Data Sharing</h2>
            <p className="text-gray-600 leading-relaxed">
              We share data only with service providers (Supabase, Stripe, Meta) necessary to operate our platform. We require these providers to protect your data and use it only for the purposes we specify.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">5. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption, secure authentication, and access controls.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">6. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              You may access, correct, or delete your personal data through your account settings. You may also contact us to exercise your rights under applicable privacy laws (e.g., GDPR, CCPA).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">7. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              For privacy-related questions, contact us at: <a href="mailto:likithm08922@gmail.com" className="text-blue-600 hover:underline">likithm08922@gmail.com</a>
            </p>
          </section>
        </div>

        <Link to="/" className="inline-block mt-12 text-blue-600 font-semibold hover:underline">← Back to Home</Link>
      </main>
    </div>
  );
};
