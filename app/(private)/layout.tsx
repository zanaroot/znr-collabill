import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/http/actions/get-current-user";
import {
  getOrganizationById,
  getUserOrganizations,
} from "@/http/repositories/organization.repository";
import { PrivateLayout as PrivateLayoutComponent } from "./_components/private-layout";

const PrivateLayout = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/");
  }

  if (!user.organizationId) {
    const userOrgs = await getUserOrganizations(user.id);
    if (userOrgs.length > 1) {
      return redirect("/select-organization");
    }
    return redirect("/create-organization");
  }

  const organization = await getOrganizationById(user.organizationId);

  return (
    <div>
      <PrivateLayoutComponent organization={organization}>
        {children}
      </PrivateLayoutComponent>
    </div>
  );
};

export default PrivateLayout;
