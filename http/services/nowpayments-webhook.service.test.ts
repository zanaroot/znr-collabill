import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSubscriptionPaymentById: vi.fn(),
  findSubscriptionPaymentByProviderPaymentId: vi.fn(),
  linkSubscriptionPaymentSession: vi.fn(),
  applyPaymentProviderEvent: vi.fn(),
  findSubscriptionPlanById: vi.fn(),
  serverEnv: {
    NOWPAYMENTS_IPN_SECRET: "test-ipn-secret",
  },
}));

vi.mock("@/http/repositories/payment.repository", () => ({
  findSubscriptionPaymentById: mocks.findSubscriptionPaymentById,
  findSubscriptionPaymentByProviderPaymentId:
    mocks.findSubscriptionPaymentByProviderPaymentId,
  linkSubscriptionPaymentSession: mocks.linkSubscriptionPaymentSession,
  applyPaymentProviderEvent: mocks.applyPaymentProviderEvent,
}));
vi.mock("@/http/repositories/subscription.repository", () => ({
  findSubscriptionPlanById: mocks.findSubscriptionPlanById,
}));
vi.mock("@/packages/env/server", () => ({ serverEnv: mocks.serverEnv }));

import {
  classifyPaymentTransition,
  PaymentError,
} from "@/http/models/payment.model";
import { processNowpaymentsWebhook } from "@/http/services/nowpayments-webhook.service";
import { signNowpaymentsIpn } from "@/packages/payment";

const ipnSecret = "test-ipn-secret";
const organizationId = "11111111-1111-4111-8111-111111111111";
const subscriptionId = "22222222-2222-4222-8222-222222222222";
const planId = "33333333-3333-4333-8333-333333333333";
const paymentId = "66666666-6666-4666-8666-666666666666";
const otherPaymentId = "77777777-7777-4777-8777-777777777777";
const providerPaymentId = "123456789";

const linkedPayment = {
  id: paymentId,
  organizationId,
  subscriptionId,
  planId,
  status: "PENDING" as const,
  amountMinor: 1900,
  currency: "USD",
  provider: "nowpayments",
  providerPaymentId,
  paidAt: null,
  failureReason: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const plan = {
  id: planId,
  code: "PRO" as const,
  name: "Pro",
  description: null,
  amountMinor: 1900,
  currency: "USD",
  interval: "MONTHLY" as const,
  maxMembers: null,
  maxProjects: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const buildPayload = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  payment_id: Number(providerPaymentId),
  payment_status: "finished",
  price_amount: 19,
  price_currency: "usd",
  order_id: paymentId,
  updated_at: "2026-01-02T00:00:00.000Z",
  ...overrides,
});

const signRequest = (payload: Record<string, unknown>) => ({
  rawBody: JSON.stringify(payload),
  signature: signNowpaymentsIpn(payload, ipnSecret),
});

const expectPaymentError = async (
  promise: Promise<unknown>,
  statusCode: number,
  message?: string,
) => {
  await expect(promise).rejects.toSatisfy(
    (error: unknown) =>
      error instanceof PaymentError &&
      error.statusCode === statusCode &&
      (message === undefined || error.message === message),
  );
};

const processedResult = {
  outcome: "processed" as const,
  payment: { ...linkedPayment, status: "SUCCEEDED" as const },
  subscription: { id: subscriptionId },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.serverEnv.NOWPAYMENTS_IPN_SECRET = ipnSecret;
});

