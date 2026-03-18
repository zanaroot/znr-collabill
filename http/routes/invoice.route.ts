import { Hono } from "hono";
import * as invoiceController from "@/http/controllers/invoice.controller";

export const invoiceRoutes = new Hono().get(
  "/lines",
  ...invoiceController.getAllInvoiceLines,
);
