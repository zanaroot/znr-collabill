"server only";

import { logAudit } from "@/http/actions/audit.action";
import type { ListPaymentsQuery } from "@/http/models/back-office.model";
import { PaymentError } from "@/http/models/payment.model";
import type { SubscriptionPayment } from "@/http/models/subscription.model";
import {
  findSubscriptionPaymentDetailAdmin,
  listSubscriptionPaymentsAdmin,
} from "@/http/repositories/payment.repository";
import { BackOfficeError } from "@/http/services/back-office.service";
import { processPaymentEvent } from "@/http/services/payment-webhook.service";
import { getPaymentProvider } from "@/packages/payment";

export const listPaymentsForAdmin = async (filters: ListPaymentsQuery) => {
  return await listSubscriptionPaymentsAdmin(filters);
};

const resolveRefundSupport = () => {
  const provider = getPaymentProvider();
  if (!provider) {
    return { configured: false, supported: false };
  }
  return {
    configured: true,
    supported: typeof provider.refundPayment === "function",
  };
};

export const getPaymentForAdmin = async (paymentId: string) => {
  const detail = await findSubscriptionPaymentDetailAdmin(paymentId);
  if (!detail) {
    throw new BackOfficeError("Payment not found", 404);
  }

  return {
    ...detail,
    refund: resolveRefundSupport(),
  };
};

export const refundPaymentAsAdmin = async (input: {
  paymentId: string;
  actorId: string;
}): Promise<SubscriptionPayment> => {
  const payment = await findSubscriptionPaymentDetailAdmin(input.paymentId);
  if (!payment) {
    throw new BackOfficeError("Payment not found", 404);
  }

  const row = payment.payment;
  if (row.status !== "SUCCEEDED") {
    throw new BackOfficeError("Only succeeded payments can be refunded", 409);
  }
  if (!row.providerPaymentId) {
    throw new BackOfficeError("Payment has no provider reference", 409);
  }

  const provider = getPaymentProvider();
  if (!provider) {
    throw new BackOfficeError("Payment provider is not configured", 503);
  }
  if (typeof provider.refundPayment !== "function") {
    throw new BackOfficeError(
      "The configured payment provider does not support refunds",
      400,
    );
  }

  let providerRefundId: string;
  try {
    const result = await provider.refundPayment(
      row.providerPaymentId,
      row.amountMinor,
    );
    if (result.status !== "SUCCEEDED" && result.status !== "REFUNDED") {
      throw new BackOfficeError("Provider did not confirm the refund", 502);
    }
    providerRefundId = result.providerRefundId;
  } catch (error) {
    if (error instanceof BackOfficeError) throw error;
    const message =
      error instanceof PaymentError || error instanceof Error
        ? error.message
        : "unknown error";
    throw new BackOfficeError(`Provider refund failed: ${message}`, 502);
  }

  const outcome = await processPaymentEvent(
    {
      eventId: providerRefundId,
      type: "payment.refunded",
      providerPaymentId: row.providerPaymentId,
      amountMinor: row.amountMinor,
      currency: row.currency,
      organizationId: row.organizationId,
      failureReason: null,
      occurredAt: new Date().toISOString(),
    },
    provider.name,
  );

  if (outcome.outcome !== "processed") {
    throw new BackOfficeError("Refund could not be recorded", 409);
  }

  await logAudit({
    organizationId: row.organizationId,
    actorId: input.actorId,
    action: "UPDATE",
    entity: "PAYMENT",
    entityId: row.id,
    metadata: {
      operation: "refund",
      providerRefundId,
      amountMinor: row.amountMinor,
      currency: row.currency,
    },
  });

  return outcome.payment;
};
