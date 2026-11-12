"server only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  type CreateCheckoutSessionInput,
  type PaymentCheckoutSession,
  type PaymentProvider,
  type PaymentRefundResult,
  type PaymentStatusSnapshot,
  type PaymentWebhookEvent,
  paymentWebhookEventTypes,
  type WebhookVerification,
} from "./types";

const SIGNATURE_PREFIX = "sha256=";

const webhookEventSchema = z.object({
  eventId: z.string().min(1),
  type: z.enum(paymentWebhookEventTypes),
  providerPaymentId: z.string().min(1),
  amountMinor: z.number().int().min(0),
  currency: z.string().regex(/^[A-Z]{3}$/),
  organizationId: z.string().uuid().nullish(),
  failureReason: z.string().nullish(),
  occurredAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid occurredAt"),
});

type MockPaymentRecord = {
  status: PaymentStatusSnapshot["status"];
  amountMinor: number;
  currency: string;
  failureReason: string | null;
};

export type MockWebhookRequest = {
  rawBody: string;
  signature: string;
};

const mockPaymentStore = new Map<string, MockPaymentRecord>();

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  private readonly webhookSecret: string;
  private readonly appUrl: string;

  constructor(input: { webhookSecret: string; appUrl: string }) {
    this.webhookSecret = input.webhookSecret;
    this.appUrl = input.appUrl;
  }

  private readonly sign = (rawBody: string): string =>
    `${SIGNATURE_PREFIX}${createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex")}`;

  createCheckoutSession = async (
    input: CreateCheckoutSessionInput,
  ): Promise<PaymentCheckoutSession> => {
    const providerCheckoutId = `mock_cs_${randomUUID()}`;
    mockPaymentStore.set(providerCheckoutId, {
      status: "PENDING",
      amountMinor: input.amountMinor,
      currency: input.currency,
      failureReason: null,
    });
    return {
      providerCheckoutId,
      url: `${this.appUrl}/api/payments/mock/checkout/${providerCheckoutId}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  };

  retrievePayment = async (
    providerPaymentId: string,
  ): Promise<PaymentStatusSnapshot> => {
    const record = mockPaymentStore.get(providerPaymentId);
    if (!record) {
      throw new Error("Mock payment not found");
    }
    return {
      providerPaymentId,
      status: record.status,
      amountMinor: record.amountMinor,
      currency: record.currency,
      failureReason: record.failureReason,
      occurredAt: new Date().toISOString(),
    };
  };

  verifyWebhook = (
    rawBody: string,
    signature: string | null,
  ): WebhookVerification => {
    if (!signature) {
      return { ok: false, reason: "missing_signature" };
    }

    const expected = Buffer.from(this.sign(rawBody));
    const received = Buffer.from(signature);
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return { ok: false, reason: "invalid_signature" };
    }

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return { ok: false, reason: "malformed_payload" };
    }

    const parsed = webhookEventSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, reason: "malformed_payload" };
    }

    const data = parsed.data;
    return {
      ok: true,
      event: {
        eventId: data.eventId,
        type: data.type,
        providerPaymentId: data.providerPaymentId,
        amountMinor: data.amountMinor,
        currency: data.currency,
        organizationId: data.organizationId ?? null,
        failureReason: data.failureReason ?? null,
        occurredAt: data.occurredAt,
      },
    };
  };

  refundPayment = async (
    providerPaymentId: string,
    amountMinor?: number,
  ): Promise<PaymentRefundResult> => {
    const record = mockPaymentStore.get(providerPaymentId);
    if (!record) {
      throw new Error("Mock payment not found");
    }
    if (amountMinor !== undefined && amountMinor !== record.amountMinor) {
      throw new Error("Mock provider only supports full refunds");
    }
    record.status = "REFUNDED";
    record.failureReason = null;
    return { providerRefundId: `mock_rf_${randomUUID()}`, status: "SUCCEEDED" };
  };

  buildWebhookRequest = (event: PaymentWebhookEvent): MockWebhookRequest => {
    const rawBody = JSON.stringify(event);
    return { rawBody, signature: this.sign(rawBody) };
  };

  recordPaymentOutcome = (
    providerPaymentId: string,
    outcome: "SUCCEEDED" | "FAILED" | "REFUNDED",
    seed?: { amountMinor: number; currency: string },
  ): void => {
    const record = mockPaymentStore.get(providerPaymentId);
    if (!record) {
      if (!seed) {
        throw new Error("Mock payment not found");
      }
      mockPaymentStore.set(providerPaymentId, {
        status: outcome,
        amountMinor: seed.amountMinor,
        currency: seed.currency,
        failureReason: null,
      });
      return;
    }
    record.status = outcome;
    record.failureReason = outcome === "FAILED" ? "mock_card_declined" : null;
  };
}
