import React from 'react';
import { LegalPageLayout } from '../components/LegalPageLayout';
import { CONTACT_EMAIL, BRAND_NAME, BUSINESS_NAME } from '../lib/constants';

export const PrivacyPolicy: React.FC = () => {
  return (
    <LegalPageLayout title="Privacy Policy">
      <section>
        <h2>1. Introduction</h2>
        <p>
          {BRAND_NAME} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is the brand of {BUSINESS_NAME}, a registered company. We operate an <strong>Instagram automation platform</strong> only. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <p className="mb-2">We collect information you provide directly:</p>
        <ul>
          <li>Account information (email, name) when you sign up</li>
          <li>Instagram account data when you connect your Instagram Business or Creator account (via Meta&apos;s official APIs for Instagram)</li>
          <li>Lead data (names, messages) captured through your Instagram automation flows</li>
          <li>Usage data and analytics related to your automations</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Your Information</h2>
        <p>
          We use your information to provide, maintain, and improve our Instagram automation services; process transactions; send you updates; and comply with legal obligations. We do not sell your personal information to third parties.
        </p>
      </section>

      <section>
        <h2>4. Data Sharing</h2>
        <p>
          We share data only with service providers (e.g. Supabase, Stripe, and Meta for Instagram API access) necessary to operate our platform. We require these providers to protect your data and use it only for the purposes we specify.
        </p>
      </section>

      <section>
        <h2>5. Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your data, including encryption, secure authentication, and access controls.
        </p>
      </section>

      <section>
        <h2>6. Your Rights</h2>
        <p>
          You may access, correct, or delete your personal data through your account settings. You may also contact us to exercise your rights under applicable privacy laws (e.g. GDPR, CCPA).
        </p>
      </section>

      <section>
        <h2>7. Contact Us</h2>
        <p>
          For privacy-related questions, contact us at: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>
    </LegalPageLayout>
  );
};
