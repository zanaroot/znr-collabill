import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SentryErrorBoundary } from "@/app/_components/sentry-error-boundary";
import { SentryProvider } from "@/app/sentry-povider";
import { getCurrentUser } from "@/http/actions/get-current-user.action";
import {
  getOrganizationById,
  getUserOrganizations,
} from "@/http/repositories/organization.repository";
import { findPresenceByUserIdAndDate } from "@/http/repositories/presence.repository";
import { getISODate } from "@/lib/date";
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

  const todayPresence = await findPresenceByUserIdAndDate(
    user.id,
    user.organizationId,
    getISODate(),
  );
  const isMissingPresence = !todayPresence;

  return (
    <div>
      <SentryProvider>
        <SentryErrorBoundary>
          <PrivateLayoutComponent
            organization={organization}
            isMissingPresence={isMissingPresence}
          >
            {children}
          </PrivateLayoutComponent>
        </SentryErrorBoundary>
      </SentryProvider>
    </div>
  );
};

export default PrivateLayout;
