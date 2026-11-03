"server only";

import { and, eq, inArray, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { invoices, tasks } from "@/db/schema";
import { findClosedBillingPeriods } from "@/http/repositories/invoice.repository";
import {
  getBillingPeriodKey,
  selectEligibleBillingTaskIds,
} from "@/lib/invoice-assignment";

const billingPeriodDateKey = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Billing condition for invoice summaries: tickets already archived into an
 * invoice of this exact period, plus unarchived validated tickets whose work
 * period resolves to this period (work period closed -> walk forward to the
 * first open invoice). Validation date never selects the period.
 */
export const buildBillingPeriodCondition = (
  startDate?: Date,
  endDate?: Date,
  eligibleUnarchivedTaskIds: string[] = [],
): SQL | undefined => {
  if (!startDate || !endDate) {
    return or(
      eq(tasks.status, "VALIDATED"),
      and(eq(tasks.status, "ARCHIVED"), isNotNull(tasks.invoiceId)),
    );
  }

  const branches: (SQL | undefined)[] = [];

  if (eligibleUnarchivedTaskIds.length > 0) {
    branches.push(
      and(
        eq(tasks.status, "VALIDATED"),
        isNull(tasks.invoiceId),
        inArray(tasks.id, eligibleUnarchivedTaskIds),
      ),
    );
  }

  branches.push(
    and(
      eq(tasks.status, "ARCHIVED"),
      isNotNull(tasks.invoiceId),
      eq(invoices.periodStart, billingPeriodDateKey(startDate)),
      eq(invoices.periodEnd, billingPeriodDateKey(endDate)),
    ),
  );

  return or(...branches);
};

/**
 * Resolves which not-yet-archived validated tickets belong to the invoice of
 * the period starting at `startDate`: each candidate's work period walks
 * forward past closed (VALIDATED/PAID) invoices until it reaches an open one.
 */
export const findEligibleBillingTaskIds = async (
  scopeConditions: SQL[],
  invoiceUserId: string,
  organizationId: string,
  startDate: Date,
): Promise<string[]> => {
  const candidates = await db
    .select({ id: tasks.id, createdAt: tasks.createdAt })
    .from(tasks)
    .where(
      and(
        ...scopeConditions,
        eq(tasks.status, "VALIDATED"),
        isNull(tasks.invoiceId),
      ),
    );

  if (candidates.length === 0) {
    return [];
  }

  const closedPeriodKeys = await findClosedBillingPeriods(
    invoiceUserId,
    organizationId,
  );

  return selectEligibleBillingTaskIds(
    candidates,
    getBillingPeriodKey(startDate),
    closedPeriodKeys,
  );
};
