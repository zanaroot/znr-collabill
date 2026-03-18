import { z } from "zod";

export const invoiceLineSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  type: z.enum(["TASK", "PRESENCE"]),
  referenceId: z.string().uuid().nullable(),
  label: z.string(),
  quantity: z.number(),
  unitPrice: z.string().nullable(),
  total: z.string().nullable(),
  invoice: z
    .object({
      id: z.string().uuid(),
      periodStart: z.string(),
      periodEnd: z.string(),
      user: z
        .object({
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export type InvoiceLine = z.infer<typeof invoiceLineSchema>;