describe("signature verification", () => {
  it("rejects a request without a signature", async () => {
    await expectPaymentError(
      processNowpaymentsWebhook(JSON.stringify(buildPayload()), null),
      401,
      "Missing webhook signature",
    );
    expect(
      mocks.findSubscriptionPaymentByProviderPaymentId,
    ).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature before touching the database", async () => {
    const { rawBody } = signRequest(buildPayload());

    await expectPaymentError(
      processNowpaymentsWebhook(rawBody, "0".repeat(128)),
      401,
      "Invalid webhook signature",
    );
    expect(
      mocks.findSubscriptionPaymentByProviderPaymentId,
    ).not.toHaveBeenCalled();
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with a valid-looking signature", async () => {
    await expectPaymentError(
      processNowpaymentsWebhook("{not-json", "0".repeat(128)),
      400,
      "Malformed webhook payload",
    );
    expect(
      mocks.findSubscriptionPaymentByProviderPaymentId,
    ).not.toHaveBeenCalled();
  });

  it("rejects a signed payload that fails schema validation", async () => {
    const payload = buildPayload({ payment_status: "bogus" });
    const { rawBody, signature } = signRequest(payload);

    await expectPaymentError(
      processNowpaymentsWebhook(rawBody, signature),
      400,
      "Malformed webhook payload",
    );
    expect(
      mocks.findSubscriptionPaymentByProviderPaymentId,
    ).not.toHaveBeenCalled();
  });

  it("returns 503 when the IPN secret is not configured", async () => {
    mocks.serverEnv.NOWPAYMENTS_IPN_SECRET = undefined as never;
    const { rawBody, signature } = signRequest(buildPayload());

    await expectPaymentError(
      processNowpaymentsWebhook(rawBody, signature),
      503,
      "NOWPayments IPN is not configured",
    );
  });
});

