import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button } from "antd";
import Link from "next/link";
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
import { InvoiceDetailView } from "./_components/invoice-detail-view";
import { InvoiceHistoryTable } from "./_components/invoice-history-table";
import type { PresenceSummary } from "./_components/presence-summary-table";
import type { RawTaskSummary } from "./_components/task-summary-table";

const InvoicesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string; periodId?: string }>;
}) => {
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
    <div className="invoice-page">
      <div className="invoice-header no-print">
        <div className="flex items-center gap-4">
          {!showHistory && history.length > 0 && (
            <Link href="/invoices">
              <Button icon={<ArrowLeftOutlined />} type="text">
                Back
              </Button>
            </Link>
          )}
          <h1 className="text-2xl font-semibold dark:text-white">
            Invoices & Summary
          </h1>
        </div>
      </div>

      {showHistory ? (
        <InvoiceHistoryTable data={history} isOwner={isOwner} />
      ) : (
        <InvoiceDetailView
          presenceSummary={presenceSummary as unknown as PresenceSummary[]}
          taskSummary={taskSummary as unknown as RawTaskSummary[]}
          user={user}
          targetUserName={targetUserName}
          targetUserId={targetUserId}
          selectedPeriod={selectedPeriod}
          existingInvoice={existingInvoice}
          isOwner={isOwner}
          members={members}
        />
      )}
    </div>
  );
};

export default InvoicesPage;
