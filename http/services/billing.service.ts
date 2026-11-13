"server only";

import { addMonths, addYears } from "date-fns";
import {
  liveSubscriptionStatusSchema,
  type Subscription,
  type SubscriptionInterval,
  type SubscriptionPlan,
  type SubscriptionPlanCode,
  type SubscriptionWithPlan,
  subscriptionEventTypes,
} from "@/http/models/subscription.model";
import { getOrganizationById as getBillingOrganizationById } from "@/http/repositories/organization.repository";
import {
  findLatestSubscriptionByOrganizationId,
  findLiveSubscriptionWithPlan,
  findPaymentsByOrganizationId,
  findPendingPaymentByOrganizationId,
  findSubscriptionPlanByCode,
  findSubscriptionPlanById,
  insertSubscriptionPayment,
} from "@/http/repositories/subscription.repository";
import {
  createCheckoutSession,
  requirePaymentProvider,
} from "@/http/services/payment.service";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  ensureOrganizationSubscription,
  listSubscriptionPlans,
  NoLiveSubscriptionError,
  recordSubscriptionEvent,
  SubscriptionNotFoundError,
  SubscriptionPlanNotFoundError,
  setSubscriptionStatus,
} from "@/http/services/subscription.service";

export class BillingError extends Error {
  readonly statusCode: 400 | 404 | 409;

  constructor(message: string, statusCode: 400 | 404 | 409) {
    super(message);
    this.name = "BillingError";
    this.statusCode = statusCode;
  }
}

const findPlanOrThrow = async (
  planCode: SubscriptionPlanCode,
): Promise<SubscriptionPlan> => {
  const plan = await findSubscriptionPlanByCode(planCode);
  if (!plan) {
    throw new BillingError("Plan not found", 404);
  }
  return plan;
};

const isPlanActive = (plan: SubscriptionPlan): boolean => plan.active ?? true;

const isIntervalAvailable = (
  plan: SubscriptionPlan,
  interval: SubscriptionInterval,
): boolean =>
  interval === "MONTHLY"
    ? plan.amountMinor > 0
    : (plan.amountMinorYearly ?? 0) > 0;

const planPriceFor = (
  plan: SubscriptionPlan,
  interval: SubscriptionInterval,
): number =>
  interval === "YEARLY" ? (plan.amountMinorYearly ?? 0) : plan.amountMinor;

const calculateBillingPeriod = (
  start: Date,
  interval: SubscriptionInterval,
) => {
  const endsAt =
    interval === "YEARLY" ? addYears(start, 1) : addMonths(start, 1);
  return { startsAt: start, endsAt };
};

const isLiveStatus = (status: Subscription["status"]): boolean =>
  liveSubscriptionStatusSchema.safeParse(status).success;

const isPaymentExemptOrganizationSafe = async (
  organizationId: string,
): Promise<boolean> => {
  try {
    const orgRepo = await import("@/http/repositories/organization.repository");
    if (typeof orgRepo.isOrganizationPaymentExempt === "function") {
      return Boolean(await orgRepo.isOrganizationPaymentExempt(organizationId));
    }
    if (typeof orgRepo.getOrganizationPaymentExempt === "function") {
      return Boolean(
        await orgRepo.getOrganizationPaymentExempt(organizationId),
      );
    }
    const org = await getBillingOrganizationById(organizationId);
    if (!org) return false;
    const record = org as Record<string, unknown>;
    return (
      record.paymentExempt === true ||
      record.isPaymentExempt === true ||
      record.payment_exempt === true ||
      record.is_payment_exempt === true ||
      record.free === true ||
      record.isFree === true
    );
  } catch {
    return false;
  }
};

export const listBillingPlans = async (): Promise<SubscriptionPlan[]> => {
  const plans = await listSubscriptionPlans();
  return plans.filter((plan) => isPlanActive(plan));
};