describe("payment resolution", () => {
  beforeEach(() => {
    mocks.findSubscriptionPlanById.mockResolvedValue(plan);
    mocks.applyPaymentProviderEvent.mockResolvedValue(processedResult);
  });

  it("processes a finished payment linked by payment id", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      linkedPayment,
    );
    mocks.findSubscriptionPaymentById.mockResolvedValue(linkedPayment);

    const { rawBody, signature } = signRequest(buildPayload());
    const result = await processNowpaymentsWebhook(rawBody, signature);

    expect(result.outcome).toBe("processed");
    expect(mocks.linkSubscriptionPaymentSession).not.toHaveBeenCalled();
    expect(mocks.applyPaymentProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "nowpayments",
        eventType: "PAYMENT_SUCCEEDED",
        event: expect.objectContaining({
          eventId: `nowpayments:${providerPaymentId}:finished`,
          type: "payment.succeeded",
          providerPaymentId,
          amountMinor: 1900,
          currency: "USD",
          organizationId: null,
        }),
        subscriptionPatch: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });

  it("links an unlinked payment resolved through order_id", async () => {
    const unlinked = { ...linkedPayment, providerPaymentId: null };
    mocks.findSubscriptionPaymentByProviderPaymentId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...unlinked, providerPaymentId });
    mocks.findSubscriptionPaymentById.mockResolvedValue(unlinked);
    mocks.linkSubscriptionPaymentSession.mockResolvedValue(unlinked);

    const { rawBody, signature } = signRequest(buildPayload());
    const result = await processNowpaymentsWebhook(rawBody, signature);

    expect(result.outcome).toBe("processed");
    expect(mocks.linkSubscriptionPaymentSession).toHaveBeenCalledWith(
      paymentId,
      providerPaymentId,
    );
  });

  it("returns 404 when no payment reference matches", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(null);
    mocks.findSubscriptionPaymentById.mockResolvedValue(null);

    const { rawBody, signature } = signRequest(buildPayload());

    await expectPaymentError(
      processNowpaymentsWebhook(rawBody, signature),
      404,
      "Payment not found",
    );
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("rejects a webhook whose payment_id and order_id reference different payments", async () => {
    const otherPayment = { ...linkedPayment, id: otherPaymentId };
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      linkedPayment,
    );
    mocks.findSubscriptionPaymentById.mockResolvedValue(otherPayment);

    const { rawBody, signature } = signRequest(
      buildPayload({ order_id: otherPaymentId }),
    );

    await expectPaymentError(
      processNowpaymentsWebhook(rawBody, signature),
      400,
      "Payment reference mismatch",
    );
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
    expect(mocks.linkSubscriptionPaymentSession).not.toHaveBeenCalled();
  });

  it("rejects a webhook for a payment owned by another organization", async () => {
    const foreignPayment = {
      ...linkedPayment,
      organizationId: "99999999-9999-4999-9999-999999999999",
      id: otherPaymentId,
      providerPaymentId: null,
    };
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      linkedPayment,
    );
    mocks.findSubscriptionPaymentById.mockResolvedValue(foreignPayment);

    const { rawBody, signature } = signRequest(
      buildPayload({ order_id: otherPaymentId }),
    );

    await expectPaymentError(
      processNowpaymentsWebhook(rawBody, signature),
      400,
      "Payment reference mismatch",
    );
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("rejects a webhook for a payment created by a different provider", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue({
      ...linkedPayment,
      provider: "mock",
      providerPaymentId: providerPaymentId,
    });
    mocks.findSubscriptionPaymentById.mockResolvedValue(null);

    const { rawBody, signature } = signRequest(buildPayload());

    await expectPaymentError(
      processNowpaymentsWebhook(rawBody, signature),
      400,
      "Payment reference mismatch",
    );
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("rejects an amount mismatch", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      linkedPayment,
    );
    mocks.findSubscriptionPaymentById.mockResolvedValue(linkedPayment);

    const { rawBody, signature } = signRequest(
      buildPayload({ price_amount: 10 }),
    );

    await expectPaymentError(
      processNowpaymentsWebhook(rawBody, signature),
      400,
      "Payment amount mismatch",
    );
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("rejects a currency mismatch", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      linkedPayment,
    );
    mocks.findSubscriptionPaymentById.mockResolvedValue(linkedPayment);

    const { rawBody, signature } = signRequest(
      buildPayload({ price_currency: "eur" }),
    );

    await expectPaymentError(
      processNowpaymentsWebhook(rawBody, signature),
      400,
      "Payment amount mismatch",
    );
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("propagates database transaction failures", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      linkedPayment,
    );
    mocks.findSubscriptionPaymentById.mockResolvedValue(linkedPayment);
    mocks.applyPaymentProviderEvent.mockRejectedValue(
      new Error("transaction aborted"),
    );

    const { rawBody, signature } = signRequest(buildPayload());

    await expect(processNowpaymentsWebhook(rawBody, signature)).rejects.toThrow(
      "transaction aborted",
    );
  });

  it("returns a duplicate result for a repeated notification", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      linkedPayment,
    );
    mocks.findSubscriptionPaymentById.mockResolvedValue(linkedPayment);
    mocks.applyPaymentProviderEvent.mockResolvedValue({
      outcome: "duplicate",
      payment: linkedPayment,
    });

    const { rawBody, signature } = signRequest(buildPayload());
    const result = await processNowpaymentsWebhook(rawBody, signature);

    expect(result).toEqual({ outcome: "duplicate", payment: linkedPayment });
  });

  it("passes through an ignored out-of-order notification", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue({
      ...linkedPayment,
      status: "SUCCEEDED",
    });
    mocks.findSubscriptionPaymentById.mockResolvedValue({
      ...linkedPayment,
      status: "SUCCEEDED",
    });
    mocks.applyPaymentProviderEvent.mockResolvedValue({
      outcome: "ignored",
      reason: "out_of_order",
      payment: { ...linkedPayment, status: "SUCCEEDED" },
    });

    const { rawBody, signature } = signRequest(
      buildPayload({ payment_status: "failed" }),
    );
    const result = await processNowpaymentsWebhook(rawBody, signature);

    expect(result).toEqual({
      outcome: "ignored",
      reason: "out_of_order",
      payment: expect.anything(),
    });
    expect(mocks.applyPaymentProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PAYMENT_FAILED",
        event: expect.objectContaining({
          eventId: `nowpayments:${providerPaymentId}:failed`,
          failureReason: "failed",
        }),
      }),
    );
  });
});

