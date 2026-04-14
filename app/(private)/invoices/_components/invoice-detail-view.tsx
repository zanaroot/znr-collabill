"use client";

import { useMemo, useState } from "react";
import type { AuthUser } from "@/http/models/auth.model";
import type { Period } from "@/http/models/period.model";
import type { InvoiceWithLines } from "@/http/repositories/invoice.repository";
import { InvoiceContentWrapper } from "./invoice-content-wrapper";
import { InvoiceFilters } from "./invoice-filters";
import type { PresenceSummary } from "./presence-summary-table";
import type { RawTaskSummary } from "./task-summary-table";

interface Member {
  id: string;
  name: string;
  role: string;
}

interface InvoiceDetailViewProps {
  presenceSummary: PresenceSummary[];
  taskSummary: RawTaskSummary[];
  user: AuthUser;
  targetUserName?: string;
  targetUserId: string;
  selectedPeriod: Period;
  existingInvoice: InvoiceWithLines | null;
  isOwner: boolean;
  members: Member[];
}

export const InvoiceDetailView = ({
  presenceSummary,
  taskSummary,
  user,
  targetUserName,
  targetUserId,
  selectedPeriod,
  existingInvoice,
  isOwner,
  members,
}: InvoiceDetailViewProps) => {
  const [customLines, setCustomLines] = useState<
    Array<{ label: string; amount: string; key: string }>
  >([]);

  // Initialize custom lines from existing invoice if any
  useMemo(() => {
    if (existingInvoice?.lines) {
      const custom = existingInvoice.lines
        .filter((l) => l.type === "CUSTOM")
        .map((l) => ({
          label: l.label,
          amount: l.total || "0",
          key: l.id,
        }));
      setCustomLines(custom);
    } else {
      setCustomLines([]);
    }
  }, [existingInvoice]);

  return (
    <>
      <div className="no-print">
        <InvoiceFilters
          members={members}
          currentUserId={user.id}
          showMemberFilter={isOwner}
          organizationId={user.organizationId || ""}
          targetUserId={targetUserId}
          periodStart={selectedPeriod.startDate}
          periodEnd={selectedPeriod.endDate}
          existingInvoice={existingInvoice}
          isOwner={isOwner}
          presenceData={presenceSummary}
          taskData={taskSummary}
          isDetailsPage={true}
          customLines={customLines}
        />
      </div>

      <InvoiceContentWrapper
        presenceSummary={presenceSummary}
        taskSummary={taskSummary}
        user={user}
        targetUserName={targetUserName}
        targetUserId={targetUserId}
        selectedPeriod={selectedPeriod}
        existingInvoice={existingInvoice}
        isOwner={isOwner}
        customLines={customLines}
        onCustomLinesChange={setCustomLines}
      />
    </>
  );
};
