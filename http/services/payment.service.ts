"server only";

import { PaymentError } from "@/http/models/payment.model";
import {
  findSubscriptionPaymentById,
  linkSubscriptionPaymentSession,
  updateSubscriptionPayment,
} from "@/http/repositories/payment.repository";
import { processPaymentEvent } from "@/http/services/payment-webhook.service";
import {
  getPaymentProvider,
  type PaymentCheckoutSession,
  type PaymentProvider,
  type PaymentProviderStatus,
  type PaymentStatusSnapshot,
  type PaymentWebhookEventType,
} from "@/packages/payment";

const pollEventTypeByStatus: Partial<
  Record<PaymentProviderStatus, PaymentWebhookEventType>
> = {
  SUCCEEDED: "payment.succeeded",
  FAILED: "payment.failed",
  REFUNDED: "payment.refunded",
};

export const requirePaymentProvider = (): PaymentProvider => {
  const provider = getPaymentProvider();
  if (!provider) {
    throw new PaymentError("Payment provider is not configured", 503);
  }
  return provider;
};

export const createCheckoutSession = async (input: {
  paymentId: string;
  organizationId: string;
  planCode: string;
  amountMinor: number;
  currency: string;
}): Promise<{ providerCheckoutId: string; checkoutUrl: string }> => {
  const provider = requirePaymentProvider();

  let session: PaymentCheckoutSession;
  try {
    session = await provider.createCheckoutSession({
      amountMinor: input.amountMinor,
      currency: input.currency,
      metadata: {
        paymentId: input.paymentId,
        organizationId: input.organizationId,
        planCode: input.planCode,
      },
    });
  } catch {
    await updateSubscriptionPayment(input.paymentId, {
      status: "FAILED",
      failureReason: "checkout_session_failed",
    }).catch(() => undefined);
    throw new PaymentError("Failed to create checkout session", 502);
  }

  await linkSubscriptionPaymentSession(
    input.paymentId,
    session.providerCheckoutId,
  );

  return {
    providerCheckoutId: session.providerCheckoutId,
    checkoutUrl: session.url,
  };
};

export const getPaymentStatusForOrganization = async (input: {
  organizationId: string;
  paymentId: string;
}) => {
  const payment = await findSubscriptionPaymentById(input.paymentId);
  if (!payment || payment.organizationId !== input.organizationId) {
    throw new PaymentError("Payment not found", 404);
  }

  if (!payment.providerPaymentId) {
    return payment;
  }

  const provider = requirePaymentProvider();

  let snapshot: PaymentStatusSnapshot;
  try {
    snapshot = await provider.retrievePayment(payment.providerPaymentId);
  } catch {
    throw new PaymentError("Failed to retrieve payment status", 502);
  }

  if (
    snapshot.amountMinor !== payment.amountMinor ||
    snapshot.currency !== payment.currency
  ) {
    throw new PaymentError("Payment amount mismatch", 400);
  }

  const eventType = pollEventTypeByStatus[snapshot.status];
  if (!eventType) {
    return payment;
  }

  const result = await processPaymentEvent(
    {
      eventId: `poll:${payment.id}:${snapshot.status}`,
      type: eventType,
      providerPaymentId: payment.providerPaymentId,
      amountMinor: snapshot.amountMinor,
      currency: snapshot.currency,
      organizationId: payment.organizationId,
      failureReason: snapshot.failureReason,
      occurredAt: snapshot.occurredAt,
    },
    payment.provider,
  );

  if (result.outcome === "unknown_payment") {
    return payment;
  }
  return result.payment;
};
