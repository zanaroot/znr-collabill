"server only";

import { addMonths, addYears } from "date-fns";
import { PaymentError } from "@/http/models/payment.model";
import {
  type SubscriptionEventType,
  subscriptionEventTypes,
} from "@/http/models/subscription.model";
import {
  type ApplyPaymentProviderEventInput,
  type ApplyPaymentProviderEventResult,
  applyPaymentProviderEvent,
  findSubscriptionPaymentByProviderPaymentId,
} from "@/http/repositories/payment.repository";
import { findSubscriptionPlanById } from "@/http/repositories/subscription.repository";
import {
  getPaymentProvider,
  type PaymentProvider,
  type PaymentWebhookEvent,
  type PaymentWebhookEventType,
} from "@/packages/payment";

const eventTypeByWebhookType: Record<
  PaymentWebhookEventType,
  SubscriptionEventType
> = {
  "payment.succeeded": subscriptionEventTypes.paymentSucceeded,
  "payment.failed": subscriptionEventTypes.paymentFailed,
  "payment.refunded": subscriptionEventTypes.paymentRefunded,
};

const requireConfiguredProvider = (): PaymentProvider => {
  const provider = getPaymentProvider();
  if (!provider) {
    throw new PaymentError("Payment provider is not configured", 503);
  }
  return provider;
};

const verificationError = (
  reason: "missing_signature" | "invalid_signature" | "malformed_payload",
): PaymentError => {
  if (reason === "malformed_payload") {
    return new PaymentError("Malformed webhook payload", 400);
  }
  if (reason === "missing_signature") {
    return new PaymentError("Missing webhook signature", 401);
  }
  return new PaymentError("Invalid webhook signature", 401);
};

const buildSuccessPatch = (
  payment: {
    planId: string;
    amountMinor: number;
    currency: string;
  },
  plan: { interval: "MONTHLY" | "YEARLY" | null },
  providerName: string,
): ApplyPaymentProviderEventInput["subscriptionPatch"] => {
  const now = new Date();
  const endsAt =
    plan.interval === "YEARLY" ? addYears(now, 1) : addMonths(now, 1);
  return {
    planId: payment.planId,
    status: "ACTIVE",
    interval: plan.interval,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    provider: providerName,
    providerSubscriptionId: null,
    trialEndsAt: null,
    currentPeriodStart: now,
    currentPeriodEnd: endsAt,
    cancelAtPeriodEnd: false,
    canceledAt: null,
  };
};

export const processPaymentEvent = async (
  event: PaymentWebhookEvent,
  providerName: string,
): Promise<ApplyPaymentProviderEventResult> => {
  const payment = await findSubscriptionPaymentByProviderPaymentId(
    event.providerPaymentId,
  );
  if (!payment) {
    return { outcome: "unknown_payment" };
  }

  if (
    event.amountMinor !== payment.amountMinor ||
    event.currency !== payment.currency
  ) {
    throw new PaymentError("Payment amount mismatch", 400);
  }

  if (event.organizationId && event.organizationId !== payment.organizationId) {
    throw new PaymentError("Payment organization mismatch", 400);
  }

  const plan = await findSubscriptionPlanById(payment.planId);
  if (!plan) {
    throw new PaymentError("Plan not found", 404);
  }

  const subscriptionPatch =
    event.type === "payment.succeeded"
      ? buildSuccessPatch(payment, plan, providerName)
      : undefined;

  return await applyPaymentProviderEvent({
    provider: providerName,
    eventType: eventTypeByWebhookType[event.type],
    event,
    subscriptionPatch,
  });
};

export const processPaymentWebhook = async (
  rawBody: string,
  signature: string | null,
): Promise<ApplyPaymentProviderEventResult> => {
  const provider = requireConfiguredProvider();
  const verification = provider.verifyWebhook(rawBody, signature);
  if (!verification.ok) {
    throw verificationError(verification.reason);
  }
  if (!verification.event) {
    return { outcome: "unknown_payment" };
  }
  return await processPaymentEvent(verification.event, provider.name);
};
