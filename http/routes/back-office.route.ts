import { Hono } from "hono";
import {
  getBackOfficeOrganization,
  getBackOfficeOrganizations,
  getBackOfficeOverview,
  getBackOfficePlans,
  patchBackOfficePlans,
  postBackOfficeOrganizationNotes,
  postBackOfficePlans,
} from "@/http/controllers/back-office.controller";
import {
  getBackOfficePayment,
  getBackOfficePayments,
  postBackOfficePaymentRefund,
} from "@/http/controllers/payment-admin.controller";
import {
  postActivateSubscription,
  postCancelSubscription,
  postChangeSubscriptionPlan,
  postExtendSubscription,
  postReactivateSubscription,
  postSuspendSubscription,
} from "@/http/controllers/subscription-admin.controller";
import { platformAdminMiddleware } from "@/http/middleware/auth.middleware";

export const backOfficeRoutes = new Hono()
  .use("*", platformAdminMiddleware)
  .get("/billing/overview", ...getBackOfficeOverview)
  .get("/billing/plans", ...getBackOfficePlans)
  .post("/billing/plans", ...postBackOfficePlans)
  .patch("/billing/plans/:planId", ...patchBackOfficePlans)
  .get("/billing/organizations", ...getBackOfficeOrganizations)
  .get("/billing/organizations/:organizationId", ...getBackOfficeOrganization)
  .post(
    "/billing/organizations/:organizationId/notes",
    ...postBackOfficeOrganizationNotes,
  )
  .get("/billing/payments", ...getBackOfficePayments)
  .get("/billing/payments/:paymentId", ...getBackOfficePayment)
  .post("/billing/payments/:paymentId/refund", ...postBackOfficePaymentRefund)
  .post(
    "/billing/subscriptions/:subscriptionId/activate",
    ...postActivateSubscription,
  )
  .post(
    "/billing/subscriptions/:subscriptionId/suspend",
    ...postSuspendSubscription,
  )
  .post(
    "/billing/subscriptions/:subscriptionId/reactivate",
    ...postReactivateSubscription,
  )
  .post(
    "/billing/subscriptions/:subscriptionId/extend",
    ...postExtendSubscription,
  )
  .post(
    "/billing/subscriptions/:subscriptionId/cancel",
    ...postCancelSubscription,
  )
  .post(
    "/billing/subscriptions/:subscriptionId/change-plan",
    ...postChangeSubscriptionPlan,
  );