describe("in-flight statuses", () => {
  it.each([
    "waiting",
    "confirming",
    "confirmed",
    "sending",
    "partially_paid",
  ])("acknowledges %s without writing to the database", async (status) => {
    const { rawBody, signature } = signRequest(
      buildPayload({ payment_status: status }),
    );

    const result = await processNowpaymentsWebhook(rawBody, signature);

    expect(result).toEqual({ outcome: "in_flight" });
    expect(
      mocks.findSubscriptionPaymentByProviderPaymentId,
    ).not.toHaveBeenCalled();
    expect(mocks.findSubscriptionPaymentById).not.toHaveBeenCalled();
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("does not mark a partially paid payment as succeeded", async () => {
    const { rawBody, signature } = signRequest(
      buildPayload({ payment_status: "partially_paid", actually_paid: 5 }),
    );

    const result = await processNowpaymentsWebhook(rawBody, signature);

    expect(result.outcome).toBe("in_flight");
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });
});

describe("terminal statuses", () => {
  beforeEach(() => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      linkedPayment,
    );
    mocks.findSubscriptionPaymentById.mockResolvedValue(linkedPayment);
    mocks.findSubscriptionPlanById.mockResolvedValue(plan);
    mocks.applyPaymentProviderEvent.mockResolvedValue({
      outcome: "processed",
      payment: { ...linkedPayment, status: "FAILED" },
      subscription: null,
    });
  });

  it.each([
    ["failed", "failed"],
    ["expired", "expired"],
  ])("marks a %s payment as failed with reason %s", async (status, reason) => {
    const { rawBody, signature } = signRequest(
      buildPayload({ payment_status: status }),
    );
    const result = await processNowpaymentsWebhook(rawBody, signature);

    expect(result.outcome).toBe("processed");
    expect(mocks.applyPaymentProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PAYMENT_FAILED",
        subscriptionPatch: undefined,
        event: expect.objectContaining({
          eventId: `nowpayments:${providerPaymentId}:${status}`,
          failureReason: reason,
        }),
      }),
    );
  });

  it("marks a refunded payment as refunded", async () => {
    const succeeded = { ...linkedPayment, status: "SUCCEEDED" as const };
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      succeeded,
    );
    mocks.findSubscriptionPaymentById.mockResolvedValue(succeeded);

    const { rawBody, signature } = signRequest(
      buildPayload({ payment_status: "refunded" }),
    );
    const result = await processNowpaymentsWebhook(rawBody, signature);

    expect(result.outcome).toBe("processed");
    expect(mocks.applyPaymentProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PAYMENT_REFUNDED",
        subscriptionPatch: undefined,
        event: expect.objectContaining({
          type: "payment.refunded",
          failureReason: null,
        }),
      }),
    );
  });
});

describe("status transition rules", () => {
  it("applies a success only while the payment is pending", () => {
    expect(classifyPaymentTransition("PENDING", "payment.succeeded")).toBe(
      "apply",
    );
    expect(classifyPaymentTransition("PENDING", "payment.failed")).toBe(
      "apply",
    );
  });

  it("rejects a failed notification after the payment succeeded", () => {
    expect(classifyPaymentTransition("SUCCEEDED", "payment.failed")).toBe(
      "out_of_order",
    );
  });

  it("rejects a repeated success", () => {
    expect(classifyPaymentTransition("SUCCEEDED", "payment.succeeded")).toBe(
      "already_settled",
    );
  });

  it("rejects a refund while the payment is still pending", () => {
    expect(classifyPaymentTransition("PENDING", "payment.refunded")).toBe(
      "out_of_order",
    );
  });

  it("keeps terminal payments terminal", () => {
    expect(classifyPaymentTransition("FAILED", "payment.succeeded")).toBe(
      "out_of_order",
    );
    expect(classifyPaymentTransition("REFUNDED", "payment.succeeded")).toBe(
      "out_of_order",
    );
    expect(classifyPaymentTransition("REFUNDED", "payment.refunded")).toBe(
      "out_of_order",
    );
  });
});
