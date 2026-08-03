import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import type { invoices } from "@/db/schema/invoice";
import { logAudit } from "@/http/actions/audit.action";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  createInvoiceSchema,
  memberInvoiceQuerySchema,
  updateInvoiceStatusSchema,
} from "@/http/models/invoice.model";
import * as invoiceRepository from "@/http/repositories/invoice.repository";
import {
  archiveTasksByIds,
  getValidatedTaskIdsByPeriodAndReviewer,
  getValidatedTaskIdsByPeriodAndUser,
  unarchiveTasksByInvoice,
} from "@/http/repositories/task.repository";
import { sendFinanceInvoiceNotification } from "@/lib/incoices/send-finance-invoice";
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

      await notifyInvoicePaidEmail(id);

      try {
        const invoice = await invoiceRepository.findInvoiceById(id);

        if (invoice) {
          if (status === "PAID") {
            updateParams.paidAt = new Date();

            await notifyInvoicePaidEmail(id);

            sendFinanceInvoiceNotification(id, "PAID").catch((err) => {
              console.error(
                "[Finance notification] Failed to send paid invoice email:",
                err,
              );
            });
          }
        }
      } catch (err) {
        console.error("[Finance notification] Unexpected error:", err);
      }
    } else if (status === "VALIDATED") {
      updateParams.validatedAt = new Date();

      notifyInvoiceValidatedEmail(id).catch((err) => {
        console.error("[Notification] Failed to send email:", err);
      });

      sendFinanceInvoiceNotification(id, "VALIDATED").catch((err) => {
        console.error(
          "[Finance notification] Failed to send validated invoice email:",
          err,
        );
      });
    } else if (status === "DRAFT") {
      const restoredTasks = await unarchiveTasksByInvoice(id);
      console.log(
        `Successfully restored ${restoredTasks.length} tasks for invoice ${id}:`,
        restoredTasks.map((t) => ({
          id: t.id,
          status: t.status,
          archivedAt: t.archivedAt,
        })),
      );

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

    if (invoice.status === "VALIDATED") {
      console.log("Invoice validated - sending finance email");

      sendFinanceInvoiceNotification(invoice.id, "VALIDATED").catch((err) => {
        console.error(
          "[Finance notification] Failed to send validated invoice email:",
          err,
        );
      });
    }

    const validatedTaskIds = await getValidatedTaskIdsByPeriodAndUser(
      invoiceData.userId,
      new Date(invoiceData.periodStart),
      new Date(invoiceData.periodEnd),
    );

    const validatedReviewerTaskIds =
      await getValidatedTaskIdsByPeriodAndReviewer(
        invoiceData.userId,
        new Date(invoiceData.periodStart),
        new Date(invoiceData.periodEnd),
      );

    const taskIdsToArchive = Array.from(
      new Set([...validatedTaskIds, ...validatedReviewerTaskIds]),
    );

    console.log(
      `Found ${validatedTaskIds.length} validated tasks and ${validatedReviewerTaskIds.length} validated reviewer tasks to archive for invoice ${invoice.id}:`,
      taskIdsToArchive,
    );

    if (taskIdsToArchive.length > 0) {
      const archivedTasks = await archiveTasksByIds(
        taskIdsToArchive,
        invoice.id,
      );

      console.log(
        `Successfully archived ${archivedTasks.length} tasks for invoice ${invoice.id}:`,
        archivedTasks.map((t) => ({
          id: t.id,
          status: t.status,
          archivedAt: t.archivedAt,
        })),
      );
    }

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

export const getMemberInvoice = factory.createHandlers(
  zValidator("query", memberInvoiceQuerySchema),
  async (c) => {
    const user = c.get("user");
    const userId = c.req.param("userId");
    const month = c.req.query("month");

    if (!user.organizationId) {
      return c.json({ error: "Organization required" }, 400);
    }

    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    if (!month) {
      return c.json({ error: "Month is required" }, 400);
    }

    const [year, monthNumber] = month.split("-");

    if (!year || !monthNumber) {
      return c.json({ error: "Invalid month format. Expected YYYY-MM" }, 400);
    }

    const periodStart = `${year}-${monthNumber}-01`;

    const lastDay = new Date(Number(year), Number(monthNumber), 0).getDate();

    const periodEnd = `${year}-${monthNumber}-${String(lastDay).padStart(2, "0")}`;

    const invoice = await invoiceRepository.findInvoiceByPeriodAndUser(
      periodStart,
      periodEnd,
      userId,
      user.organizationId,
    );

    if (!invoice) {
      return c.json(null);
    }

    if (invoice.organizationId !== user.organizationId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    return c.json(invoice);
  },
);
