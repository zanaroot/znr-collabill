"use client";

import { Flex, Grid, Space } from "antd";
import type { AuthUser } from "@/http/models/auth.model";
import type { Period } from "@/http/models/period.model";
import type { InvoiceWithLines } from "@/http/repositories/invoice.repository";
import { InvoiceComments } from "./invoice-comments";
import { InvoicePrintable } from "./invoice-printable";
import type { PresenceSummary } from "./presence-summary-table";
import { PresenceSummaryTable } from "./presence-summary-table";
import type { RawTaskSummary } from "./task-summary-table";
import { TaskSummaryTable } from "./task-summary-table";

const { useBreakpoint } = Grid;

interface InvoiceContentWrapperProps {
  presenceSummary: PresenceSummary[];
  taskSummary: RawTaskSummary[];
  user: AuthUser;
  targetUserName?: string;
  targetUserId: string;
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
  user,
  targetUserName,
  targetUserId,
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
      </Space>
      <div style={{ width: isVertical ? "100%" : "50%" }}>
        <Space orientation="vertical" style={{ width: "100%" }} size="large">
          <InvoicePrintable
            presenceData={presenceSummary}
            taskData={taskSummary}
            organizationName={user.organizationName || "Organization"}
            organizationId={user.organizationId || ""}
            targetUserName={targetUserName}
            targetUserId={targetUserId}
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
