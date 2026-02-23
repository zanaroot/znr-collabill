import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/http/actions/get-current-user";

const AuthLayout = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUser();

  // If user is already in an organization, redirect to dashboard
  // EXCEPT if we are on the organization selection/creation pages
  if (user?.organizationId) {
    return redirect("/task-board");
  }

  return (
    <div className="flex items-center justify-center h-screen">{children}</div>
  );
};

export default AuthLayout;
