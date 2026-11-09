"server only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoiceLines, invoices } from "@/db/schema/invoice";
import { tasks } from "@/db/schema/task";
import type {
  InvoiceHistoryItem,
  InvoiceWithLines,
} from "@/http/models/invoice.model";

type InvoiceInsertInput = typeof invoices.$inferInsert;
type InvoiceLineInsertInput = typeof invoiceLines.$inferInsert;

export const findInvoiceById = async (id: string) => {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  return invoice ?? null;
};

export const findInvoiceByPeriodAndUser = async (
  periodStart: string,
  periodEnd: string,
  userId: string,
  organizationId: string,
): Promise<InvoiceWithLines | null> => {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.periodStart, periodStart),
        eq(invoices.periodEnd, periodEnd),
        eq(invoices.userId, userId),
        eq(invoices.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!invoice) return null;

  const lines = await db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoice.id));

  const totalAmount = lines.reduce(
    (total, line) => total + Number(line.total ?? 0),
    0,
  );

  return {
    ...invoice,
    lines,
    totalAmount,
  };
};

export const findClosedBillingPeriods = async (
  userId: string,
  organizationId: string,
): Promise<Set<string>> => {
  const rows = await db
    .select({ periodStart: invoices.periodStart })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.organizationId, organizationId),
        inArray(invoices.status, ["VALIDATED", "PAID"]),
      ),
    );

  return new Set(rows.map((row) => row.periodStart.slice(0, 7)));
};

export type UpsertInvoiceForPeriodResult =
  | { conflict: true }
  | {
      conflict: false;
      invoice: typeof invoices.$inferSelect;
      archivedTaskIds: string[];
    };

/**
 * Creates or replaces the invoice for a period and archives its billing
 * tickets in a single transaction. An advisory lock keyed by organization,
 * user and period serializes concurrent validations so the same period can
 * never produce two invoices or duplicate lines. Invoices that are already
 * VALIDATED or PAID are never modified.
 */
export const upsertInvoiceForPeriod = async (
  invoiceInput: Omit<InvoiceInsertInput, "id" | "createdAt">,
  linesInput: Omit<InvoiceLineInsertInput, "id" | "invoiceId">[],
  taskIdsToArchive: string[],
): Promise<UpsertInvoiceForPeriodResult> => {
  const lockKey = `${invoiceInput.organizationId}:${invoiceInput.userId}:${invoiceInput.periodStart}:${invoiceInput.periodEnd}`;

  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    );

    const [existing] = await tx
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.periodStart, invoiceInput.periodStart),
          eq(invoices.periodEnd, invoiceInput.periodEnd),
          eq(invoices.userId, invoiceInput.userId),
          eq(invoices.organizationId, invoiceInput.organizationId),
        ),
      )
      .limit(1);

    if (existing && existing.status !== "DRAFT") {
      return { conflict: true as const };
    }

    let invoice: typeof invoices.$inferSelect;

    if (existing) {
      const [updated] = await tx
        .update(invoices)
        .set({ ...invoiceInput, updatedAt: new Date() })
        .where(eq(invoices.id, existing.id))
        .returning();
      if (!updated) {
        throw new Error("Invoice not found");
      }
      invoice = updated;
      await tx
        .delete(invoiceLines)
        .where(eq(invoiceLines.invoiceId, existing.id));
    } else {
      const [created] = await tx
        .insert(invoices)
        .values(invoiceInput)
        .returning();
      if (!created) {
        throw new Error("Failed to create invoice");
      }
      invoice = created;
    }

    if (linesInput.length > 0) {
      await tx.insert(invoiceLines).values(
        linesInput.map((line) => ({
          ...line,
          invoiceId: invoice.id,
        })),
      );
    }

    let archivedTaskIds: string[] = [];

    if (invoiceInput.status === "VALIDATED" && taskIdsToArchive.length > 0) {
      const archived = await tx
        .update(tasks)
        .set({
          status: "ARCHIVED",
          archivedAt: new Date(),
          invoiceId: invoice.id,
        })
        .where(
          and(
            inArray(tasks.id, taskIdsToArchive),
            eq(tasks.status, "VALIDATED"),
          ),
        )
        .returning({ id: tasks.id });
      archivedTaskIds = archived.map((row) => row.id);
    }

    return { conflict: false as const, invoice, archivedTaskIds };
  });
};

export const findInvoicesByOrganizationId = async (organizationId: string) => {
  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId));
};

export const findInvoicesWithUsersByOrganizationId = async (
  organizationId: string,
  userId?: string,
): Promise<InvoiceHistoryItem[]> => {
  const { users } = await import("@/db/schema/user");

  const conditions = [
    eq(invoices.organizationId, organizationId),
    inArray(invoices.status, ["VALIDATED", "PAID"]),
  ];

  if (userId) {
    conditions.push(eq(invoices.userId, userId));
  }

  return await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      userName: users.name,
      periodStart: invoices.periodStart,
      periodEnd: invoices.periodEnd,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
    })
    .from(invoices)
    .innerJoin(users, eq(invoices.userId, users.id))
    .where(and(...conditions));
};

export const updateInvoice = async (
  id: string,
  input: Partial<typeof invoices.$inferInsert>,
) => {
  const [invoice] = await db
    .update(invoices)
    .set(input)
    .where(eq(invoices.id, id))
    .returning();
  return invoice;
};

export const deleteInvoiceLines = async (invoiceId: string) => {
  await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));
};

export const deleteInvoice = async (id: string) => {
  await db.delete(invoices).where(eq(invoices.id, id));
};

export const findInvoiceByIdWithLines = async (id: string) => {
  const { users } = await import("@/db/schema/user");
  const { organizations } = await import("@/db/schema/organization");

  const results = await db
    .select({
      invoice: invoices,
      line: invoiceLines,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        phoneOwnerName: users.phoneOwnerName,
      },
      organization: {
        id: organizations.id,
        name: organizations.name,
      },
    })
    .from(invoices)
    .innerJoin(users, eq(invoices.userId, users.id))
    .innerJoin(organizations, eq(invoices.organizationId, organizations.id))
    .leftJoin(invoiceLines, eq(invoiceLines.invoiceId, invoices.id))
    .where(eq(invoices.id, id));

  if (results.length === 0) {
    return null;
  }

  return {
    invoice: results[0].invoice,
    user: results[0].user,
    organization: results[0].organization,
    lines: results
      .map((r) => r.line)
      .filter((line): line is NonNullable<typeof line> => line !== null),
  };
};
