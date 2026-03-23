import { redirect } from "next/navigation";
import { getCurrentUser } from "@/http/actions/get-current-user";
import { getOrganizationMembers } from "@/http/repositories/organization.repository";
import { getPresenceSummaryByOrganization } from "@/http/repositories/presence.repository";
import { getValidatedTaskSummaryByOrganization } from "@/http/repositories/task.repository";
import { InvoicePrintable } from "./_components/invoice-printable";
import { MemberFilter } from "./_components/member-filter";
import {
  type PresenceSummary,
  PresenceSummaryTable,
} from "./_components/presence-summary-table";
import {
  type RawTaskSummary,
  TaskSummaryTable,
} from "./_components/task-summary-table";

export const InvoicesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) => {
  const user = await getCurrentUser();
  const { memberId } = await searchParams;

  if (!user || !user.organizationId) {
    return redirect("/");
  }

  const isOwner = user.organizationRole === "OWNER";
  const targetUserId = isOwner && memberId ? memberId : user.id;

  const [presenceSummary, taskSummary, members] = await Promise.all([
    getPresenceSummaryByOrganization(
      user.id,
      user.organizationId,
      targetUserId,
    ),
    getValidatedTaskSummaryByOrganization(
      user.id,
      user.organizationId,
      targetUserId,
    ),
    isOwner ? getOrganizationMembers(user.organizationId) : Promise.resolve([]),
  ]);

  const targetUserName =
    targetUserId === user.id
      ? user.name
      : members.find((m) => m.id === targetUserId)?.name;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-semibold">Invoices & Summary</h1>
      </div>

      {isOwner && (
        <div className="no-print">
          <MemberFilter members={members} currentUserId={user.id} />
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 no-print">
        <h2 className="text-lg font-medium mb-4">Daily Presence Summary</h2>
        <PresenceSummaryTable
          data={presenceSummary as unknown as PresenceSummary[]}
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 no-print">
        <h2 className="text-lg font-medium mb-4">Validated Tasks Summary</h2>
        <TaskSummaryTable data={taskSummary as unknown as RawTaskSummary[]} />
      </div>

      <InvoicePrintable
        presenceData={presenceSummary as unknown as PresenceSummary[]}
        taskData={taskSummary as unknown as RawTaskSummary[]}
        organizationName={user.organizationName || "Organization"}
        organizationId={user.organizationId}
        targetUserName={targetUserName}
      />
    </div>
  );
};

export default InvoicesPage;
