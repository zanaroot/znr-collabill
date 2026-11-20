"server only";

import { addMonths, addYears } from "date-fns";
import { PaymentError } from "@/http/models/payment.model";
import type { SubscriptionInterval } from "@/http/models/subscription.model";
import {
  type SubscriptionEventType,
  subscriptionEventTypes,
} from "@/http/models/subscription.model";
import {
  type ApplyPaymentProviderEventInput,
  type ApplyPaymentProviderEventResult,
  applyPaymentProviderEvent,
  findSubscriptionPaymentByProviderPaymentId,
  type SubscriptionRow,
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
  "payment.processing": subscriptionEventTypes.paymentProcessing,
  "payment.succeeded": subscriptionEventTypes.paymentSucceeded,
  "payment.failed": subscriptionEventTypes.paymentFailed,
  "payment.expired": subscriptionEventTypes.paymentExpired,
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

const isLiveStatus = (status: SubscriptionRow["status"]): boolean =>
  status === "TRIALING" || status === "ACTIVE" || status === "PAST_DUE";

const addInterval = (start: Date, interval: SubscriptionInterval | null) =>
  interval === "YEARLY" ? addYears(start, 1) : addMonths(start, 1);

const buildSuccessPatch = (
  payment: {
    planId: string;
    interval: SubscriptionInterval | null;
    amountMinor: number;
    currency: string;
  },
  plan: { interval: SubscriptionInterval | null },
  providerName: string,
): {
  patch: NonNullable<ApplyPaymentProviderEventInput["subscriptionPatch"]>;
  builder: NonNullable<
    ApplyPaymentProviderEventInput["subscriptionPatchBuilder"]
  >;
} => {
  const interval = payment.interval ?? plan.interval;
  const now = new Date();

  return {
    patch: {
      planId: payment.planId,
      status: "ACTIVE",
      interval,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      provider: providerName,
      providerSubscriptionId: null,
      trialEndsAt: null,
      currentPeriodStart: now,
      currentPeriodEnd: addInterval(now, interval),
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
    builder: (current) => {
      if (!current) {
        return {};
      }

      const canRenew =
        current.planId === payment.planId &&
        (current.interval ?? null) === (interval ?? null) &&
        isLiveStatus(current.status) &&
        current.currentPeriodEnd !== null &&
        current.currentPeriodEnd.getTime() > now.getTime();

      const periodStart = canRenew ? (current.currentPeriodStart ?? now) : now;
      const periodEndBase = canRenew ? current.currentPeriodEnd : now;

      return {
        currentPeriodStart: periodStart,
        currentPeriodEnd: addInterval(periodEndBase ?? now, interval),
        providerSubscriptionId:
          current.provider === providerName
            ? current.providerSubscriptionId
            : null,
        cancelAtPeriodEnd: false,
      };
    },
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

  let success: ReturnType<typeof buildSuccessPatch> | null = null;
  if (event.type === "payment.succeeded") {
    const plan = await findSubscriptionPlanById(payment.planId);
    if (!plan) {
      throw new PaymentError("Plan not found", 404);
    }
    success = buildSuccessPatch(payment, plan, providerName);
  }

  return await applyPaymentProviderEvent({
    provider: providerName,
    eventType: eventTypeByWebhookType[event.type],
    event,
    subscriptionPatch: success?.patch,
    subscriptionPatchBuilder: success?.builder,
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
