import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import * as invoiceRepository from "@/http/repositories/invoice.repository";

const factory = createFactory<AuthEnv>();

export const getAllInvoiceLines = factory.createHandlers(async (c) => {
  const lines = await invoiceRepository.findAllInvoiceLines();
  return c.json(lines);
});