export const getOrganizationSubscription = async (
  organizationId: string,
): Promise<SubscriptionWithPlan> => {
  const exempt = await isPaymentExemptOrganizationSafe(organizationId);

  const latest = await findLatestSubscriptionByOrganizationId(organizationId);

  if (exempt && !latest) {
    const plan =
      (await findSubscriptionPlanByCode("PRO")) ??
      (await findSubscriptionPlanByCode("FREE"));
    if (plan) {
      return {
        id: `exempt-${organizationId}`,
        organizationId,
        planId: plan.id,
        status: "ACTIVE",
        interval: plan.interval,
        amountMinor: 0,
        currency: plan.currency,
        provider: "internal",
        providerSubscriptionId: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan,
      } as SubscriptionWithPlan;
    }
  }

  if (!latest) {
    try {
      const { subscription } = await ensureOrganizationSubscription({
        organizationId,
      });
      return subscription;
    } catch (error) {
      if (error instanceof SubscriptionPlanNotFoundError) {
        throw new BillingError("Plan not found", 404);
      }
      throw error;
    }
  }

  const live = await findLiveSubscriptionWithPlan(organizationId);
  if (live) return live;

  const plan = await findSubscriptionPlanById(latest.planId);
  if (!plan) {
    throw new BillingError("Plan not found", 404);
  }
  return { ...latest, plan };
};

export const initiateCheckout = async (input: {
  organizationId: string;
  planCode: SubscriptionPlanCode;
  interval: SubscriptionInterval;
}) => {
  if (await isPaymentExemptOrganizationSafe(input.organizationId)) {
    throw new BillingError("Organization is payment exempt", 409);
  }
  const providerName = requirePaymentProvider().name;
  const plan = await findPlanOrThrow(input.planCode);

  if (!isPlanActive(plan)) {
    throw new BillingError("Plan is not available", 400);
  }
  if (plan.amountMinor <= 0 && (plan.amountMinorYearly ?? 0) <= 0) {
    throw new BillingError("Plan is not purchasable", 400);
  }
  if (!isIntervalAvailable(plan, input.interval)) {
    throw new BillingError("Unsupported billing interval for this plan", 400);
  }

  const price = planPriceFor(plan, input.interval);

  const current = await findLiveSubscriptionWithPlan(input.organizationId);
  if (current && current.planId === plan.id) {
    throw new BillingError("Already subscribed to this plan", 409);
  }

  const pending = await findPendingPaymentByOrganizationId(
    input.organizationId,
  );
  if (pending) {
    throw new BillingError("A checkout is already in progress", 409);
  }

  let subscriptionId = current?.id;
  if (!subscriptionId) {
    const ensured = await ensureOrganizationSubscription({
      organizationId: input.organizationId,
    });
    subscriptionId = ensured.subscription.id;
  }

  const billingPeriod = calculateBillingPeriod(new Date(), input.interval);

  const { row: payment } = await insertSubscriptionPayment({
    organizationId: input.organizationId,
    subscriptionId,
    planId: plan.id,
    status: "PENDING",
    amountMinor: price,
    currency: plan.currency,
    provider: providerName,
    providerPaymentId: null,
    paidAt: null,
    failureReason: null,
  });

  const session = await createCheckoutSession({
    paymentId: payment.id,
    organizationId: input.organizationId,
    planCode: plan.code,
    amountMinor: price,
    currency: plan.currency,
  });

  await recordSubscriptionEvent({
    organizationId: input.organizationId,
    subscriptionId,
    type: subscriptionEventTypes.checkoutInitiated,
    payload: {
      paymentId: payment.id,
      providerCheckoutId: session.providerCheckoutId,
      planCode: plan.code,
      amountMinor: price,
      interval: input.interval,
      periodStartsAt: billingPeriod.startsAt.toISOString(),
      periodEndsAt: billingPeriod.endsAt.toISOString(),
    },
  });

  return {
    payment: { ...payment, providerPaymentId: session.providerCheckoutId },
    plan,
    billingPeriod,
    checkoutUrl: session.checkoutUrl,
  };
};

