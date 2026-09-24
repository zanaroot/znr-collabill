import { Dashboard } from "@/app/(private)/dashboard/_components/dashboard-form";

const DashboardPage = () => {
  return (
    <div
      className="page-container"
      style={{
        height: "100%",
        overflowY: "auto",
      }}
    >
      <Dashboard />
    </div>
  );
};

export default DashboardPage;
