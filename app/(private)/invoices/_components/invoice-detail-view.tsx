"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/http/models/auth.model";
import type { Organization } from "@/http/models/organization.model";
import type { Period } from "@/http/models/period.model";
import type { InvoiceWithLines } from "@/http/repositories/invoice.repository";
import { client } from "@/packages/hono";
import { InvoiceContentWrapper } from "./invoice-content-wrapper";
import { InvoiceFilters } from "./invoice-filters";
import type { PresenceSummary } from "./presence-summary-table";
import type { RawTaskSummary, ReviewerTaskSummary } from "./task-summary-table";

interface Member {
  id: string;
  name: string;
  role: string;
}

type DraftLine = {
  id: string;
  label: string;
  total: number | string;
  type: "CUSTOM" | string;
};

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

  const [draftLines, setDraftLines] = useState<
    Array<{ label: string; amount: string; key: string }>
  >([]);

  const [isDraftLoaded, setIsDraftLoaded] = useState(false);


  const { mutate: saveDraft } = useMutation({
    mutationFn: async (args: {
      organizationId: string;
      periodStart: string;
      periodEnd: string;
      customLines: {
        label: string;
        amount: string;
      }[];
    }) => {
      const res = await client.api.invoices.draft.$post({
        json: args,
      });

      if (!res.ok) {
        throw new Error("Failed to save draft");
      }

      return res.json();
    },
  });

  useEffect(() => {
    const loadDraft = async () => {
      if (existingInvoice || !isOwner) {
        setIsDraftLoaded(true);
        return;
      }
      try {
        const res = await client.api.invoices.draft[":organizationId"][":periodStart"][":periodEnd"].$get({
          param: {
            organizationId: organization.id,
            periodStart: selectedPeriod.startDate,
            periodEnd: selectedPeriod.endDate,
          },
        });

        if (res.ok) {
          const draft = await res.json();
          const line = draft?.lines as DraftLine[] | null;
          if (line) {
            setDraftLines(
              line
                .filter((line) => line.type === "CUSTOM")
                .map((line) => ({
                  key: line.id,
                  label: line.label,
                  amount: String(line.total ?? "0"),
                })),
            );
          }
        }
      } finally {
        setIsDraftLoaded(true);
      }
    };

    loadDraft();
  }, [
    existingInvoice,
    isOwner,
    organization.id,
    selectedPeriod.startDate,
    selectedPeriod.endDate,
  ]);

  useEffect(() => {
    if (!isDraftLoaded) return;

    if (existingInvoice?.lines) {
      const custom = existingInvoice.lines
        .filter((l) => l.type === "CUSTOM")
        .map((l) => ({
          label: l.label,
          amount: String(l.total ?? "0"),
          key: l.id,
        }));

      setCustomLines(custom);
      return;
    }

    if (draftLines.length > 0) {
      setCustomLines(draftLines);
      return;
    }

    if (organization.unusedLeavePolicy === "PAID_AS_WORKED") {
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

      const dailyRate = Number(userPresence?.dailyRate ?? 0);
      const amount = dailyRate * leaveQuota;

      if (amount > 0) {
        setCustomLines([
          {
            label: `Unused Leave (Paid as Worked) for ${member?.name ?? targetUserName}`,
            amount: amount.toString(),
            key: `paid-as-worked-${selectedPeriod.id}`,
          },
        ]);
      } else {
        setCustomLines([]);
      }

      return;
    }

    setCustomLines([]);
  }, [
    existingInvoice,
    draftLines,
    isDraftLoaded,
    organization,
    members,
    targetUserId,
    targetUserName,
    selectedPeriod,
    presenceSummary,
  ]);

  useEffect(() => {
    if (!isDraftLoaded) return;
    if (existingInvoice || !isOwner) return;

    saveDraft({
      organizationId: organization.id,
      periodStart: selectedPeriod.startDate,
      periodEnd: selectedPeriod.endDate,
      customLines: customLines.map(({ label, amount }) => ({
        label,
        amount,
      })),
    });
  }, [
    customLines,
    existingInvoice,
    isOwner,
    organization.id,
    selectedPeriod.startDate,
    selectedPeriod.endDate,
    saveDraft,
    isDraftLoaded,
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
