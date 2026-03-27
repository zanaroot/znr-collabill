import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import type { invoices } from "@/db/schema/invoice";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
} from "@/http/models/invoice.model";
import * as invoiceRepository from "@/http/repositories/invoice.repository";

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
    } else if (status === "VALIDATED") {
      updateParams.validatedAt = new Date();
    } else if (status === "DRAFT") {
      await invoiceRepository.deleteInvoiceLines(id);
      await invoiceRepository.deleteInvoice(id);
      return c.json({ message: "Invoice deleted" });
    }

    const updated = await invoiceRepository.updateInvoice(id, updateParams);
    return c.json(updated);
  },
);
