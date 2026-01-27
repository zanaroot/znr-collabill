import { ReactNode } from "react";
import { PrivateLayout as PrivateLayoutComponent } from "./_components/private-layout";

const PrivateLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div>
      <PrivateLayoutComponent>{children}</PrivateLayoutComponent>
    </div>
  );
};

export default PrivateLayout;
