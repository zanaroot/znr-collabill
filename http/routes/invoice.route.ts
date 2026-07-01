import { Hono } from "hono";
import {
  createInvoice,
  getInvoiceById,
  getInvoices,
  updateInvoiceStatus,
} from "@/http/controllers/invoice.controller";
import {
  deleteInvoiceDraft,
  getInvoiceDraft,
  saveInvoiceDraft,
} from "@/http/controllers/invoice-draft.controller";
import { ownerMiddleware } from "@/http/middleware/auth.middleware";

export const invoiceRoutes = new Hono()
  .get("/", ...getInvoices)
  .get("/:id", ...getInvoiceById)
  .get(
    "/draft/:organizationId/:periodStart/:periodEnd",
    ownerMiddleware,
    getInvoiceDraft,
  )
  .post("/draft", ownerMiddleware, saveInvoiceDraft)
  .delete("/draft/:invoiceId", ownerMiddleware, deleteInvoiceDraft)
  .post("/", ownerMiddleware, ...createInvoice)
  .patch("/:id/status", ownerMiddleware, ...updateInvoiceStatus);
