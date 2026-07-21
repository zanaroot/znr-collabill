"server only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoiceLines, invoices } from "@/db/schema/invoice";

type CreateInvoiceInput = typeof invoices.$inferInsert;
type CreateInvoiceLineInput = typeof invoiceLines.$inferInsert;

export type InvoiceWithLines = typeof invoices.$inferSelect & {
  lines: (typeof invoiceLines.$inferSelect)[];
};

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
) => {
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

  return { ...invoice, lines };
};

export const createInvoiceWithLines = async (
  invoiceInput: Omit<CreateInvoiceInput, "id" | "createdAt">,
  linesInput: Omit<CreateInvoiceLineInput, "id" | "invoiceId">[],
) => {
  return await db.transaction(async (tx) => {
    const [invoice] = await tx
      .insert(invoices)
      .values(invoiceInput)
      .returning();

    if (linesInput.length > 0) {
      await tx.insert(invoiceLines).values(
        linesInput.map((line) => ({
          ...line,
          invoiceId: invoice.id,
        })),
      );
    }

    return invoice;
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
) => {
  const { users } = await import("@/db/schema/user");
  const conditions = [eq(invoices.organizationId, organizationId)];
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
