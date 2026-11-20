import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSubscriptionPaymentByProviderPaymentId: vi.fn(),
  applyPaymentProviderEvent: vi.fn(),
  findSubscriptionPlanById: vi.fn(),
  serverEnv: {
    PAYMENT_WEBHOOK_SECRET: "test-webhook-secret",
    PAYMENT_PROVIDER: "mock",
    NODE_ENV: "test",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

vi.mock("@/http/repositories/payment.repository", () => ({
  findSubscriptionPaymentByProviderPaymentId:
    mocks.findSubscriptionPaymentByProviderPaymentId,
  applyPaymentProviderEvent: mocks.applyPaymentProviderEvent,
}));
vi.mock("@/http/repositories/subscription.repository", () => ({
  findSubscriptionPlanById: mocks.findSubscriptionPlanById,
}));
vi.mock("@/packages/env/server", () => ({ serverEnv: mocks.serverEnv }));

import { PaymentError } from "@/http/models/payment.model";
import {
  processPaymentEvent,
  processPaymentWebhook,
} from "@/http/services/payment-webhook.service";
import {
  MockPaymentProvider,
  type PaymentWebhookEvent,
} from "@/packages/payment";

const provider = new MockPaymentProvider({
  webhookSecret: "test-webhook-secret",
  appUrl: "http://localhost:3000",
});

const organizationId = "11111111-1111-4111-8111-111111111111";
const subscriptionId = "22222222-2222-4222-8222-222222222222";
const planId = "33333333-3333-4333-8333-333333333333";

const pendingPayment = {
  id: "66666666-6666-4666-8666-666666666666",
  organizationId,
  subscriptionId,
  planId,
  status: "PENDING" as const,
  amountMinor: 1900,
  currency: "USD",
  provider: "mock",
  providerPaymentId: "cs_mock_1",
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

const successEvent: PaymentWebhookEvent = {
  eventId: "evt_1",
  type: "payment.succeeded",
  providerPaymentId: "cs_mock_1",
  amountMinor: 1900,
  currency: "USD",
  organizationId,
  failureReason: null,
  occurredAt: "2026-01-02T00:00:00.000Z",
};

const buildEvent = (
  overrides: Partial<PaymentWebhookEvent>,
): PaymentWebhookEvent => ({
  ...successEvent,
  ...overrides,
});

const processedResult = {
  outcome: "processed" as const,
  payment: { ...pendingPayment, status: "SUCCEEDED" as const },
  subscription: { id: subscriptionId },
};

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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.serverEnv.PAYMENT_WEBHOOK_SECRET = "test-webhook-secret";
});

describe("processPaymentWebhook", () => {
  it("rejects a request without a signature", async () => {
    await expectPaymentError(
      processPaymentWebhook(JSON.stringify(successEvent), null),
      401,
      "Missing webhook signature",
    );
    expect(
      mocks.findSubscriptionPaymentByProviderPaymentId,
    ).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature", async () => {
    const { rawBody } = provider.buildWebhookRequest(successEvent);

    await expectPaymentError(
      processPaymentWebhook(rawBody, `sha256=${"0".repeat(64)}`),
      401,
      "Invalid webhook signature",
    );
    expect(
      mocks.findSubscriptionPaymentByProviderPaymentId,
    ).not.toHaveBeenCalled();
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("rejects a valid signature over a malformed payload", async () => {
    const { rawBody, signature } = provider.buildWebhookRequest({
      bogus: true,
    } as unknown as PaymentWebhookEvent);

    await expectPaymentError(
      processPaymentWebhook(rawBody, signature),
      400,
      "Malformed webhook payload",
    );
    expect(
      mocks.findSubscriptionPaymentByProviderPaymentId,
    ).not.toHaveBeenCalled();
  });

  it("returns 503 when no provider is configured", async () => {
    mocks.serverEnv.PAYMENT_WEBHOOK_SECRET = undefined as never;
    const { rawBody, signature } = provider.buildWebhookRequest(successEvent);

    await expectPaymentError(
      processPaymentWebhook(rawBody, signature),
      503,
      "Payment provider is not configured",
    );
    expect(
      mocks.findSubscriptionPaymentByProviderPaymentId,
    ).not.toHaveBeenCalled();
  });

  it("verifies and applies a correctly signed success event", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      pendingPayment,
    );
    mocks.findSubscriptionPlanById.mockResolvedValue(plan);
    mocks.applyPaymentProviderEvent.mockResolvedValue(processedResult);
    const { rawBody, signature } = provider.buildWebhookRequest(successEvent);

    const result = await processPaymentWebhook(rawBody, signature);

    expect(result.outcome).toBe("processed");
    expect(mocks.applyPaymentProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "mock",
        eventType: "PAYMENT_SUCCEEDED",
        event: expect.objectContaining({ eventId: "evt_1" }),
      }),
    );
  });
});

