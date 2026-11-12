import { z } from "zod";
import {
  subscriptionIntervalSchema,
  subscriptionPlanCodeSchema,
} from "@/http/models/subscription.model";

export const checkoutSchema = z.object({
  planCode: subscriptionPlanCodeSchema,
  interval: subscriptionIntervalSchema,
});

export const changePlanSchema = z.object({
  planCode: subscriptionPlanCodeSchema,
  interval: subscriptionIntervalSchema.optional(),
});

export const cancelBillingSchema = z.object({
  atPeriodEnd: z.boolean().optional(),
});
