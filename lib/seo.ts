import type { Metadata } from "next";
import { publicEnv } from "@/packages/env";

export const SITE_NAME = "CollaBill";
export const SITE_URL = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
export const TWITTER_HANDLE = "@collabill";

export const DEFAULT_TITLE =
  "CollaBill - Collaborative Billing & Project Management for Teams";
export const DEFAULT_DESCRIPTION =
  "CollaBill helps agencies and freelancers manage projects, track tasks, and automate invoicing. Simplify collaborator billing with automatic monthly invoices.";

export const INDEXABLE_ROBOTS: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

export const NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

export const absoluteUrl = (path = "/"): string =>
  new URL(path, `${SITE_URL}/`).toString();

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
};

export const buildPageMetadata = ({
  title,
  description,
  path,
  keywords,
}: PageMetadataInput): Metadata => {
  const url = absoluteUrl(path);
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      creator: TWITTER_HANDLE,
    },
    robots: INDEXABLE_ROBOTS,
  };
};
