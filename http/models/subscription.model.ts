import { z } from "zod";

export const subscriptionStatusSchema = z.enum([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELED",
  "EXPIRED",
]);

export const liveSubscriptionStatusSchema = z.enum([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
]);

export const subscriptionIntervalSchema = z.enum(["MONTHLY", "YEARLY"]);

export const subscriptionPlanCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Z][A-Z0-9_]*$/, "Plan code must be an uppercase identifier");

export const subscriptionPaymentStatusSchema = z.enum([
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
]);

export const providerReferenceEntityTypeSchema = z.enum([
  "ORGANIZATION",
  "SUBSCRIPTION",
  "PAYMENT",
  "PLAN",
]);

export const currencySchema = z.string().regex(/^[A-Z]{3}$/);

export const amountMinorSchema = z.number().int().min(0);

export const liveSubscriptionStatuses = liveSubscriptionStatusSchema.options;

export const subscriptionEventTypes = {
  created: "SUBSCRIPTION_CREATED",
  planChanged: "SUBSCRIPTION_PLAN_CHANGED",
  statusChanged: "SUBSCRIPTION_STATUS_CHANGED",
  canceled: "SUBSCRIPTION_CANCELED",
  paymentRecorded: "SUBSCRIPTION_PAYMENT_RECORDED",
  checkoutInitiated: "CHECKOUT_INITIATED",
  paymentSucceeded: "PAYMENT_SUCCEEDED",
  paymentFailed: "PAYMENT_FAILED",
  paymentRefunded: "PAYMENT_REFUNDED",
  periodExtended: "SUBSCRIPTION_PERIOD_EXTENDED",
} as const;

export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type SubscriptionInterval = z.infer<typeof subscriptionIntervalSchema>;
export type SubscriptionPlanCode = z.infer<typeof subscriptionPlanCodeSchema>;
export type SubscriptionPaymentStatus = z.infer<
  typeof subscriptionPaymentStatusSchema
>;
export type SubscriptionFeature = "integrations" | "finance";
export type ProviderReferenceEntityType = z.infer<
  typeof providerReferenceEntityTypeSchema
>;
export type LiveSubscriptionStatus = z.infer<
  typeof liveSubscriptionStatusSchema
>;
export type SubscriptionEventType =
  (typeof subscriptionEventTypes)[keyof typeof subscriptionEventTypes];

export const subscriptionPlanSchema = z.object({
  id: z.uuid(),
  code: subscriptionPlanCodeSchema,
  name: z.string().min(1),
  description: z.string().nullable(),
  amountMinor: amountMinorSchema,
  amountMinorYearly: z.number().int().min(1).nullable().optional(),
  currency: currencySchema,
  supportedCurrencies: z.array(currencySchema).optional(),
  interval: subscriptionIntervalSchema.nullable(),
  maxMembers: z.number().int().min(1).nullable(),
  maxProjects: z.number().int().min(1).nullable(),
  features: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const subscriptionSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  planId: z.uuid(),
  status: subscriptionStatusSchema,
  interval: subscriptionIntervalSchema.nullable(),
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  provider: z.string().min(1),
  providerSubscriptionId: z.string().nullable(),
  trialEndsAt: z.date().nullable(),
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const subscriptionWithPlanSchema = subscriptionSchema.extend({
  plan: subscriptionPlanSchema,
});

export const subscriptionPaymentSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  subscriptionId: z.uuid(),
  planId: z.uuid(),
  status: subscriptionPaymentStatusSchema,
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  provider: z.string().min(1),
  providerPaymentId: z.string().nullable(),
  paidAt: z.date().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const subscriptionEventSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  subscriptionId: z.uuid().nullable(),
  type: z.string().min(1),
  provider: z.string().min(1),
  providerEventId: z.string().nullable(),
  payload: z.string(),
  createdAt: z.date(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type SubscriptionWithPlan = z.infer<typeof subscriptionWithPlanSchema>;
export type SubscriptionPayment = z.infer<typeof subscriptionPaymentSchema>;
export type SubscriptionEvent = z.infer<typeof subscriptionEventSchema>;

const providerTimingFields = {
  provider: z.string().min(1).optional(),
  providerSubscriptionId: z.string().min(1).nullable().optional(),
  trialEndsAt: z.coerce.date().nullable().optional(),
  currentPeriodStart: z.coerce.date().nullable().optional(),
  currentPeriodEnd: z.coerce.date().nullable().optional(),
};

export const ensureSubscriptionSchema = z.object({
  organizationId: z.uuid(),
  planCode: subscriptionPlanCodeSchema.default("FREE"),
  status: liveSubscriptionStatusSchema.optional(),
  interval: subscriptionIntervalSchema.nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  ...providerTimingFields,
});

export const changeSubscriptionPlanSchema = z.object({
  organizationId: z.uuid(),
  planCode: subscriptionPlanCodeSchema,
  status: liveSubscriptionStatusSchema.optional(),
  interval: subscriptionIntervalSchema.nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  ...providerTimingFields,
});

export const cancelSubscriptionSchema = z.object({
  organizationId: z.uuid(),
  atPeriodEnd: z.boolean().optional(),
});

export const setSubscriptionStatusSchema = z.object({
  organizationId: z.uuid(),
  status: subscriptionStatusSchema,
  cancelAtPeriodEnd: z.boolean().optional(),
  providerSubscriptionId: z.string().min(1).nullable().optional(),
  trialEndsAt: z.coerce.date().nullable().optional(),
  currentPeriodStart: z.coerce.date().nullable().optional(),
  currentPeriodEnd: z.coerce.date().nullable().optional(),
});

export const recordSubscriptionPaymentSchema = z.object({
  organizationId: z.uuid(),
  subscriptionId: z.uuid(),
  status: subscriptionPaymentStatusSchema.default("PENDING"),
  amountMinor: amountMinorSchema,
  currency: currencySchema.default("USD"),
  provider: z.string().min(1).default("internal"),
  providerPaymentId: z.string().min(1).nullable().optional(),
  paidAt: z.coerce.date().nullable().optional(),
  failureReason: z.string().min(1).nullable().optional(),
});

export const recordSubscriptionEventSchema = z.object({
  organizationId: z.uuid(),
  subscriptionId: z.uuid().nullable().optional(),
  type: z.string().min(1),
  provider: z.string().min(1).default("internal"),
  providerEventId: z.string().min(1).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type EnsureSubscriptionInput = z.input<typeof ensureSubscriptionSchema>;
export type ChangeSubscriptionPlanInput = z.input<
  typeof changeSubscriptionPlanSchema
>;
export type CancelSubscriptionInput = z.input<typeof cancelSubscriptionSchema>;
export type SetSubscriptionStatusInput = z.input<
  typeof setSubscriptionStatusSchema
>;
export type RecordSubscriptionPaymentInput = z.input<
  typeof recordSubscriptionPaymentSchema
>;
export type RecordSubscriptionEventInput = z.input<
  typeof recordSubscriptionEventSchema
>;
