"use client";

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, message, Select, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import type { z } from "zod";
import type {
  CreateInvoiceInput,
  invoiceLineSchema,
} from "@/http/models/invoice.model";
import { client } from "@/packages/hono";

const { Text } = Typography;

import { getMonthlyPeriods } from "@/lib/periods";
import type { PresenceSummary } from "./presence-summary-table";
import type { RawTaskSummary } from "./task-summary-table";

type Member = {
  id: string;
  name: string;
  role: string;
};

type InvoiceFiltersProps = {
  members: Member[];
  currentUserId: string;
  showMemberFilter?: boolean;
  organizationId: string;
  targetUserId: string;
  periodStart?: string;
  periodEnd?: string;
  existingInvoice?: { id: string; status: string | null } | null;
  isOwner?: boolean;
  presenceData: PresenceSummary[];
  taskData: RawTaskSummary[];
  isDetailsPage?: boolean;
};

export const InvoiceFilters = ({
  members,
  currentUserId,
  showMemberFilter = false,
  organizationId,
  targetUserId,
  periodStart,
  periodEnd,
  existingInvoice,
  isOwner,
  isDetailsPage,
  presenceData,
  taskData,
}: InvoiceFiltersProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const periodId = searchParams.get("periodId");
  const selectedMemberId = searchParams.get("memberId") || currentUserId;

  const periods = getMonthlyPeriods(24);

  const handlePeriodChange = (value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("periodId", value);
    } else {
      params.delete("periodId");
    }
    router.push(`/invoices?${params.toString()}`);
  };

  const handleMemberChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === currentUserId) {
      params.delete("memberId");
    } else {
      params.set("memberId", value);
    }
    router.push(`/invoices?${params.toString()}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const { data: _organizationOwner, isLoading: _isLoadingOwner } = useQuery({
    queryKey: ["organization-owner", organizationId],
    queryFn: async () => {
      const res = await client.api.organizations[":id"].owner.$get({
        param: { id: organizationId },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch organization owner");
      }
      return res.json();
    },
  });

  const { mutateAsync: validateInvoice, isPending: isValidating } = useMutation(
    {
      mutationFn: async (args: CreateInvoiceInput) => {
        const res = await client.api.invoices.$post({
          json: args,
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            (errorData as { error?: string }).error ||
            "Failed to validate invoice",
          );
        }
        return res.json();
      },
      onSuccess: () => {
        message.success("Invoice validated successfully!");
        window.location.reload();
      },
      onError: (error: Error) => {
        message.error(error.message);
      },
    },
  );

  const { mutateAsync: markAsPaid, isPending: isMarkingPaid } = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.invoices[":id"].status.$patch({
        param: { id },
        json: { status: "PAID" },
      });
      const result = await res.json();
      if (!res.ok) {
        const errorData = result as { error?: string };
        throw new Error(errorData.error || "Failed to mark as paid");
      }
      return result;
    },
    onSuccess: () => {
      message.success("Invoice marked as paid!");
      window.location.reload();
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const { mutateAsync: unvalidateInvoice, isPending: isUnvalidating } =
    useMutation({
      mutationFn: async (id: string) => {
        const res = await client.api.invoices[":id"].status.$patch({
          param: { id },
          json: { status: "DRAFT" },
        });
        const result = await res.json();
        if (!res.ok) {
          const errorData = result as { error?: string };
          throw new Error(errorData.error || "Failed to unvalidate invoice");
        }
        return result;
      },
      onSuccess: () => {
        message.success("Invoice unvalidated successfully!");
        window.location.reload();
      },
      onError: (error: Error) => {
        message.error(error.message);
      },
    });

  const handleValidate = async () => {
    if (!targetUserId || !periodStart || !periodEnd) return;

    let totalAmount = 0;
    const linesInput: z.infer<typeof invoiceLineSchema>[] = [];

    for (const p of presenceData) {
      const rate = Number(p.dailyRate || 0);
      const amount = p.presenceCount * rate;
      if (amount > 0) {
        totalAmount += amount;
        linesInput.push({
          type: "PRESENCE",
          referenceId: p.userId,
          label: `Presence for ${p.userName}`,
          quantity: p.presenceCount,
          unitPrice: rate.toString(),
          total: amount.toString(),
        });
      }
    }

    for (const t of taskData) {
      const size = t.size.toLowerCase();
      const rateKey =
        `rate${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof RawTaskSummary;
      const baseRate = Number((t[rateKey] as string | null) || 0);
      const projectRate = Number(t.projectBaseRate || 1);
      const totalRate = baseRate * projectRate;
      const amount = t.taskCount * totalRate;

      if (amount > 0) {
        totalAmount += amount;
        linesInput.push({
          type: "TASK",
          referenceId: t.userId,
          label: `Tasks ${t.size} for ${t.userName} (${t.projectName})`,
          quantity: t.taskCount,
          unitPrice: totalRate.toString(),
          total: amount.toString(),
        });
      }
    }

    await validateInvoice({
      userId: targetUserId,
      organizationId: organizationId,
      periodStart,
      periodEnd,
      status: "VALIDATED",
      totalAmount: totalAmount.toString(),
      note: "Auto-validated",
      lines: linesInput,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Text strong className="whitespace-nowrap dark:text-white">
              Filter by Period:
            </Text>
            <Select
              placeholder="Select period"
              className="w-full md:min-w-[200px]"
              value={periodId || undefined}
              onChange={handlePeriodChange}
              allowClear
              options={periods.map((p) => ({
                label: p.name,
                value: p.id,
              }))}
            />
          </div>
          {showMemberFilter && (
            <div className="flex items-center gap-2">
              <Text strong className="whitespace-nowrap dark:text-white">
                Filter by Member:
              </Text>
              <Select
                className="w-full md:min-w-[200px]"
                value={selectedMemberId}
                onChange={handleMemberChange}
                options={members.map((m) => ({
                  label: m.name + (m.id === currentUserId ? " (Me)" : ""),
                  value: m.id,
                }))}
              />
            </div>
          )}
        </div>
        {isDetailsPage && (
          <div className="flex gap-3 no-print">
            {isOwner &&
              !existingInvoice &&
              targetUserId &&
              periodStart &&
              periodEnd && (
                <Button
                  variant="solid"
                  loading={isValidating}
                  icon={<CheckCircleOutlined />}
                  onClick={handleValidate}
                  color="green"
                >
                  Validate Invoice
                </Button>
              )}
            {existingInvoice?.status === "VALIDATED" && isOwner && (
              <>
                <Button
                  variant="solid"
                  loading={isUnvalidating}
                  icon={<CloseCircleOutlined />}
                  onClick={() => unvalidateInvoice(existingInvoice.id)}
                  color="orange"
                >
                  Unvalidate
                </Button>
                <Button
                  variant="solid"
                  loading={isMarkingPaid}
                  icon={<CheckCircleOutlined />}
                  onClick={() => markAsPaid(existingInvoice.id)}
                  color="purple"
                >
                  Mark as Paid
                </Button>
              </>
            )}
            {existingInvoice?.status !== "PAID" && (
              <Button
                icon={<PrinterOutlined />}
                onClick={handlePrint}
                type="primary"
                className="shadow-md"
              >
                Print Invoice
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
