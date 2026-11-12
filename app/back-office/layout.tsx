import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/http/actions/get-current-user.action";
import { BackOfficeLayout } from "./_components/back-office-layout";

const BackOfficeRouteLayout = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/sign-in?redirect=/back-office");
  }

  if (user.platformRole !== "PLATFORM_ADMIN") {
    return redirect("/");
  }

  return (
    <BackOfficeLayout userName={user.name} userEmail={user.email}>
      {children}
    </BackOfficeLayout>
  );
};

export default BackOfficeRouteLayout;
