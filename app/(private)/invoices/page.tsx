import { redirect } from "next/navigation";
import { getCurrentUser } from "@/http/actions/get-current-user";
import { getOrganizationMembers } from "@/http/repositories/organization.repository";
import { getPresenceSummaryByOrganization } from "@/http/repositories/presence.repository";
import { getValidatedTaskSummaryByOrganization } from "@/http/repositories/task.repository";
import { findIterationById, findIterationsByOrganizationId } from "@/http/repositories/iteration.repository";
import { findInvoiceByIterationAndUser } from "@/http/repositories/invoice.repository";
import { InvoicePrintable } from "./_components/invoice-printable";
import { MemberFilter } from "./_components/member-filter";
import { IterationFilter } from "./_components/iteration-filter";
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
  searchParams: Promise<{ memberId?: string; iterationId?: string }>;
}) => {
  const user = await getCurrentUser();
  const { memberId, iterationId } = await searchParams;

  if (!user || !user.organizationId) {
    return redirect("/");
  }

  const isOwner = user.organizationRole === "OWNER";
  const targetUserId = isOwner && memberId ? memberId : user.id;

  const [iterations, selectedIteration] = await Promise.all([
    findIterationsByOrganizationId(user.organizationId),
    iterationId ? findIterationById(iterationId) : Promise.resolve(null),
  ]);

  const [presenceSummary, taskSummary, members, existingInvoice] = await Promise.all([
    getPresenceSummaryByOrganization(
      user.id,
      user.organizationId,
      targetUserId,
      selectedIteration?.startDate,
      selectedIteration?.endDate,
    ),
    getValidatedTaskSummaryByOrganization(
      user.id,
      user.organizationId,
      targetUserId,
      iterationId,
    ),
    isOwner ? getOrganizationMembers(user.organizationId) : Promise.resolve([]),
    iterationId ? findInvoiceByIterationAndUser(iterationId, targetUserId) : Promise.resolve(null),
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

      <div className="no-print flex flex-col gap-4">
        <IterationFilter iterations={iterations} />
        {isOwner && (
          <MemberFilter members={members} currentUserId={user.id} />
        )}
      </div>

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
        targetUserId={targetUserId}
        iterationId={iterationId}
        periodStart={selectedIteration?.startDate}
        periodEnd={selectedIteration?.endDate}
        iterationName={selectedIteration?.name}
        existingInvoice={existingInvoice}
      />
    </div>
  );
};

export default InvoicesPage;
