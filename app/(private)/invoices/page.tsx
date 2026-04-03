import { Flex, Space } from "antd";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/http/actions/get-current-user.action";
import {
  findInvoiceByPeriodAndUser,
  findInvoicesWithUsersByOrganizationId,
} from "@/http/repositories/invoice.repository";
import { getOrganizationMembers } from "@/http/repositories/organization.repository";
import { getPresenceSummaryByOrganization } from "@/http/repositories/presence.repository";
import { getValidatedTaskSummaryByOrganization } from "@/http/repositories/task.repository";
import { getCurrentPeriod, getPeriodById } from "@/lib/periods";
import { InvoiceComments } from "./_components/invoice-comments";
import { InvoiceFilters } from "./_components/invoice-filters";
import { InvoiceHistoryTable } from "./_components/invoice-history-table";
import { InvoicePrintable } from "./_components/invoice-printable";
import {
  type PresenceSummary,
  PresenceSummaryTable,
} from "./_components/presence-summary-table";
import {
  type RawTaskSummary,
  TaskSummaryTable,
} from "./_components/task-summary-table";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string; periodId?: string }>;
}) {
  const user = await getCurrentUser();
  const { memberId, periodId } = await searchParams;

  if (!user || !user.organizationId) {
    return redirect("/");
  }

  const isOwner = user.organizationRole === "OWNER";
  const targetUserId = isOwner && memberId ? memberId : user.id;

  const currentPeriod = getCurrentPeriod();
  const selectedPeriod =
    getPeriodById(periodId || currentPeriod.id) || currentPeriod;

  const [presenceSummary, taskSummary, members, existingInvoice, history] =
    await Promise.all([
      getPresenceSummaryByOrganization(
        user.id,
        user.organizationId,
        targetUserId,
        selectedPeriod.startDate,
        selectedPeriod.endDate,
      ),
      getValidatedTaskSummaryByOrganization(
        user.id,
        user.organizationId,
        targetUserId,
        selectedPeriod.startDate
          ? new Date(selectedPeriod.startDate)
          : undefined,
        selectedPeriod.endDate ? new Date(selectedPeriod.endDate) : undefined,
      ),
      isOwner
        ? getOrganizationMembers(user.organizationId)
        : Promise.resolve([]),
      findInvoiceByPeriodAndUser(
        selectedPeriod.startDate,
        selectedPeriod.endDate,
        targetUserId,
        user.organizationId,
      ),
      findInvoicesWithUsersByOrganizationId(
        user.organizationId,
        isOwner ? undefined : user.id,
      ),
    ]);

  const targetUserName =
    targetUserId === user.id
      ? user.name
      : members.find((m) => m.id === targetUserId)?.name;

  const showHistory = !periodId && !memberId && history.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-semibold dark:text-white">
          Invoices & Summary
        </h1>
      </div>
      <div className="no-print flex flex-col gap-4">
        <InvoiceFilters
          members={members}
          currentUserId={user.id}
          showMemberFilter={isOwner}
          organizationId={user.organizationId}
          targetUserId={targetUserId}
          periodStart={selectedPeriod.startDate}
          periodEnd={selectedPeriod.endDate}
          existingInvoice={existingInvoice}
          isOwner={isOwner}
          presenceData={presenceSummary as unknown as PresenceSummary[]}
          taskData={taskSummary as unknown as RawTaskSummary[]}
        />
      </div>

      {showHistory ? (
        <InvoiceHistoryTable data={history} isOwner={isOwner} />
      ) : (
        <Flex justify="space-between" gap={24}>
          <Space orientation="vertical" style={{ width: "50%", flex: 1 }}>
            <div className="bg-white dark:bg-card p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 no-print">
              <h2 className="text-lg font-medium mb-4 dark:text-white">
                Daily Presence Summary
              </h2>
              <PresenceSummaryTable
                data={presenceSummary as unknown as PresenceSummary[]}
              />
            </div>
            {taskSummary.length > 0 && (
              <div className="bg-white dark:bg-card p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 no-print">
                <h2 className="text-lg font-medium mb-4 dark:text-white">
                  Validated Tasks Summary
                </h2>
                <TaskSummaryTable
                  data={taskSummary as unknown as RawTaskSummary[]}
                />
              </div>
            )}
          </Space>
          <Space orientation="vertical">
            <InvoicePrintable
              presenceData={presenceSummary as unknown as PresenceSummary[]}
              taskData={taskSummary as unknown as RawTaskSummary[]}
              organizationName={user.organizationName || "Organization"}
              organizationId={user.organizationId}
              targetUserName={targetUserName}
              targetUserId={targetUserId}
              periodId={selectedPeriod.id}
              periodStart={selectedPeriod.startDate}
              periodEnd={selectedPeriod.endDate}
              periodName={selectedPeriod.name}
              existingInvoice={existingInvoice}
              isOwner={isOwner}
            />
            <InvoiceComments invoiceId={existingInvoice?.id ?? null} />
          </Space>
        </Flex>
      )}
    </div>
  );
}
