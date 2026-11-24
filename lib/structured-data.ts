import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

type SchemaNode = Record<string, unknown>;

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

const organizationId = `${SITE_URL}/#organization`;

export const jsonLdGraph = (nodes: SchemaNode[]) => ({
  "@context": "https://schema.org",
  "@graph": nodes,
});

export const organizationSchema: SchemaNode = {
  "@type": "Organization",
  "@id": organizationId,
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
};

export const websiteSchema: SchemaNode = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  inLanguage: "en",
  publisher: {
    "@id": organizationId,
  },
};

export const softwareApplicationSchema: SchemaNode = {
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Project Management",
  operatingSystem: "Web",
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  publisher: {
    "@id": organizationId,
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: absoluteUrl("/pricing"),
  },
  featureList: [
    "Kanban project management",
    "Task tracking and validation",
    "Automated monthly invoices",
    "Collaborator rate management",
    "Attendance and presence tracking",
    "Team collaboration and meetings",
  ],
};

export const breadcrumbSchema = (items: BreadcrumbItem[]): SchemaNode => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const faqPageSchema = (items: FaqItem[]): SchemaNode => ({
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
});
