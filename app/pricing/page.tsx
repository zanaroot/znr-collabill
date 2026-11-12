import type { Metadata } from "next";
import { getCurrentUser } from "@/http/actions/get-current-user.action";
import { PricingPage } from "./_components/pricing-page";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Transparent pricing for CollaBill — start free and upgrade for unlimited members and projects.",
};

const PricingRoute = async () => {
  const user = await getCurrentUser();

  return (
    <PricingPage
      user={user ? { organizationRole: user.organizationRole } : null}
    />
  );
};

export default PricingRoute;
