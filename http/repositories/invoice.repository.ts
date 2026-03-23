"server only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoiceLines, invoices } from "@/db/schema/invoice";

type CreateInvoiceInput = typeof invoices.$inferInsert;
type CreateInvoiceLineInput = typeof invoiceLines.$inferInsert;

export const findInvoiceByIterationAndUser = async (
  iterationId: string,
  userId: string,
) => {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.iterationId, iterationId), eq(invoices.userId, userId)))
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

export const markInvoiceAsPaid = async (id: string) => {
  const [invoice] = await db
    .update(invoices)
    .set({
      status: "PAID",
      paidAt: new Date(),
    })
    .where(eq(invoices.id, id))
    .returning();
  return invoice;
};
