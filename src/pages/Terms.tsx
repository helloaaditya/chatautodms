import React from 'react';
import { LegalPageLayout } from '../components/LegalPageLayout';
import { CONTACT_EMAIL, BRAND_NAME, BUSINESS_NAME } from '../lib/constants';

export const TermsOfService: React.FC = () => {
  return (
    <LegalPageLayout title="Terms of Service">
      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          {BRAND_NAME} is the brand of {BUSINESS_NAME} (registered company). By accessing or using our <strong>Instagram automation</strong> service, you agree to be bound by these Terms of Service. If you do not agree, do not use our services.
        </p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>
          {BRAND_NAME} provides <strong>Instagram-only</strong> automation tools, including auto-replies to comments and DMs, lead capture, and analytics. Our service is not a Facebook product; we use Instagram&apos;s official APIs. You must comply with Instagram&apos;s policies and Meta&apos;s Platform Terms when using our service.
        </p>
      </section>

      <section>
        <h2>3. User Responsibilities</h2>
        <p>
          You are responsible for your use of the service, the content of your automations, and ensuring compliance with applicable laws and Instagram&apos;s community guidelines. You must not use the service for spam, harassment, or illegal activities.
        </p>
      </section>

      <section>
        <h2>4. Subscription and Payments</h2>
        <p>
          Paid plans are billed as described on our pricing page. You may cancel at any time. Refunds are subject to our refund policy.
        </p>
      </section>

      <section>
        <h2>5. Limitation of Liability</h2>
        <p>
          {BRAND_NAME} is provided &quot;as is&quot;. We are not liable for indirect, incidental, or consequential damages arising from your use of the service.
        </p>
      </section>

      <section>
        <h2>6. Contact</h2>
        <p>
          For questions about these terms, contact us at: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>
    </LegalPageLayout>
  );
};
