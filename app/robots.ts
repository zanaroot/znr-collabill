import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const disallowedPaths = [
  "/api/",
  "/monitoring",
  "/back-office",
  "/dashboard",
  "/invoices",
  "/leave-management",
  "/meetings",
  "/projects",
  "/rates",
  "/task-board",
  "/team-management",
  "/type-organization",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/create-account",
  "/create-organization",
  "/select-organization",
  "/verify-email",
  "/meet/",
  "/sentry-example-page",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowedPaths,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
