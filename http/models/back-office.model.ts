import { z } from "zod";
import {
  currencySchema,
  subscriptionIntervalSchema,
  subscriptionPaymentStatusSchema,
  subscriptionPlanCodeSchema,
  subscriptionStatusSchema,
} from "./subscription.model";

const planValuesShape = {
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(500).nullable().optional(),
  amountMinor: z.number().int().min(0),
  amountMinorYearly: z.number().int().min(1).nullable().optional(),
  currency: currencySchema,
  supportedCurrencies: z
    .array(currencySchema)
    .min(1)
    .refine(
      (values) => new Set(values).size === values.length,
      "Currency codes must be unique",
    ),
  maxMembers: z.number().int().min(1).nullable().optional(),
  maxProjects: z.number().int().min(1).nullable().optional(),
  features: z
    .array(z.enum(["integrations", "finance"]))
    .max(2)
    .default([]),
  active: z.boolean().default(true),
};

const assertCurrenciesCovered = (
  value: { currency: string; supportedCurrencies: string[] },
  ctx: z.RefinementCtx,
) => {
  if (!value.supportedCurrencies.includes(value.currency)) {
    ctx.addIssue({
      code: "custom",
      path: ["supportedCurrencies"],
      message: "supportedCurrencies must include currency",
    });
  }
};

export const createPlanSchema = z
  .object({ code: subscriptionPlanCodeSchema, ...planValuesShape })
  .superRefine(assertCurrenciesCovered);

export const updatePlanSchema = z.object({
  name: planValuesShape.name.optional(),
  description: planValuesShape.description,
  amountMinor: planValuesShape.amountMinor.optional(),
  amountMinorYearly: planValuesShape.amountMinorYearly,
  currency: planValuesShape.currency.optional(),
  supportedCurrencies: planValuesShape.supportedCurrencies.optional(),
  maxMembers: planValuesShape.maxMembers,
  maxProjects: planValuesShape.maxProjects,
  features: planValuesShape.features.optional(),
  active: planValuesShape.active.optional(),
});

export const listOrganizationsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  planCode: z.string().trim().max(40).optional(),
  status: subscriptionStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listPaymentsQuerySchema = z.object({
  status: subscriptionPaymentStatusSchema.optional(),
  organizationId: z.uuid().optional(),
  provider: z.string().trim().max(60).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminCancelSchema = z.object({
  atPeriodEnd: z.boolean().default(false),
});

export const adminExtendSchema = z.object({
  days: z.number().int().min(1).max(365),
});

export const adminChangePlanSchema = z.object({
  planCode: subscriptionPlanCodeSchema,
  interval: subscriptionIntervalSchema.optional(),
});

export const adminNoteSchema = z.object({
  body: z.string().trim().min(1).max(1000),
  subscriptionId: z.uuid().optional(),
});

export type CreatePlanInput = z.input<typeof createPlanSchema>;
export type UpdatePlanInput = z.input<typeof updatePlanSchema>;
export type ListOrganizationsQuery = z.infer<
  typeof listOrganizationsQuerySchema
>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type AdminChangePlanInput = z.input<typeof adminChangePlanSchema>;
export type AdminExtendInput = z.input<typeof adminExtendSchema>;
export type AdminCancelInput = z.input<typeof adminCancelSchema>;
