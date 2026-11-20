"use client";

import { Spin } from "antd";
import { AmountsVisibilityProvider } from "../_components/amounts-visibility-provider";
import RateSettingsPanel from "./_components/rateSettingsPanel";
import { useMyOrganizations } from "./hook/useMyOrganizations";

const RateSettingsPage = () => {
  const { data: organizations, isLoading } = useMyOrganizations();

  const organization = organizations?.[0];

  if (isLoading || !organization?.id) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin size="large" />
      </div>
    );
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
