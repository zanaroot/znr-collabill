import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "@/db";
import { invoiceLines, invoices } from "@/db/schema/invoice";

export const getInvoiceDraft = async (c: Context) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = user.id;

  const { periodStart, periodEnd, organizationId, targetUserId } =
    c.req.param();

  console.log("PARAMS:", {
    periodStart,
    periodEnd,
    organizationId,
    targetUserId,
  });

  if (!periodStart || !periodEnd || !organizationId || !targetUserId) {
    return c.json({ error: "Missing params" }, 400);
  }

  const draftKey = `${userId}_${organizationId}_${targetUserId}_${periodStart}_${periodEnd}`;

  const invoice = await db.query.invoices.findFirst({
    where: (invoices, { eq }) =>
      and(eq(invoices.draftKey, draftKey), eq(invoices.status, "DRAFT")),
    with: {
      lines: true,
    },
  });

  return c.json(invoice ?? null);
};

export const saveInvoiceDraft = async (c: Context) => {
  try {
    const userId = c.get("user")?.id;

    const body = await c.req.json();

    const {
      organizationId,
      periodStart,
      periodEnd,
      customLines,
      targetUserId,
    } = body;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const draftKey = `${userId}_${organizationId}_${targetUserId}_${periodStart}_${periodEnd}`;

    const [invoice] = await db
      .insert(invoices)
      .values({
        userId,
        organizationId,
        periodStart,
        periodEnd,
        status: "DRAFT",
        draftKey,
      })
      .onConflictDoUpdate({
        target: [invoices.draftKey],
        set: {
          updatedAt: new Date(),
        },
      })
      .returning();

    await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoice.id));

    if (customLines.length > 0) {
      await db.insert(invoiceLines).values(
        customLines.map((l: { label: string; amount: string | number }) => ({
          invoiceId: invoice.id,
          type: "CUSTOM",
          referenceId: null,
          label: l.label,
          quantity: 1,
          unitPrice: l.amount,
          total: l.amount,
        })),
      );
    }

    return c.json(invoice);
  } catch (err) {
    console.error("SAVE DRAFT ERROR:", err);
    return c.json({ error: "Internal error" }, 500);
  }
};

export const deleteInvoiceDraft = async (c: Context) => {
  const { invoiceId } = c.req.param();

  await db.delete(invoices).where(eq(invoices.id, invoiceId));

  return c.json({ success: true });
};
