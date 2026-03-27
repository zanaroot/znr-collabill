import { Hono } from "hono";
import {
  createInvoice,
  getInvoiceById,
  getInvoices,
  updateInvoiceStatus,
} from "@/http/controllers/invoice.controller";

export const invoiceRoutes = new Hono()
  .get("/", ...getInvoices)
  .get("/:id", ...getInvoiceById)
  .post("/", ...createInvoice)
  .patch("/:id/status", ...updateInvoiceStatus);
