import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Sentry Example",
  robots: NOINDEX_ROBOTS,
};

const SentryExampleLayout = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export default SentryExampleLayout;
