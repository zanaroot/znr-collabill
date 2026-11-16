"server only";

import { z } from "zod";
import { PaymentError } from "@/http/models/payment.model";
import {
  type ApplyPaymentProviderEventResult,
  findSubscriptionPaymentById,
  findSubscriptionPaymentByProviderCheckoutId,
  findSubscriptionPaymentByProviderPaymentId,
  linkSubscriptionPaymentSession,
} from "@/http/repositories/payment.repository";
import { processPaymentEvent } from "@/http/services/payment-webhook.service";
import { serverEnv } from "@/packages/env/server";
import {
  buildNowpaymentsIpnEvent,
  verifyNowpaymentsIpn,
} from "@/packages/payment";

export type NowpaymentsWebhookResult =
  | ApplyPaymentProviderEventResult
  | { outcome: "in_flight" };

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

const resolvePayment = async (input: {
  providerPaymentId: string;
  orderId: string | null;
  invoiceId: string | null;
}) => {
  const [byProviderId, byCheckoutId, byOrderId] = await Promise.all([
    findSubscriptionPaymentByProviderPaymentId(input.providerPaymentId),
    input.invoiceId
      ? findSubscriptionPaymentByProviderCheckoutId(input.invoiceId)
      : null,
    input.orderId && z.uuid().safeParse(input.orderId).success
      ? findSubscriptionPaymentById(input.orderId)
      : null,
  ]);

  const candidates = [byProviderId, byCheckoutId, byOrderId].filter(
    (payment): payment is NonNullable<typeof payment> => payment != null,
  );
  if (new Set(candidates.map((payment) => payment.id)).size > 1) {
    throw new PaymentError("Payment reference mismatch", 400);
  }

  const payment = candidates[0];
  if (!payment) {
    throw new PaymentError("Payment not found", 404);
  }
  if (payment.provider !== "nowpayments") {
    throw new PaymentError("Payment reference mismatch", 400);
  }
  if (
    input.invoiceId &&
    payment.providerCheckoutId &&
    input.invoiceId !== payment.providerCheckoutId
  ) {
    throw new PaymentError("Payment reference mismatch", 400);
  }

  if (
    payment.providerPaymentId &&
    payment.providerPaymentId !== input.providerPaymentId
  ) {
    const matchedByProvider = byProviderId?.id === payment.id;
    const matchedByOrderOrInvoice =
      byOrderId?.id === payment.id || byCheckoutId?.id === payment.id;
    if (matchedByProvider || !matchedByOrderOrInvoice) {
      throw new PaymentError("Payment reference mismatch", 400);
    }

    const linked = await linkSubscriptionPaymentSession(
      payment.id,
      input.providerPaymentId,
      payment.providerCheckoutId ??
        input.invoiceId ??
        payment.providerPaymentId,
    );
    if (!linked) {
      throw new PaymentError("Payment not found", 404);
    }
    return linked;
  }

  if (!payment.providerPaymentId) {
    const linked = await linkSubscriptionPaymentSession(
      payment.id,
      input.providerPaymentId,
      payment.providerCheckoutId ?? input.invoiceId ?? undefined,
    );
    if (!linked) {
      throw new PaymentError("Payment not found", 404);
    }
    return linked;
  }

  if (!payment.providerCheckoutId && input.invoiceId) {
    const linked = await linkSubscriptionPaymentSession(
      payment.id,
      input.providerPaymentId,
      input.invoiceId,
    );
    if (!linked) {
      throw new PaymentError("Payment not found", 404);
    }
    return linked;
  }

  return payment;
};

export const processNowpaymentsWebhook = async (
  rawBody: string,
  signature: string | null,
): Promise<NowpaymentsWebhookResult> => {
  const ipnSecret = serverEnv.NOWPAYMENTS_IPN_SECRET;
  if (!ipnSecret) {
    throw new PaymentError("NOWPayments IPN is not configured", 503);
  }

  const verification = verifyNowpaymentsIpn(rawBody, signature, ipnSecret);
  if (!verification.ok) {
    throw verificationError(verification.reason);
  }

  const payload = verification.payload;
  const event = buildNowpaymentsIpnEvent(payload);
  if (!event) {
    return { outcome: "in_flight" };
  }

  await resolvePayment({
    providerPaymentId: payload.paymentId,
    orderId: payload.orderId,
    invoiceId: payload.invoiceId,
  });

  return await processPaymentEvent(event, "nowpayments");
};