export const changeOrganizationPlan = async (input: {
  organizationId: string;
  planCode: SubscriptionPlanCode;
  interval?: SubscriptionInterval;
}): Promise<SubscriptionWithPlan> => {
  if (await isPaymentExemptOrganizationSafe(input.organizationId)) {
    throw new BillingError("Organization is payment exempt", 409);
  }
  const plan = await findPlanOrThrow(input.planCode);
  if (!isPlanActive(plan)) {
    throw new BillingError("Plan is not available", 400);
  }

  const interval: SubscriptionInterval | null = input.interval ?? plan.interval;
  if (interval !== null && !isIntervalAvailable(plan, interval)) {
    throw new BillingError("Unsupported billing interval for this plan", 400);
  }
  const targetPrice = interval === null ? 0 : planPriceFor(plan, interval);

  const current = await findLiveSubscriptionWithPlan(input.organizationId);
  if (!current) {
    throw new BillingError("No active subscription to change", 409);
  }
  if (current.planId === plan.id) {
    throw new BillingError("Already subscribed to this plan", 409);
  }
  if (targetPrice > current.plan.amountMinor) {
    throw new BillingError("Upgrade requires checkout", 409);
  }

  try {
    const { subscription } = await changeSubscriptionPlan({
      organizationId: input.organizationId,
      planCode: plan.code,
      interval,
    });
    return subscription;
  } catch (error) {
    if (error instanceof SubscriptionPlanNotFoundError) {
      throw new BillingError("Plan not found", 404);
    }
    if (error instanceof NoLiveSubscriptionError) {
      throw new BillingError("No active subscription to change", 409);
    }
    throw error;
  }
};

export const cancelOrganizationSubscription = async (input: {
  organizationId: string;
  atPeriodEnd?: boolean;
}): Promise<Subscription> => {
  if (await isPaymentExemptOrganizationSafe(input.organizationId)) {
    throw new BillingError("Organization is payment exempt", 409);
  }
  const current = await findLiveSubscriptionWithPlan(input.organizationId);
  if (!current) {
    throw new BillingError("No active subscription to cancel", 409);
  }

  if (input.atPeriodEnd) {
    if (!current.currentPeriodEnd) {
      throw new BillingError(
        "Subscription has no billing period to cancel at the end of",
        400,
      );
    }
    if (current.cancelAtPeriodEnd) {
      throw new BillingError("Cancellation is already scheduled", 409);
    }
  }

  try {
    return await cancelSubscription({
      organizationId: input.organizationId,
      atPeriodEnd: input.atPeriodEnd,
    });
  } catch (error) {
    if (error instanceof NoLiveSubscriptionError) {
      throw new BillingError("No active subscription to cancel", 409);
    }
    throw error;
  }
};

export const reactivateOrganizationSubscription = async (input: {
  organizationId: string;
}): Promise<Subscription> => {
  if (await isPaymentExemptOrganizationSafe(input.organizationId)) {
    throw new BillingError("Organization is payment exempt", 409);
  }
  const latest = await findLatestSubscriptionByOrganizationId(
    input.organizationId,
  );
  if (!latest) {
    throw new BillingError("No subscription to reactivate", 409);
  }
  if (isLiveStatus(latest.status)) {
    throw new BillingError("Subscription is already active", 409);
  }

  const plan = await findSubscriptionPlanById(latest.planId);
  if (!plan) {
    throw new BillingError("Plan not found", 404);
  }

  const isPaidPlan = plan.amountMinor > 0 || (plan.amountMinorYearly ?? 0) > 0;
  if (isPaidPlan) {
    const periodEnd = latest.currentPeriodEnd;
    if (!periodEnd || periodEnd.getTime() <= Date.now()) {
      throw new BillingError(
        "Subscription period has ended; checkout required to resume",
        409,
      );
    }
  }

  try {
    return await setSubscriptionStatus({
      organizationId: input.organizationId,
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
    });
  } catch (error) {
    if (error instanceof NoLiveSubscriptionError) {
      throw new BillingError("No subscription to reactivate", 409);
    }
    if (error instanceof SubscriptionNotFoundError) {
      throw new BillingError("No subscription to reactivate", 409);
    }
    throw error;
  }
};

export const listPaymentHistory = async (organizationId: string) => {
  return await findPaymentsByOrganizationId(organizationId);
};
