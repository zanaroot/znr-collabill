import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMockPaymentProvider: vi.fn(),
  findSubscriptionPaymentByProviderPaymentId: vi.fn(),
  processPaymentEvent: vi.fn(),
  recordPaymentOutcome: vi.fn(),
  refundPayment: vi.fn(),
}));

vi.mock("@/packages/payment", () => ({
  getMockPaymentProvider: mocks.getMockPaymentProvider,
}));
vi.mock("@/http/repositories/payment.repository", () => ({
  findSubscriptionPaymentByProviderPaymentId:
    mocks.findSubscriptionPaymentByProviderPaymentId,
}));
vi.mock("@/http/services/payment-webhook.service", () => ({
  processPaymentEvent: mocks.processPaymentEvent,
}));

import {
  getMockCheckoutPage,
  postMockCheckoutComplete,
  postMockCheckoutFail,
  postMockCheckoutRefund,
} from "@/http/controllers/mock-payment.controller";

const organizationId = "11111111-1111-4111-8111-111111111111";
const checkoutId = "cs_mock_1";

const pendingPayment = {
  id: "66666666-6666-4666-8666-666666666666",
  organizationId,
  subscriptionId: "22222222-2222-4222-8222-222222222222",
  planId: "33333333-3333-4333-8333-333333333333",
  status: "PENDING" as const,
  amountMinor: 1900,
  currency: "USD",
  provider: "mock",
  providerPaymentId: checkoutId,
  paidAt: null,
  failureReason: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const provider = {
  name: "mock",
  recordPaymentOutcome: mocks.recordPaymentOutcome,
  refundPayment: mocks.refundPayment,
};

const app = new Hono()
  .get("/checkout/:checkoutId", getMockCheckoutPage)
  .post("/checkout/:checkoutId/complete", postMockCheckoutComplete)
  .post("/checkout/:checkoutId/fail", postMockCheckoutFail)
  .post("/checkout/:checkoutId/refund", postMockCheckoutRefund);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getMockPaymentProvider.mockReturnValue(provider);
  mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(
    pendingPayment,
  );
  mocks.processPaymentEvent.mockResolvedValue({
    outcome: "processed",
    payment: { ...pendingPayment, status: "SUCCEEDED" },
    subscription: { id: pendingPayment.subscriptionId },
  });
  mocks.refundPayment.mockResolvedValue({
    providerRefundId: "mock_rf_1",
    status: "SUCCEEDED",
  });
});

describe("GET mock checkout page", () => {
  it("renders the outcome form for a pending payment", async () => {
    const res = await app.request(`/checkout/${checkoutId}`);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Pay successfully");
    expect(html).toContain("Fail payment");
    expect(html).toContain("19.00 USD");
    expect(html).toContain(`/checkout/${checkoutId}/complete`);
  });

  it("shows the settled state for a processed payment", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue({
      ...pendingPayment,
      status: "SUCCEEDED",
    });

    const res = await app.request(`/checkout/${checkoutId}`);

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("already SUCCEEDED");
  });

  it("returns 404 for an unknown checkout", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(null);

    const res = await app.request(`/checkout/${checkoutId}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 when the mock provider is unavailable", async () => {
    mocks.getMockPaymentProvider.mockReturnValue(null);

    const res = await app.request(`/checkout/${checkoutId}`);

    expect(res.status).toBe(404);
    expect(
      mocks.findSubscriptionPaymentByProviderPaymentId,
    ).not.toHaveBeenCalled();
  });
});

describe("POST mock checkout outcomes", () => {
  it("applies a successful payment", async () => {
    const res = await app.request(`/checkout/${checkoutId}/complete`, {
      method: "POST",
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      outcome: "processed",
      paymentStatus: "SUCCEEDED",
    });
    expect(mocks.recordPaymentOutcome).toHaveBeenCalledWith(
      checkoutId,
      "SUCCEEDED",
      { amountMinor: 1900, currency: "USD" },
    );
    expect(mocks.processPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "payment.succeeded",
        providerPaymentId: checkoutId,
        amountMinor: 1900,
        organizationId,
      }),
      "mock",
    );
  });

  it("applies a failed payment", async () => {
    mocks.processPaymentEvent.mockResolvedValue({
      outcome: "processed",
      payment: { ...pendingPayment, status: "FAILED" },
      subscription: null,
    });

    const res = await app.request(`/checkout/${checkoutId}/fail`, {
      method: "POST",
    });

    expect(res.status).toBe(200);
    expect(mocks.recordPaymentOutcome).toHaveBeenCalledWith(
      checkoutId,
      "FAILED",
      expect.anything(),
    );
    expect(mocks.processPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "payment.failed",
        failureReason: "mock_card_declined",
      }),
      "mock",
    );
  });

  it("rejects outcomes when the checkout is not pending", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue({
      ...pendingPayment,
      status: "SUCCEEDED",
    });

    const res = await app.request(`/checkout/${checkoutId}/complete`, {
      method: "POST",
    });

    expect(res.status).toBe(409);
    expect(mocks.processPaymentEvent).not.toHaveBeenCalled();
  });

  it("refunds a succeeded payment", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue({
      ...pendingPayment,
      status: "SUCCEEDED",
    });
    mocks.processPaymentEvent.mockResolvedValue({
      outcome: "processed",
      payment: { ...pendingPayment, status: "REFUNDED" },
      subscription: null,
    });

    const res = await app.request(`/checkout/${checkoutId}/refund`, {
      method: "POST",
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      outcome: "processed",
      providerRefundId: "mock_rf_1",
      paymentStatus: "REFUNDED",
    });
    expect(mocks.refundPayment).toHaveBeenCalledWith(checkoutId, 1900);
    expect(mocks.processPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "payment.refunded" }),
      "mock",
    );
  });

  it("rejects refunds for non succeeded payments", async () => {
    const res = await app.request(`/checkout/${checkoutId}/refund`, {
      method: "POST",
    });

    expect(res.status).toBe(409);
    expect(mocks.refundPayment).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown checkout", async () => {
    mocks.findSubscriptionPaymentByProviderPaymentId.mockResolvedValue(null);

    const res = await app.request(`/checkout/${checkoutId}/complete`, {
      method: "POST",
    });

    expect(res.status).toBe(404);
  });
});
