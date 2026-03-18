"server only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoiceLines, invoices } from "@/db/schema";

export const findDraftInvoice = async (
  userId: string,
  month: number,
  year: number,
) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.status, "DRAFT"),
        eq(invoices.periodStart, startDate.toISOString().split("T")[0]),
        eq(invoices.periodEnd, endDate.toISOString().split("T")[0]),
      ),
    )
    .limit(1);

  return invoice ?? null;
};

export const createInvoice = async (
  userId: string,
  month: number,
  year: number,
) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [invoice] = await db
    .insert(invoices)
    .values({
      userId,
      periodStart: startDate.toISOString().split("T")[0],
      periodEnd: endDate.toISOString().split("T")[0],
      status: "DRAFT",
      totalAmount: "0",
    })
    .returning();

  return invoice;
};

export const createInvoiceLine = async (input: {
  invoiceId: string;
  type: "TASK" | "PRESENCE";
  referenceId: string;
  label: string;
  quantity: number;
  unitPrice: string;
}) => {
  const total = (
    Number.parseFloat(input.unitPrice) * input.quantity
  ).toString();

  const [line] = await db
    .insert(invoiceLines)
    .values({
      invoiceId: input.invoiceId,
      type: input.type,
      referenceId: input.referenceId,
      label: input.label,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      total: total,
    })
    .returning();

  // Update invoice total amount
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, input.invoiceId))
    .limit(1);
  if (invoice) {
    const newTotal = (
      Number.parseFloat(invoice.totalAmount || "0") + Number.parseFloat(total)
    ).toString();
    await db
      .update(invoices)
      .set({ totalAmount: newTotal })
      .where(eq(invoices.id, input.invoiceId));
  }

  return line;
};

export const deleteInvoiceLineByReference = async (
  referenceId: string,
  type: "TASK" | "PRESENCE",
) => {
  const [deletedLine] = await db
    .delete(invoiceLines)
    .where(
      and(
        eq(invoiceLines.referenceId, referenceId),
        eq(invoiceLines.type, type),
      ),
    )
    .returning();

  if (deletedLine?.total) {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, deletedLine.invoiceId))
      .limit(1);
    if (invoice) {
      const newTotal = (
        Number.parseFloat(invoice.totalAmount || "0") -
        Number.parseFloat(deletedLine.total)
      ).toString();
      await db
        .update(invoices)
        .set({ totalAmount: newTotal })
        .where(eq(invoices.id, deletedLine.invoiceId));
    }
  }

  return deletedLine;
};

export const findAllInvoiceLines = async () => {
  return await db.query.invoiceLines.findMany({
    with: {
      invoice: {
        with: {
          user: true,
        },
      },
    },
  });
};
