"use client";

import { Flex, Grid, Space } from "antd";
import type { AuthUser } from "@/http/models/auth.model";
import type { Period } from "@/http/models/period.model";
import type { InvoiceWithLines } from "@/http/repositories/invoice.repository";
import { InvoiceComments } from "./invoice-comments";
import { InvoicePrintable } from "./invoice-printable";
import type { PresenceSummary } from "./presence-summary-table";
import { PresenceSummaryTable } from "./presence-summary-table";
import type { RawTaskSummary, ReviewerTaskSummary } from "./task-summary-table";
import { TaskSummaryTable } from "./task-summary-table";

const { useBreakpoint } = Grid;

interface InvoiceContentWrapperProps {
  presenceSummary: PresenceSummary[];
  taskSummary: RawTaskSummary[];
  reviewerTaskSummary: ReviewerTaskSummary[];
  user: AuthUser;
  targetUserName?: string;
  targetUserId: string;
  targetUserPhoneNumber?: string | null;
  targetUserPhoneOwnerName?: string | null;
  selectedPeriod: Period;
  existingInvoice: InvoiceWithLines | null;
  isOwner: boolean;
  customLines?: Array<{ label: string; amount: string; key: string }>;
  onCustomLinesChange?: (
    lines: Array<{ label: string; amount: string; key: string }>,
  ) => void;
}

export const InvoiceContentWrapper = ({
  presenceSummary,
  taskSummary,
  reviewerTaskSummary,
  user,
  targetUserName,
  targetUserId,
  targetUserPhoneNumber,
  targetUserPhoneOwnerName,
  selectedPeriod,
  existingInvoice,
  isOwner,
  customLines,
  onCustomLinesChange,
}: InvoiceContentWrapperProps) => {
  const screens = useBreakpoint();

  const isVertical = !screens.xl;

  return (
    <Flex
      justify="space-between"
      gap={24}
      style={{ width: "100%" }}
      vertical={isVertical}
    >
      <Space
        orientation="vertical"
        size={24}
        style={{ width: "100%", flex: 1 }}
      >
        <div className="invoice-summary-item">
          <h2 className="text-lg font-medium mb-4 dark:text-white">
            Daily Presence Summary
          </h2>
          <div className="table-responsive">
            <PresenceSummaryTable data={presenceSummary} />
          </div>
        </div>

        {taskSummary.length > 0 && (
          <div className="invoice-summary-item">
            <h2 className="text-lg font-medium mb-4 dark:text-white">
              Validated Tasks Summary
            </h2>
            <div className="table-responsive">
              <TaskSummaryTable data={taskSummary} />
            </div>
          </div>
        )}

        {reviewerTaskSummary.length > 0 && (
          <div className="invoice-summary-item">
            <h2 className="text-lg font-medium mb-4 dark:text-white">
              Reviewer Tasks Summary
            </h2>
            <div className="table-responsive">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="border p-2 text-left dark:border-gray-700 dark:text-white">
                      Project
                    </th>
                    <th className="border p-2 text-right dark:border-gray-700 dark:text-white">
                      Tasks
                    </th>
                    <th className="border p-2 text-right dark:border-gray-700 dark:text-white">
                      Rate
                    </th>
                    <th className="border p-2 text-right dark:border-gray-700 dark:text-white">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reviewerTaskSummary.map((rt) => (
                    <tr
                      key={`${rt.projectId}-${rt.userId}`}
                      className="dark:border-gray-700"
                    >
                      <td className="border p-2 dark:border-gray-700 dark:text-white">
                        {rt.projectName}
                      </td>
                      <td className="border p-2 text-right dark:border-gray-700 dark:text-white">
                        {rt.taskCount}
                      </td>
                      <td className="border p-2 text-right dark:border-gray-700 dark:text-white">
                        ${rt.projectReviewerRate || 0}
                      </td>
                      <td className="border p-2 text-right dark:border-gray-700 dark:text-white">
                        $
                        {(
                          rt.taskCount * Number(rt.projectReviewerRate || 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Space>
      <div style={{ width: isVertical ? "100%" : "50%" }}>
        <Space orientation="vertical" style={{ width: "100%" }} size="large">
          <InvoicePrintable
            presenceData={presenceSummary}
            taskData={taskSummary}
            reviewerTaskData={reviewerTaskSummary}
            organizationName={user.organizationName || "Organization"}
            organizationId={user.organizationId || ""}
            targetUserName={targetUserName}
            targetUserId={targetUserId}
            targetUserPhoneNumber={targetUserPhoneNumber}
            targetUserPhoneOwnerName={targetUserPhoneOwnerName}
            periodId={selectedPeriod.id}
            periodStart={selectedPeriod.startDate}
            periodEnd={selectedPeriod.endDate}
            periodName={selectedPeriod.name}
            existingInvoice={existingInvoice}
            isOwner={isOwner}
            customLines={customLines}
            onCustomLinesChange={onCustomLinesChange}
          />
          <InvoiceComments invoiceId={existingInvoice?.id ?? null} />
        </Space>
      </div>
    </Flex>
  );
};
