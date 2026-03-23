import { redirect } from "next/navigation";
import { getCurrentUser } from "@/http/actions/get-current-user";
import { getPresenceSummaryByOrganization } from "@/http/repositories/presence.repository";
import { getValidatedTaskSummaryByOrganization } from "@/http/repositories/task.repository";
import {
  type PresenceSummary,
  PresenceSummaryTable,
} from "./_components/presence-summary-table";
import {
  type RawTaskSummary,
  TaskSummaryTable,
} from "./_components/task-summary-table";

export const InvoicesPage = async () => {
  const user = await getCurrentUser();

  if (!user || !user.organizationId) {
    return redirect("/");
  }

  const [presenceSummary, taskSummary] = await Promise.all([
    getPresenceSummaryByOrganization(user.organizationId),
    getValidatedTaskSummaryByOrganization(user.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Invoices & Summary</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-medium mb-4">Daily Presence Summary</h2>
        <PresenceSummaryTable
          data={presenceSummary as unknown as PresenceSummary[]}
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-medium mb-4">Validated Tasks Summary</h2>
        <TaskSummaryTable data={taskSummary as unknown as RawTaskSummary[]} />
      </div>
    </div>
  );
};

export default InvoicesPage;
