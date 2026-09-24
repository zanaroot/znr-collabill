"use client";

import { AmountsVisibilityProvider } from "../_components/amounts-visibility-provider";
import RateSettingsPanel from "./_components/rateSettingsPanel";
import { useMyOrganizations } from "./hook/useMyOrganizations";

const RateSettingsPage = () => {
  const { data: organizations } = useMyOrganizations();

  const organization = organizations?.[0];

  if (!organization?.id) {
    return <div>No organization found</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <AmountsVisibilityProvider>
        <RateSettingsPanel organizationId={organization.id} />
      </AmountsVisibilityProvider>
    </div>
  );
};

export default RateSettingsPage;
