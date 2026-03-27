import { Hono } from "hono";
import {
  createInvoice,
  getInvoiceById,
  getInvoices,
  updateInvoiceStatus,
} from "@/http/controllers/invoice.controller";
import { ownerMiddleware } from "@/http/middleware/auth.middleware";

export const invoiceRoutes = new Hono()
  .get("/", ...getInvoices)
  .get("/:id", ...getInvoiceById)
  .post("/", ownerMiddleware, ...createInvoice)
  .patch("/:id/status", ownerMiddleware, ...updateInvoiceStatus);
