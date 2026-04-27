"use server";

import { revalidatePath } from "next/cache";
import type { RawTaskSummary } from "@/app/(private)/invoices/_components/task-summary-table";
import {
  createInvoiceWithLines,
  updateInvoice,
} from "@/http/repositories/invoice.repository";
import {
  archiveTasksByIds,
  getValidatedTaskIdsByPeriodAndUser,
} from "@/http/repositories/task.repository";
import { logError } from "@/lib/sentry";
import { getCurrentUser } from "./get-current-user.action";

type ValidateInvoiceArgs = {
  targetUserId: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  presenceData: {
    userId: string;
    userName: string;
    presenceCount: number;
    dailyRate: string | number | null;
  }[];
  taskData: RawTaskSummary[];
};

export const validateInvoiceAction = async (args: ValidateInvoiceArgs) => {
  const user = await getCurrentUser();
  if (!user || user.organizationRole !== "OWNER") {
    return { error: "Unauthorized" };
  }

  const { targetUserId, periodStart, periodEnd, presenceData, taskData } = args;

  let totalAmount = 0;
  const linesInput: Parameters<typeof createInvoiceWithLines>[1] = [];

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
    const baseRate = Number(t[rateKey] || 0);
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

  try {
    if (!user.organizationId) {
      return { error: "Organization ID is missing" };
    }

    await createInvoiceWithLines(
      {
        userId: targetUserId,
        organizationId: user.organizationId,
        periodStart,
        periodEnd,
        status: "VALIDATED",
        totalAmount: totalAmount.toString(),
        validatedAt: new Date(),
        note: "Auto-validated",
      },
      linesInput,
    );

    const validatedTaskIds = await getValidatedTaskIdsByPeriodAndUser(
      targetUserId,
      new Date(periodStart),
      new Date(periodEnd),
    );
    if (validatedTaskIds.length > 0) {
      await archiveTasksByIds(validatedTaskIds);
    }

    revalidatePath("/invoices");
    return { success: true };
  } catch (error) {
    logError(error, {
      action: "validateInvoiceAction",
      targetUserId,
      periodStart,
      periodEnd,
      totalAmount,
      linesCount: linesInput.length,
    });
    console.error("Validate invoice error:", error);
    return { error: "Failed to validate invoice" };
  }
};

export const markInvoiceAsPaidAction = async (invoiceId: string) => {
  const user = await getCurrentUser();
  if (!user || user.organizationRole !== "OWNER") {
    return { error: "Unauthorized" };
  }

  try {
    await updateInvoice(invoiceId, {
      status: "PAID",
      paidAt: new Date(),
    });
    revalidatePath("/invoices");
    return { success: true };
  } catch (error) {
    logError(error, {
      action: "markInvoiceAsPaidAction",
      invoiceId,
      userId: undefined,
    });
    console.error("Mark invoice as paid error:", error);
    return { error: "Failed to mark invoice as paid" };
  }
};
