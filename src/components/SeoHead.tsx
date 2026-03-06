import React, { useEffect } from 'react';
import { SITE_URL, BRAND_NAME, BUSINESS_NAME, CONTACT_EMAIL, SITE_DESCRIPTION } from '../lib/constants';

/** JSON-LD schema for Organization + WebSite (used on landing and legal pages) */
export function OrganizationWebSiteSchema() {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
          name: BRAND_NAME,
          legalName: BUSINESS_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/grow-creation-logo.png`,
          email: CONTACT_EMAIL,
          description: SITE_DESCRIPTION,
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: SITE_URL,
          name: BRAND_NAME,
          description: SITE_DESCRIPTION,
          publisher: { '@id': `${SITE_URL}/#organization` },
          inLanguage: 'en-IN',
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', url: `${SITE_URL}/login` },
            'query-input': 'required name=query',
          },
        },
      ],
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);
  return null;
}

/** FAQ schema + optional SoftwareApplication for product page */
export function FaqSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  useEffect(() => {
    if (!faqs?.length) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      })),
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [faqs]);
  return null;
}

/** SoftwareApplication schema for the product (landing) */
export function SoftwareApplicationSchema() {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: BRAND_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
      },
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);
  return null;
}
