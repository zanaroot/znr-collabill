import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import type { invoices } from "@/db/schema/invoice";
import { logAudit } from "@/http/actions/audit.action";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
} from "@/http/models/invoice.model";
import * as invoiceRepository from "@/http/repositories/invoice.repository";
import {
  notifyInvoicePaidEmail,
  notifyInvoiceValidatedEmail,
} from "@/lib/notifications";

const factory = createFactory<AuthEnv>();

export const getInvoices = factory.createHandlers(async (c) => {
  const user = c.get("user");

  if (!user.organizationId) {
    return c.json({ error: "Organization required" }, 400);
  }

  const invoices = await invoiceRepository.findInvoicesByOrganizationId(
    user.organizationId,
  );
  return c.json(invoices);
});

export const getInvoiceById = factory.createHandlers(async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  if (!id) {
    return c.json({ error: "Invoice ID is required" }, 400);
  }

  const invoice = await invoiceRepository.findInvoiceById(id);
  if (!invoice) {
    return c.json({ error: "Invoice not found" }, 404);
  }

  if (invoice.organizationId !== user.organizationId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  return c.json(invoice);
});

export const createInvoice = factory.createHandlers(
  zValidator("json", createInvoiceSchema),
  async (c) => {
    const user = c.get("user");
    const payload = c.req.valid("json");

    if (payload.organizationId !== user.organizationId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const { lines, ...invoiceData } = payload;

    const invoice = await invoiceRepository.createInvoiceWithLines(
      invoiceData,
      lines,
    );

    await logAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "CREATE",
      entity: "INVOICE",
      entityId: invoice.id,
      metadata: {
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
      },
    });

    return c.json(invoice, 201);
  },
);

export const updateInvoiceStatus = factory.createHandlers(
  zValidator("json", updateInvoiceStatusSchema),
  async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const { status } = c.req.valid("json");

    if (!id) {
      return c.json({ error: "Invoice ID is required" }, 400);
    }

    const invoice = await invoiceRepository.findInvoiceById(id);
    if (!invoice) {
      return c.json({ error: "Invoice not found" }, 404);
    }

    if (invoice.organizationId !== user.organizationId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const updateParams: Partial<typeof invoices.$inferInsert> = { status };

    if (status === "PAID") {
      updateParams.paidAt = new Date();

      notifyInvoicePaidEmail(id).catch((err) => {
        console.error("[Notification] Failed to send email:", err);
      });
    } else if (status === "VALIDATED") {
      updateParams.validatedAt = new Date();

      notifyInvoiceValidatedEmail(id).catch((err) => {
        console.error("[Notification] Failed to send email:", err);
      });
    } else if (status === "DRAFT") {
      await invoiceRepository.deleteInvoiceLines(id);
      await invoiceRepository.deleteInvoice(id);

      await logAudit({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "DELETE",
        entity: "INVOICE",
        entityId: id,
      });

      return c.json({ message: "Invoice deleted" });
    }

    const updated = await invoiceRepository.updateInvoice(id, updateParams);

    await logAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "UPDATE",
      entity: "INVOICE",
      entityId: id,
      metadata: { previousStatus: invoice.status, newStatus: status },
    });

    return c.json(updated);
  },
);