describe("processPaymentEvent", () => {
  beforeEach(() => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
      pendingPayment,
    );
    mocks.findSubscriptionPlanById.mockResolvedValue(plan);
    mocks.applyPaymentProviderEvent.mockResolvedValue(processedResult);
  });

  it("ignores an event for an unknown payment", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(null);

    const result = await processPaymentEvent(successEvent, "mock");

    expect(result).toEqual({ outcome: "unknown_payment" });
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
    expect(mocks.findSubscriptionPlanById).not.toHaveBeenCalled();
  });

  it("rejects an amount mismatch", async () => {
    await expectPaymentError(
      processPaymentEvent(buildEvent({ amountMinor: 100 }), "mock"),
      400,
      "Payment amount mismatch",
    );
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("rejects a currency mismatch", async () => {
    await expectPaymentError(
      processPaymentEvent(buildEvent({ currency: "EUR" }), "mock"),
      400,
      "Payment amount mismatch",
    );
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("rejects an event attributed to another organization", async () => {
    await expectPaymentError(
      processPaymentEvent(
        buildEvent({ organizationId: "99999999-9999-4999-9999-999999999999" }),
        "mock",
      ),
      400,
      "Payment organization mismatch",
    );
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("rejects an event whose plan no longer exists", async () => {
    mocks.findSubscriptionPlanById.mockResolvedValue(null);

    await expectPaymentError(
      processPaymentEvent(successEvent, "mock"),
      404,
      "Plan not found",
    );
    expect(mocks.applyPaymentProviderEvent).not.toHaveBeenCalled();
  });

  it("activates the subscription for a successful payment", async () => {
    await processPaymentEvent(successEvent, "mock");

    expect(mocks.applyPaymentProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "mock",
        eventType: "PAYMENT_SUCCEEDED",
        subscriptionPatch: expect.objectContaining({
          status: "ACTIVE",
          planId,
          interval: "MONTHLY",
          amountMinor: 1900,
          currency: "USD",
          provider: "mock",
          cancelAtPeriodEnd: false,
          canceledAt: null,
          trialEndsAt: null,
          currentPeriodStart: expect.any(Date),
          currentPeriodEnd: expect.any(Date),
        }),
      }),
    );
    const patch = mocks.applyPaymentProviderEvent.mock.calls[0]?.[0];
    const periodStart = patch?.subscriptionPatch.currentPeriodStart as Date;
    const periodEnd = patch?.subscriptionPatch.currentPeriodEnd as Date;
    const day = 24 * 60 * 60 * 1000;
    expect(periodEnd.getTime() - periodStart.getTime()).toBeGreaterThan(
      27 * day,
    );
    expect(periodEnd.getTime() - periodStart.getTime()).toBeLessThan(32 * day);
  });

  it("extends the period by a year for yearly plans", async () => {
    mocks.findSubscriptionPlanById.mockResolvedValue({
      ...plan,
      interval: "YEARLY",
    });

    await processPaymentEvent(successEvent, "mock");

    const patch = mocks.applyPaymentProviderEvent.mock.calls[0]?.[0];
    const periodStart = patch?.subscriptionPatch.currentPeriodStart as Date;
    const periodEnd = patch?.subscriptionPatch.currentPeriodEnd as Date;
    const day = 24 * 60 * 60 * 1000;
    expect(periodEnd.getTime() - periodStart.getTime()).toBeGreaterThan(
      360 * day,
    );
  });

  it("does not patch the subscription for a failed payment", async () => {
    await processPaymentEvent(
      buildEvent({ type: "payment.failed", failureReason: "declined" }),
      "mock",
    );

    expect(mocks.applyPaymentProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PAYMENT_FAILED",
        subscriptionPatch: undefined,
      }),
    );
  });

  it("does not patch the subscription for an expired payment", async () => {
    await processPaymentEvent(
      buildEvent({ type: "payment.expired", failureReason: "expired" }),
      "mock",
    );

    expect(mocks.applyPaymentProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PAYMENT_EXPIRED",
        subscriptionPatch: undefined,
      }),
    );
    expect(mocks.findSubscriptionPlanById).not.toHaveBeenCalled();
  });

  it("does not patch the subscription for a processing payment", async () => {
    await processPaymentEvent(
      buildEvent({ type: "payment.processing" }),
      "mock",
    );

    expect(mocks.applyPaymentProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PAYMENT_PROCESSING",
        subscriptionPatch: undefined,
      }),
    );
    expect(mocks.findSubscriptionPlanById).not.toHaveBeenCalled();
  });

  it("uses the interval stored on the payment when activating", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue({
      ...pendingPayment,
      interval: "YEARLY",
    });

    await processPaymentEvent(successEvent, "mock");

    const input = mocks.applyPaymentProviderEvent.mock.calls[0]?.[0];
    expect(input?.subscriptionPatch).toEqual(
      expect.objectContaining({ interval: "YEARLY" }),
    );
    const day = 24 * 60 * 60 * 1000;
    const start = input?.subscriptionPatch.currentPeriodStart as Date;
    const end = input?.subscriptionPatch.currentPeriodEnd as Date;
    expect(end.getTime() - start.getTime()).toBeGreaterThan(360 * day);
  });

  it("extends an active subscription instead of resetting its period", async () => {
    const day = 24 * 60 * 60 * 1000;
    const periodStart = new Date(Date.now() - 20 * day);
    const periodEnd = new Date(Date.now() + 10 * day);
    const current = {
      id: subscriptionId,
      organizationId,
      planId,
      status: "ACTIVE" as const,
      interval: "MONTHLY" as const,
      amountMinor: 1900,
      currency: "USD",
      provider: "mock",
      providerSubscriptionId: "sub_mock_1",
      trialEndsAt: null,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: true,
      canceledAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    await processPaymentEvent(successEvent, "mock");

    const builder = mocks.applyPaymentProviderEvent.mock.calls[0]?.[0]
      ?.subscriptionPatchBuilder as (row: typeof current) => {
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
      providerSubscriptionId: string | null;
    };
    const patch = builder(current);

    expect(patch.currentPeriodStart).toBe(periodStart);
    expect(patch.currentPeriodEnd.getTime()).toBeGreaterThan(
      periodEnd.getTime(),
    );
    expect(patch.cancelAtPeriodEnd).toBe(false);
    expect(patch.providerSubscriptionId).toBe("sub_mock_1");
  });

  it("starts a new period when upgrading to a different plan", async () => {
    const current = {
      id: subscriptionId,
      organizationId,
      planId: "99999999-9999-4999-8999-999999999999",
      status: "ACTIVE" as const,
      interval: "MONTHLY" as const,
      amountMinor: 500,
      currency: "USD",
      provider: "mock",
      providerSubscriptionId: null,
      trialEndsAt: null,
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    await processPaymentEvent(successEvent, "mock");

    const builder = mocks.applyPaymentProviderEvent.mock.calls[0]?.[0]
      ?.subscriptionPatchBuilder as (row: typeof current) => {
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
    };
    const patch = builder(current);

    expect(
      Math.abs(patch.currentPeriodStart.getTime() - Date.now()),
    ).toBeLessThan(5000);
    expect(patch.currentPeriodEnd.getTime()).toBeGreaterThan(
      patch.currentPeriodStart.getTime(),
    );
  });

  it("does not patch the subscription for a refund", async () => {
    await processPaymentEvent(
      buildEvent({ type: "payment.refunded", eventId: "evt_9" }),
      "mock",
    );

    expect(mocks.applyPaymentProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PAYMENT_REFUNDED",
        subscriptionPatch: undefined,
      }),
    );
  });
});
