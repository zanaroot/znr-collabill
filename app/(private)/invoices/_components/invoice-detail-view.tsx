"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@/http/models/auth.model";
import type { Organization } from "@/http/models/organization.model";
import type { Period } from "@/http/models/period.model";
import type { InvoiceWithLines } from "@/http/repositories/invoice.repository";
import { InvoiceContentWrapper } from "./invoice-content-wrapper";
import { InvoiceFilters } from "./invoice-filters";
import type { PresenceSummary } from "./presence-summary-table";
import type { RawTaskSummary, ReviewerTaskSummary } from "./task-summary-table";

interface Member {
  id: string;
  name: string;
  role: string;
}

interface InvoiceDetailViewProps {
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
  members: Member[];
  organization: Organization;
}

export const InvoiceDetailView = ({
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
  members,
  organization,
}: InvoiceDetailViewProps) => {
  const [customLines, setCustomLines] = useState<
    Array<{ label: string; amount: string; key: string }>
  >([]);

  useEffect(() => {
    if (existingInvoice?.lines) {
      const custom = existingInvoice.lines
        .filter((l) => l.type === "CUSTOM")
        .map((l) => ({
          label: l.label,
          amount: l.total || "0",
          key: l.id,
        }));
      setCustomLines(custom);
    } else if (
      !existingInvoice &&
      organization?.unusedLeavePolicy === "PAID_AS_WORKED"
    ) {
      const member = members.find((m) => m.id === targetUserId);
      const isAdmin = member?.role === "ADMIN";
      const leaveQuota = Number(
        isAdmin
          ? organization.adminLeaveQuota
          : organization.collaboratorLeaveQuota,
      );
      const userPresence = presenceSummary.find(
        (p) => p.userId === targetUserId,
      );
      const dailyRate =
        Number(userPresence?.dailyRate || 0) || leaveQuota * 100;
      const amount = leaveQuota * dailyRate;

      if (amount > 0) {
        setCustomLines([
          {
            label: `Unused Leave (Paid as Worked) for ${member?.name || targetUserName}`,
            amount: amount.toString(),
            key: `paid-as-worked-${selectedPeriod.id}`,
          },
        ]);
      } else {
        setCustomLines([]);
      }
    } else {
      setCustomLines([]);
    }
  }, [
    existingInvoice,
    organization,
    members,
    targetUserId,
    targetUserName,
    selectedPeriod,
    presenceSummary.find,
  ]);

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
          reviewerTaskData={reviewerTaskSummary}
          isDetailsPage={true}
          customLines={customLines}
          organization={organization}
        />
      </div>

      <InvoiceContentWrapper
        presenceSummary={presenceSummary}
        taskSummary={taskSummary}
        reviewerTaskSummary={reviewerTaskSummary}
        user={user}
        targetUserName={targetUserName}
        targetUserId={targetUserId}
        targetUserPhoneNumber={targetUserPhoneNumber}
        targetUserPhoneOwnerName={targetUserPhoneOwnerName}
        selectedPeriod={selectedPeriod}
        existingInvoice={existingInvoice}
        isOwner={isOwner}
        customLines={customLines}
        onCustomLinesChange={setCustomLines}
      />
    </>
  );
};
