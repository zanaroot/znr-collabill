"use client";

import RateSettingsPanel from "./_components/rateSettingsPanel";
import { useMyOrganizations } from "./hook/useMyOrganizations";

const RateSettingsPage = () => {
  const { data: organizations, isLoading } = useMyOrganizations();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const organization = organizations?.[0];

  if (!organization?.id) {
    return <div>No organization found</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <RateSettingsPanel organizationId={organization.id} />
    </div>
  );
};

export default RateSettingsPage;
