import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPaymentProvider: vi.fn(),
  findSubscriptionPaymentById: vi.fn(),
  linkSubscriptionPaymentSession: vi.fn(),
  updateSubscriptionPayment: vi.fn(),
  processPaymentEvent: vi.fn(),
  provider: {
    name: "mock",
    createCheckoutSession: vi.fn(),
    retrievePayment: vi.fn(),
    retrieveCheckout: vi.fn(),
    verifyWebhook: vi.fn(),
    refundPayment: vi.fn(),
  },
}));

vi.mock("@/packages/payment", () => ({
  getPaymentProvider: mocks.getPaymentProvider,
  getMockPaymentProvider: vi.fn(() => null),
}));
vi.mock("@/http/repositories/payment.repository", () => ({
  findSubscriptionPaymentById: mocks.findSubscriptionPaymentById,
  linkSubscriptionPaymentSession: mocks.linkSubscriptionPaymentSession,
  updateSubscriptionPayment: mocks.updateSubscriptionPayment,
}));
vi.mock("@/http/services/payment-webhook.service", () => ({
  processPaymentEvent: mocks.processPaymentEvent,
}));

import { PaymentError } from "@/http/models/payment.model";
import {
  createCheckoutSession,
  getPaymentStatusForOrganization,
  requirePaymentProvider,
} from "@/http/services/payment.service";

const organizationId = "11111111-1111-4111-8111-111111111111";
const paymentId = "66666666-6666-4666-8666-666666666666";

