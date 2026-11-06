type CheckoutSessionMetadata = {
  paymentId: string;
  organizationId: string;
  planCode: string;
};

export type CreateCheckoutSessionInput = {
  amountMinor: number;
  currency: string;
  metadata: CheckoutSessionMetadata;
};

export type PaymentCheckoutSession = {
  providerCheckoutId: string;
  url: string;
  expiresAt: Date | null;
};

export type PaymentProviderStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED";

export type PaymentStatusSnapshot = {
  providerPaymentId: string;
  status: PaymentProviderStatus;
  amountMinor: number;
  currency: string;
  failureReason: string | null;
  occurredAt: string;
};

export const paymentWebhookEventTypes = [
  "payment.succeeded",
  "payment.failed",
  "payment.refunded",
] as const;

export type PaymentWebhookEventType = (typeof paymentWebhookEventTypes)[number];

export type PaymentWebhookEvent = {
  eventId: string;
  type: PaymentWebhookEventType;
  providerPaymentId: string;
  amountMinor: number;
  currency: string;
  organizationId: string | null;
  failureReason: string | null;
  occurredAt: string;
};

export type WebhookVerification =
  | { ok: true; event: PaymentWebhookEvent }
  | {
      ok: false;
      reason: "missing_signature" | "invalid_signature" | "malformed_payload";
    };

export type PaymentRefundResult = {
  providerRefundId: string;
  status: PaymentProviderStatus;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<PaymentCheckoutSession>;
  retrievePayment(providerPaymentId: string): Promise<PaymentStatusSnapshot>;
  verifyWebhook(rawBody: string, signature: string | null): WebhookVerification;
  refundPayment?(
    providerPaymentId: string,
    amountMinor?: number,
  ): Promise<PaymentRefundResult>;
}
