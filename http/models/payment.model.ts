import type { SubscriptionPaymentStatus } from "@/http/models/subscription.model";
import type { PaymentWebhookEventType } from "@/packages/payment";

export class PaymentError extends Error {
  readonly statusCode: 400 | 401 | 404 | 502 | 503;

  constructor(message: string, statusCode: 400 | 401 | 404 | 502 | 503) {
    super(message);
    this.name = "PaymentError";
    this.statusCode = statusCode;
  }
}

export type PaymentTransitionDecision =
  | "apply"
  | "already_settled"
  | "out_of_order";

export const classifyPaymentTransition = (
  status: SubscriptionPaymentStatus,
  type: PaymentWebhookEventType,
): PaymentTransitionDecision => {
  if (status === "PENDING") {
    return type === "payment.succeeded" || type === "payment.failed"
      ? "apply"
      : "out_of_order";
  }

  if (status === "SUCCEEDED") {
    if (type === "payment.refunded") return "apply";
    if (type === "payment.succeeded") return "already_settled";
    return "out_of_order";
  }

  return "out_of_order";
};
