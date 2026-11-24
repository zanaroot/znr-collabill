import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Verify Email",
  robots: NOINDEX_ROBOTS,
};

const VerifyEmailLayout = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export default VerifyEmailLayout;
