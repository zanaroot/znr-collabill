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

type LinkedPayment = NonNullable<
  Awaited<ReturnType<typeof findSubscriptionPaymentById>>
>;

const pollEventTypeByStatus: Partial<
  Record<PaymentProviderStatus, PaymentWebhookEventType>
> = {
  PROCESSING: "payment.processing",
  SUCCEEDED: "payment.succeeded",
  FAILED: "payment.failed",
  EXPIRED: "payment.expired",
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
}): Promise<{
  providerCheckoutId: string;
  providerPaymentId: string | null;
  checkoutUrl: string;
}> => {
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

  let updated: Awaited<ReturnType<typeof updateSubscriptionPayment>>;
  try {
    updated = await updateSubscriptionPayment(input.paymentId, {
      providerCheckoutId: session.providerCheckoutId,
      checkoutUrl: session.url,
      providerPaymentId: session.providerPaymentId,
    });
  } catch {
    await updateSubscriptionPayment(input.paymentId, {
      status: "FAILED",
      failureReason: "checkout_persist_failed",
    }).catch(() => undefined);
    throw new PaymentError("Failed to persist checkout session", 502);
  }
  if (!updated) {
    throw new PaymentError("Failed to persist checkout session", 502);
  }

  return {
    providerCheckoutId: session.providerCheckoutId,
    providerPaymentId: session.providerPaymentId,
    checkoutUrl: session.url,
  };
};

const terminalFailurePatch = (
  status: PaymentProviderStatus,
  failureReason: string | null,
) => {
  if (status === "FAILED") {
    return {
      status: "FAILED" as const,
      failureReason: failureReason ?? "checkout_failed",
    };
  }
  if (status === "EXPIRED") {
    return {
      status: "EXPIRED" as const,
      failureReason: failureReason ?? "expired",
    };
  }
  return {};
};

const reconcileLegacyCheckout = async (
  payment: LinkedPayment,
  provider: PaymentProvider,
): Promise<{
  payment: LinkedPayment;
  snapshot: PaymentStatusSnapshot | null;
} | null> => {
  if (
    !payment.providerPaymentId ||
    payment.providerCheckoutId ||
    !provider.retrieveCheckout
  ) {
    return null;
  }

  let checkout: Awaited<
    ReturnType<NonNullable<PaymentProvider["retrieveCheckout"]>>
  >;
  try {
    checkout = await provider.retrieveCheckout(payment.providerPaymentId);
  } catch {
    return null;
  }
  if (!checkout) {
    return null;
  }

  if (!checkout.providerPaymentId) {
    const updated = await updateSubscriptionPayment(payment.id, {
      providerCheckoutId: payment.providerPaymentId,
      providerPaymentId: null,
      ...terminalFailurePatch(checkout.status, checkout.failureReason),
    });
    return { payment: updated ?? payment, snapshot: null };
  }

  const linked = await linkSubscriptionPaymentSession(
    payment.id,
    checkout.providerPaymentId,
    payment.providerPaymentId,
  );
  if (!linked) {
    throw new PaymentError("Payment not found", 404);
  }

  return {
    payment: linked,
    snapshot: {
      ...checkout,
      providerPaymentId: checkout.providerPaymentId,
    },
  };
};

const reconcileCheckout = async (
  payment: LinkedPayment,
  provider: PaymentProvider,
): Promise<{
  payment: LinkedPayment;
  snapshot: PaymentStatusSnapshot | null;
}> => {
  const legacy = await reconcileLegacyCheckout(payment, provider);
  if (legacy) {
    return legacy;
  }

  if (payment.providerPaymentId) {
    return {
      payment,
      snapshot: await provider.retrievePayment(payment.providerPaymentId),
    };
  }
  if (!payment.providerCheckoutId || !provider.retrieveCheckout) {
    return { payment, snapshot: null };
  }

  const checkout = await provider.retrieveCheckout(payment.providerCheckoutId);
  if (!checkout) {
    return { payment, snapshot: null };
  }
  if (!checkout.providerPaymentId) {
    if (checkout.status === "FAILED" || checkout.status === "EXPIRED") {
      const failed = await updateSubscriptionPayment(payment.id, {
        ...terminalFailurePatch(checkout.status, checkout.failureReason),
      });
      return { payment: failed ?? payment, snapshot: null };
    }
    return { payment, snapshot: null };
  }

  const linked = await linkSubscriptionPaymentSession(
    payment.id,
    checkout.providerPaymentId,
    payment.providerCheckoutId,
  );
  if (!linked) {
    throw new PaymentError("Payment not found", 404);
  }

  return {
    payment: linked,
    snapshot: {
      ...checkout,
      providerPaymentId: checkout.providerPaymentId,
    },
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

  if (!payment.providerPaymentId && !payment.providerCheckoutId) {
    return payment;
  }

  const provider = requirePaymentProvider();

  let reconciled: Awaited<ReturnType<typeof reconcileCheckout>>;
  try {
    reconciled = await reconcileCheckout(payment, provider);
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    throw new PaymentError("Failed to retrieve payment status", 502);
  }

  const currentPayment = reconciled.payment;
  const snapshot = reconciled.snapshot;
  if (!snapshot) {
    return currentPayment;
  }

  if (
    snapshot.amountMinor !== currentPayment.amountMinor ||
    snapshot.currency !== currentPayment.currency
  ) {
    throw new PaymentError("Payment amount mismatch", 400);
  }

  const eventType = pollEventTypeByStatus[snapshot.status];
  if (!eventType) {
    return currentPayment;
  }

  const result = await processPaymentEvent(
    {
      eventId: `poll:${currentPayment.id}:${snapshot.status}`,
      type: eventType,
      providerPaymentId: snapshot.providerPaymentId,
      amountMinor: snapshot.amountMinor,
      currency: snapshot.currency,
      organizationId: currentPayment.organizationId,
      failureReason: snapshot.failureReason,
      occurredAt: snapshot.occurredAt,
    },
    currentPayment.provider,
  );

  if (result.outcome === "unknown_payment") {
    return currentPayment;
  }
  return result.payment;
};
