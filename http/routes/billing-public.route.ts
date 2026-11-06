import { Hono } from "hono";
import { getPublicBillingPlans } from "@/http/controllers/billing.controller";

export const publicBillingRoutes = new Hono().get(
  "/plans",
  ...getPublicBillingPlans,
);