const pendingPayment = {
  id: paymentId,
  organizationId,
  subscriptionId: "22222222-2222-4222-8222-222222222222",
  planId: "33333333-3333-4333-8333-333333333333",
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

const snapshot = {
  providerPaymentId: "cs_mock_1",
  status: "SUCCEEDED" as const,
  amountMinor: 1900,
  currency: "USD",
  failureReason: null,
  occurredAt: "2026-01-02T00:00:00.000Z",
};

const expectPaymentError = async (
  promise: Promise<unknown>,
  statusCode: number,
) => {
  await expect(promise).rejects.toSatisfy(
    (error: unknown) =>
      error instanceof PaymentError && error.statusCode === statusCode,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPaymentProvider.mockReturnValue(mocks.provider);
  mocks.provider.retrieveCheckout.mockResolvedValue(undefined);
});

describe("requirePaymentProvider", () => {
  it("returns the configured provider", () => {
    expect(requirePaymentProvider().name).toBe("mock");
  });

  it("throws 503 when no provider is configured", () => {
    mocks.getPaymentProvider.mockReturnValue(null);

    expect(() => requirePaymentProvider()).toThrowError(PaymentError);
    try {
      requirePaymentProvider();
      expect.unreachable("requirePaymentProvider should throw");
    } catch (error) {
      expect((error as PaymentError).statusCode).toBe(503);
    }
  });
});

describe("createCheckoutSession", () => {
  it("creates a checkout and persists its reference separately", async () => {
    mocks.provider.createCheckoutSession.mockResolvedValue({
      providerCheckoutId: "cs_new",
      providerPaymentId: null,
      url: "https://pay.example.com/session/cs_new",
      expiresAt: null,
    });
    mocks.updateSubscriptionPayment.mockResolvedValue({
      ...pendingPayment,
      providerCheckoutId: "cs_new",
      checkoutUrl: "https://pay.example.com/session/cs_new",
      providerPaymentId: null,
    });

    const session = await createCheckoutSession({
      paymentId,
      organizationId,
      planCode: "PRO",
      amountMinor: 1900,
      currency: "USD",
    });

    expect(session).toEqual({
      providerCheckoutId: "cs_new",
      providerPaymentId: null,
      checkoutUrl: "https://pay.example.com/session/cs_new",
    });
    expect(mocks.provider.createCheckoutSession).toHaveBeenCalledWith({
      amountMinor: 1900,
      currency: "USD",
      metadata: { paymentId, organizationId, planCode: "PRO" },
    });
    expect(mocks.updateSubscriptionPayment).toHaveBeenCalledWith(paymentId, {
      providerCheckoutId: "cs_new",
      checkoutUrl: "https://pay.example.com/session/cs_new",
      providerPaymentId: null,
    });
    expect(mocks.linkSubscriptionPaymentSession).not.toHaveBeenCalled();
  });

  it("marks the payment failed when the provider session fails", async () => {
    mocks.provider.createCheckoutSession.mockRejectedValue(
      new Error("provider down"),
    );
    mocks.updateSubscriptionPayment.mockResolvedValue({
      ...pendingPayment,
      status: "FAILED",
    });

    await expectPaymentError(
      createCheckoutSession({
        paymentId,
        organizationId,
        planCode: "PRO",
        amountMinor: 1900,
        currency: "USD",
      }),
      502,
    );

    expect(mocks.updateSubscriptionPayment).toHaveBeenCalledWith(paymentId, {
      status: "FAILED",
      failureReason: "checkout_session_failed",
    });
    expect(mocks.linkSubscriptionPaymentSession).not.toHaveBeenCalled();
  });

  it("throws 503 when no provider is configured", async () => {
    mocks.getPaymentProvider.mockReturnValue(null);

    await expectPaymentError(
      createCheckoutSession({
        paymentId,
        organizationId,
        planCode: "PRO",
        amountMinor: 1900,
        currency: "USD",
      }),
      503,
    );
    expect(mocks.provider.createCheckoutSession).not.toHaveBeenCalled();
  });
});

describe("getPaymentStatusForOrganization", () => {
  it("returns 404 for a missing payment", async () => {
    mocks.findSubscriptionPaymentById.mockResolvedValue(null);

    await expectPaymentError(
      getPaymentStatusForOrganization({ organizationId, paymentId }),
      404,
    );
  });

  it("returns 404 for a payment from another organization", async () => {
    mocks.findSubscriptionPaymentById.mockResolvedValue({
      ...pendingPayment,
      organizationId: "99999999-9999-4999-9999-999999999999",
    });

    await expectPaymentError(
      getPaymentStatusForOrganization({ organizationId, paymentId }),
      404,
    );
    expect(mocks.provider.retrievePayment).not.toHaveBeenCalled();
  });

  it("returns the stored row when no provider session is linked", async () => {
    mocks.findSubscriptionPaymentById.mockResolvedValue({
      ...pendingPayment,
      providerPaymentId: null,
    });

    const payment = await getPaymentStatusForOrganization({
      organizationId,
      paymentId,
    });

    expect(payment).toEqual({ ...pendingPayment, providerPaymentId: null });
    expect(mocks.provider.retrievePayment).not.toHaveBeenCalled();
  });

  it("throws 503 when no provider is configured", async () => {
    mocks.getPaymentProvider.mockReturnValue(null);
    mocks.findSubscriptionPaymentById.mockResolvedValue(pendingPayment);

    await expectPaymentError(
      getPaymentStatusForOrganization({ organizationId, paymentId }),
      503,
    );
  });

  it("throws 502 when the provider status retrieval fails", async () => {
    mocks.findSubscriptionPaymentById.mockResolvedValue(pendingPayment);
    mocks.provider.retrievePayment.mockRejectedValue(new Error("gone"));

    await expectPaymentError(
      getPaymentStatusForOrganization({ organizationId, paymentId }),
      502,
    );
  });

  it("throws 400 when the provider reports a different amount", async () => {
    mocks.findSubscriptionPaymentById.mockResolvedValue(pendingPayment);
    mocks.provider.retrievePayment.mockResolvedValue({
      ...snapshot,
      amountMinor: 100,
    });

    await expectPaymentError(
      getPaymentStatusForOrganization({ organizationId, paymentId }),
      400,
    );
    expect(mocks.processPaymentEvent).not.toHaveBeenCalled();
  });

  it("links a checkout payment id before applying the status", async () => {
    const checkoutPayment = {
      ...pendingPayment,
      providerCheckoutId: "inv_1",
      providerPaymentId: null,
    };
    mocks.findSubscriptionPaymentById.mockResolvedValue(checkoutPayment);
    mocks.provider.retrieveCheckout.mockResolvedValue({
      ...snapshot,
      providerPaymentId: "pay_1",
    });
    mocks.linkSubscriptionPaymentSession.mockResolvedValue({
      ...checkoutPayment,
      providerPaymentId: "pay_1",
    });
    mocks.processPaymentEvent.mockResolvedValue({
      outcome: "processed",
      payment: { ...checkoutPayment, providerPaymentId: "pay_1" },
      subscription: null,
    });

    await getPaymentStatusForOrganization({ organizationId, paymentId });

    expect(mocks.provider.retrieveCheckout).toHaveBeenCalledWith("inv_1");
    expect(mocks.linkSubscriptionPaymentSession).toHaveBeenCalledWith(
      paymentId,
      "pay_1",
      "inv_1",
    );
    expect(mocks.processPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ providerPaymentId: "pay_1" }),
      "mock",
    );
  });

  it("repairs a legacy invoice id stored as the provider payment id", async () => {
    const legacy = {
      ...pendingPayment,
      providerPaymentId: "inv_1",
    };
    mocks.findSubscriptionPaymentById.mockResolvedValue(legacy);
    mocks.provider.retrieveCheckout.mockResolvedValue({
      ...snapshot,
      providerPaymentId: "pay_1",
    });
    mocks.linkSubscriptionPaymentSession.mockResolvedValue({
      ...legacy,
      providerCheckoutId: "inv_1",
      providerPaymentId: "pay_1",
    });
    mocks.processPaymentEvent.mockResolvedValue({
      outcome: "processed",
      payment: { ...legacy, providerPaymentId: "pay_1" },
      subscription: null,
    });

    await getPaymentStatusForOrganization({ organizationId, paymentId });

    expect(mocks.provider.retrieveCheckout).toHaveBeenCalledWith("inv_1");
    expect(mocks.linkSubscriptionPaymentSession).toHaveBeenCalledWith(
      paymentId,
      "pay_1",
      "inv_1",
    );
    expect(mocks.provider.retrievePayment).not.toHaveBeenCalled();
  });

  it("marks a checkout failed when the invoice expired without a payment", async () => {
    const checkoutPayment = {
      ...pendingPayment,
      providerCheckoutId: "inv_1",
      providerPaymentId: null,
    };
    const failed = {
      ...checkoutPayment,
      status: "FAILED" as const,
      failureReason: "expired",
    };
    mocks.findSubscriptionPaymentById.mockResolvedValue(checkoutPayment);
    mocks.provider.retrieveCheckout.mockResolvedValue({
      providerPaymentId: null,
      status: "FAILED",
      amountMinor: 1900,
      currency: "USD",
      failureReason: "expired",
      occurredAt: "2026-01-03T00:00:00.000Z",
    });
    mocks.updateSubscriptionPayment.mockResolvedValue(failed);

    const payment = await getPaymentStatusForOrganization({
      organizationId,
      paymentId,
    });

    expect(payment.status).toBe("FAILED");
    expect(mocks.updateSubscriptionPayment).toHaveBeenCalledWith(paymentId, {
      status: "FAILED",
      failureReason: "expired",
    });
    expect(mocks.processPaymentEvent).not.toHaveBeenCalled();
  });

  it("returns the row untouched while the provider payment is pending", async () => {
    mocks.findSubscriptionPaymentById.mockResolvedValue(pendingPayment);
    mocks.provider.retrievePayment.mockResolvedValue({
      ...snapshot,
      status: "PENDING",
    });

    const payment = await getPaymentStatusForOrganization({
      organizationId,
      paymentId,
    });

    expect(payment.status).toBe("PENDING");
    expect(mocks.processPaymentEvent).not.toHaveBeenCalled();
  });

  it("applies a verified succeeded status with a deterministic event id", async () => {
    const succeeded = { ...pendingPayment, status: "SUCCEEDED" as const };
    mocks.findSubscriptionPaymentById.mockResolvedValue(pendingPayment);
    mocks.provider.retrievePayment.mockResolvedValue(snapshot);
    mocks.processPaymentEvent.mockResolvedValue({
      outcome: "processed",
      payment: succeeded,
      subscription: { id: pendingPayment.subscriptionId },
    });

    const payment = await getPaymentStatusForOrganization({
      organizationId,
      paymentId,
    });

    expect(payment.status).toBe("SUCCEEDED");
    expect(mocks.processPaymentEvent).toHaveBeenCalledWith(
      {
        eventId: `poll:${paymentId}:SUCCEEDED`,
        type: "payment.succeeded",
        providerPaymentId: "cs_mock_1",
        amountMinor: 1900,
        currency: "USD",
        organizationId,
        failureReason: null,
        occurredAt: snapshot.occurredAt,
      },
      "mock",
    );
  });

  it("maps failed and refunded statuses to their events", async () => {
    mocks.findSubscriptionPaymentById.mockResolvedValue(pendingPayment);
    mocks.processPaymentEvent.mockResolvedValue({
      outcome: "processed",
      payment: { ...pendingPayment, status: "FAILED" },
      subscription: null,
    });

    mocks.provider.retrievePayment.mockResolvedValue({
      ...snapshot,
      status: "FAILED",
      failureReason: "declined",
    });
    await getPaymentStatusForOrganization({ organizationId, paymentId });
    expect(mocks.processPaymentEvent.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        type: "payment.failed",
        failureReason: "declined",
      }),
    );

    mocks.provider.retrievePayment.mockResolvedValue({
      ...snapshot,
      status: "REFUNDED",
    });
    await getPaymentStatusForOrganization({ organizationId, paymentId });
    expect(mocks.processPaymentEvent.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({ type: "payment.refunded" }),
    );
  });

  it("returns the stored row when the poll event is not applicable", async () => {
    mocks.findSubscriptionPaymentById.mockResolvedValue(pendingPayment);
    mocks.provider.retrievePayment.mockResolvedValue(snapshot);
    mocks.processPaymentEvent.mockResolvedValue({
      outcome: "unknown_payment",
    });

    const payment = await getPaymentStatusForOrganization({
      organizationId,
      paymentId,
    });

    expect(payment).toEqual(pendingPayment);
  });
});
