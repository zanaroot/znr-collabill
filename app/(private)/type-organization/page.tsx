import { OrganizationType } from "@/app/(private)/type-organization/_components/organization-type";

const TypeOrganizationPage = () => (
  <div
    className="page-container"
    style={{
      height: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      minWidth: 0,
    }}
  >
    <OrganizationType />
  </div>
);

export default TypeOrganizationPage;
