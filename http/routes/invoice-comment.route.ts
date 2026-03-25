import { Hono } from "hono";
import {
  createComment,
  getCommentsByInvoice,
} from "@/http/controllers/invoice-comment.controller";

export const invoiceCommentRoutes = new Hono()
  .get("/invoice/:invoiceId", ...getCommentsByInvoice)
  .post("/invoice/:invoiceId", ...createComment);
