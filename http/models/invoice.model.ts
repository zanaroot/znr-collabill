import { z } from "zod";

export const invoiceLineSchema = z.object({
  type: z.string(),
  referenceId: z.string().uuid().optional().nullable(),
  label: z.string(),
  quantity: z.number(),
  unitPrice: z.string().optional().nullable(),
  total: z.string().optional().nullable(),
});

export const createInvoiceSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  status: z.enum(["DRAFT", "VALIDATED", "PAID"]).optional(),
  totalAmount: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  lines: z.array(invoiceLineSchema),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(["DRAFT", "VALIDATED", "PAID"]),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<
  typeof updateInvoiceStatusSchema
>;
