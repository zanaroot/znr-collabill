import { getCurrentUser } from "@/https/controllers/get-current-user";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { PrivateLayout as PrivateLayoutComponent } from "./_components/private-layout";

const PrivateLayout = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/");
  }

  return (
    <div>
      <PrivateLayoutComponent>{children}</PrivateLayoutComponent>
    </div>
  );
};

export default PrivateLayout;
