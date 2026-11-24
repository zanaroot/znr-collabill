import type { Metadata } from "next";
import { JsonLd } from "@/app/_components/json-ld";
import { getCurrentUser } from "@/http/actions/get-current-user.action";
import { buildPageMetadata } from "@/lib/seo";
import { breadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { PricingPage } from "./_components/pricing-page";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Transparent pricing for CollaBill — start free and upgrade for unlimited members and projects. Compare plans for agencies, studios, and freelancers.",
  path: "/pricing",
  keywords: [
    "CollaBill pricing",
    "billing software pricing",
    "project billing plans",
    "freelancer invoicing pricing",
  ],
});

const structuredData = jsonLdGraph([
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Pricing", path: "/pricing" },
  ]),
]);

const PricingRoute = async () => {
  const user = await getCurrentUser();

  return (
    <>
      <JsonLd data={structuredData} />
      <PricingPage
        user={user ? { organizationRole: user.organizationRole } : null}
      />
    </>
  );
};

export default PricingRoute;
