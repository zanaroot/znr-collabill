import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/http/actions/get-current-user";
import { PrivateLayout as PrivateLayoutComponent } from "./_components/private-layout";
import { getOrganizations } from "@/http/repositories/user.repository";
const PrivateLayout = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/");
  }

  const organization = await getOrganizations(user.id);

  return (
    <div>
      <PrivateLayoutComponent organization={organization}>{children}</PrivateLayoutComponent>
    </div >
  );
};

export default PrivateLayout;
