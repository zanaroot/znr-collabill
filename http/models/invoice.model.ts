import { z } from "zod";

export const invoiceStatusSchema = z.enum(["DRAFT", "VALIDATED", "PAID"]);

export const invoiceLineSchema = z.object({
  type: z.string(),
  referenceId: z.uuid().optional().nullable(),
  label: z.string(),
  quantity: z.number(),
  unitPrice: z.string().optional().nullable(),
  total: z.string().optional().nullable(),
});

export const createInvoiceSchema = z.object({
  userId: z.uuid(),
  organizationId: z.uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  status: invoiceStatusSchema.optional(),
  totalAmount: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  lines: z.array(invoiceLineSchema),
});

export const updateInvoiceStatusSchema = z.object({
  status: invoiceStatusSchema,
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<
  typeof updateInvoiceStatusSchema
>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
