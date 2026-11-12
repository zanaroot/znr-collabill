import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { createFactory } from "hono/factory";
import { logAudit } from "@/http/actions/audit.action";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  cancelBillingSchema,
  changePlanSchema,
  checkoutSchema,
} from "@/http/models/billing.model";
import { PaymentError } from "@/http/models/payment.model";
import {
  BillingError,
  cancelOrganizationSubscription,
  changeOrganizationPlan,
  getOrganizationSubscription,
  initiateCheckout,
  listBillingPlans,
  listPaymentHistory,
  reactivateOrganizationSubscription,
} from "@/http/services/billing.service";
import { getOrganizationUsage } from "@/http/services/entitlement.service";
import { getPaymentStatusForOrganization } from "@/http/services/payment.service";

const factory = createFactory<AuthEnv>();

const mapBillingError = (c: Context<AuthEnv>, error: unknown) => {
  if (error instanceof BillingError || error instanceof PaymentError) {
    return c.json({ error: error.message }, error.statusCode);
  }
  throw error;
};

export const getBillingPlans = factory.createHandlers(async (c) => {
  const user = c.get("user");

  if (!user.organizationId) {
    return c.json({ error: "Organization required" }, 400);
  }

  try {
    const plans = await listBillingPlans();
    return c.json(plans);
  } catch (error) {
    return mapBillingError(c, error);
  }
});

export const getPublicBillingPlans = factory.createHandlers(async (c) => {
  try {
    const plans = await listBillingPlans();
    return c.json(plans);
  } catch (error) {
    return mapBillingError(c, error);
  }
});

export const getBillingSubscription = factory.createHandlers(async (c) => {
  const user = c.get("user");

  if (!user.organizationId) {
    return c.json({ error: "Organization required" }, 400);
  }

  try {
    const subscription = await getOrganizationSubscription(user.organizationId);
    return c.json(subscription);
  } catch (error) {
    return mapBillingError(c, error);
  }
});

export const getBillingPayments = factory.createHandlers(async (c) => {
  const user = c.get("user");

  if (!user.organizationId) {
    return c.json({ error: "Organization required" }, 400);
  }

  try {
    const payments = await listPaymentHistory(user.organizationId);
    return c.json(payments);
  } catch (error) {
    return mapBillingError(c, error);
  }
});

export const getPaymentStatus = factory.createHandlers(async (c) => {
  const user = c.get("user");
  const paymentId = c.req.param("paymentId");

  if (!user.organizationId) {
    return c.json({ error: "Organization required" }, 400);
  }

  if (!paymentId) {
    return c.json({ error: "Payment ID is required" }, 400);
  }

  try {
    const payment = await getPaymentStatusForOrganization({
      organizationId: user.organizationId,
      paymentId,
    });
    return c.json(payment);
  } catch (error) {
    return mapBillingError(c, error);
  }
});

export const postCheckout = factory.createHandlers(
  zValidator("json", checkoutSchema),
  async (c) => {
    const user = c.get("user");
    const payload = c.req.valid("json");

    if (!user.organizationId) {
      return c.json({ error: "Organization required" }, 400);
    }

    try {
      const result = await initiateCheckout({
        organizationId: user.organizationId,
        planCode: payload.planCode,
        interval: payload.interval,
      });

      await logAudit({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "CREATE",
        entity: "PAYMENT",
        entityId: result.payment.id,
        metadata: {
          planCode: result.plan.code,
          amountMinor: result.plan.amountMinor,
          interval: result.plan.interval,
          provider: result.payment.provider,
          providerCheckoutId: result.payment.providerPaymentId,
        },
      });

      return c.json(result, 201);
    } catch (error) {
      return mapBillingError(c, error);
    }
  },
);

export const postChangePlan = factory.createHandlers(
  zValidator("json", changePlanSchema),
  async (c) => {
    const user = c.get("user");
    const payload = c.req.valid("json");

    if (!user.organizationId) {
      return c.json({ error: "Organization required" }, 400);
    }

    try {
      const subscription = await changeOrganizationPlan({
        organizationId: user.organizationId,
        planCode: payload.planCode,
        interval: payload.interval,
      });

      await logAudit({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "UPDATE",
        entity: "SUBSCRIPTION",
        entityId: subscription.id,
        metadata: {
          planCode: subscription.plan.code,
          amountMinor: subscription.plan.amountMinor,
          interval: subscription.interval,
        },
      });

      return c.json(subscription);
    } catch (error) {
      return mapBillingError(c, error);
    }
  },
);

export const postCancel = factory.createHandlers(
  zValidator("json", cancelBillingSchema),
  async (c) => {
    const user = c.get("user");
    const payload = c.req.valid("json");

    if (!user.organizationId) {
      return c.json({ error: "Organization required" }, 400);
    }

    try {
      const subscription = await cancelOrganizationSubscription({
        organizationId: user.organizationId,
        atPeriodEnd: payload.atPeriodEnd,
      });

      await logAudit({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "UPDATE",
        entity: "SUBSCRIPTION",
        entityId: subscription.id,
        metadata: {
          atPeriodEnd: payload.atPeriodEnd ?? false,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        },
      });

      return c.json(subscription);
    } catch (error) {
      return mapBillingError(c, error);
    }
  },
);

export const postReactivate = factory.createHandlers(async (c) => {
  const user = c.get("user");

  if (!user.organizationId) {
    return c.json({ error: "Organization required" }, 400);
  }

  try {
    const subscription = await reactivateOrganizationSubscription({
      organizationId: user.organizationId,
    });

    await logAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "UPDATE",
      entity: "SUBSCRIPTION",
      entityId: subscription.id,
      metadata: { status: subscription.status },
    });

    return c.json(subscription);
  } catch (error) {
    return mapBillingError(c, error);
  }
});

export const getBillingUsage = factory.createHandlers(async (c) => {
  const user = c.get("user");

  if (!user.organizationId) {
    return c.json({ error: "Organization required" }, 400);
  }

  try {
    const usage = await getOrganizationUsage(user.organizationId);
    return c.json(usage);
  } catch (error) {
    return mapBillingError(c, error);
  }
});
