"server only";

import { z } from "zod";
import { PaymentError } from "@/http/models/payment.model";
import {
  type ApplyPaymentProviderEventResult,
  findSubscriptionPaymentById,
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
}) => {
  const byProviderId = await findSubscriptionPaymentByProviderPaymentId(
    input.providerPaymentId,
  );
  const byOrderId =
    input.orderId && z.uuid().safeParse(input.orderId).success
      ? await findSubscriptionPaymentById(input.orderId)
      : null;

  if (byProviderId && byOrderId && byProviderId.id !== byOrderId.id) {
    throw new PaymentError("Payment reference mismatch", 400);
  }

  const payment = byProviderId ?? byOrderId;
  if (!payment) {
    throw new PaymentError("Payment not found", 404);
  }
  if (
    payment.provider !== "nowpayments" ||
    (payment.providerPaymentId !== null &&
      payment.providerPaymentId !== input.providerPaymentId)
  ) {
    throw new PaymentError("Payment reference mismatch", 400);
  }
  if (!payment.providerPaymentId) {
    await linkSubscriptionPaymentSession(payment.id, input.providerPaymentId);
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
  });

  return await processPaymentEvent(event, "nowpayments");
};
