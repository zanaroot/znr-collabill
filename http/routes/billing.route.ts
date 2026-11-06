import { Hono } from "hono";
import {
  getBillingPayments,
  getBillingPlans,
  getBillingSubscription,
  getBillingUsage,
  getPaymentStatus,
  postCancel,
  postChangePlan,
  postCheckout,
  postReactivate,
} from "@/http/controllers/billing.controller";
import { ownerMiddleware } from "@/http/middleware/auth.middleware";

export const billingRoutes = new Hono()
  .get("/plans", ...getBillingPlans)
  .get("/subscription", ...getBillingSubscription)
  .get("/usage", ...getBillingUsage)
  .get("/payments", ownerMiddleware, ...getBillingPayments)
  .get("/payments/:paymentId/status", ownerMiddleware, ...getPaymentStatus)
  .post("/checkout", ownerMiddleware, ...postCheckout)
  .post("/change-plan", ownerMiddleware, ...postChangePlan)
  .post("/cancel", ownerMiddleware, ...postCancel)
  .post("/reactivate", ownerMiddleware, ...postReactivate);
