"use client";

import Script from "next/script";
import { publicEnv } from "@/packages/env";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CollaBill",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  description:
    "Collaborative billing and project management platform for teams and agencies",
  author: {
    "@type": "Organization",
    name: "CollaBill",
    url: publicEnv.NEXT_PUBLIC_APP_URL,
  },
};

export const LandingPageSEO = () => (
  <Script
    id="schema-software-app"
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
  />
);
