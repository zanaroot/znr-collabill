import { z } from "zod";

export const invoiceStatusSchema = z.enum(["DRAFT", "VALIDATED", "PAID"]);

export const invoiceLineSchema = z.object({
  type: z.string(),
  presenceType: z.string().optional().nullable(),
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

export const memberInvoiceQuerySchema = z.object({
  month: z.string(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type CreateInvoiceLineInput = z.infer<typeof invoiceLineSchema>;

type InvoiceLine = {
  id: string;
  invoiceId: string;
  type: string;
  presenceType: string | null;
  referenceId: string | null;
  label: string;
  quantity: number;
  unitPrice: string | null;
  total: string | null;
};

export type InvoiceWithLines = {
  id: string;
  userId: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  status: InvoiceStatus | null;
  totalAmount: number;
  validatedAt: Date | null;
  paidAt: Date | null;
  note: string | null;
  draftKey: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  lines: InvoiceLine[];
};

export type InvoiceHistoryItem = {
  id: string;
  userId: string;
  userName: string;
  periodStart: string;
  periodEnd: string;
  status: InvoiceStatus | null;
  totalAmount: string | null;
};
