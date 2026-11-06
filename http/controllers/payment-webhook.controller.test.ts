import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handlePaymentWebhook } from "@/http/controllers/payment-webhook.controller";
import { PaymentError } from "@/http/models/payment.model";

const mocks = vi.hoisted(() => ({
  processPaymentWebhook: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/http/services/payment-webhook.service", () => ({
  processPaymentWebhook: mocks.processPaymentWebhook,
}));
vi.mock("@/lib/sentry", () => ({ logError: mocks.logError }));

const app = new Hono().post("/", handlePaymentWebhook);

const postWebhook = (signature?: string) =>
  app.request("/", {
    method: "POST",
    headers: signature ? { "X-Payment-Signature": signature } : {},
    body: JSON.stringify({ eventId: "evt_1", type: "payment.succeeded" }),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /webhooks/payments", () => {
  it("returns 401 without a signature header", async () => {
    const res = await postWebhook();

    expect(res.status).toBe(401);
    expect(mocks.processPaymentWebhook).not.toHaveBeenCalled();
  });

  it("acknowledges a processed event", async () => {
    mocks.processPaymentWebhook.mockResolvedValue({
      outcome: "processed",
      payment: { status: "SUCCEEDED" },
      subscription: { id: "22222222-2222-4222-8222-222222222222" },
    });

    const res = await postWebhook("sha256=abc");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      received: true,
      outcome: "processed",
      paymentStatus: "SUCCEEDED",
    });
    expect(mocks.processPaymentWebhook).toHaveBeenCalledWith(
      expect.any(String),
      "sha256=abc",
    );
  });

  it("acknowledges a duplicate event id", async () => {
    mocks.processPaymentWebhook.mockResolvedValue({
      outcome: "duplicate",
      payment: { status: "SUCCEEDED" },
    });

    const res = await postWebhook("sha256=abc");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      received: true,
      outcome: "duplicate",
      paymentStatus: "SUCCEEDED",
    });
  });

  it("reports an ignored out-of-order event", async () => {
    mocks.processPaymentWebhook.mockResolvedValue({
      outcome: "ignored",
      reason: "out_of_order",
      payment: { status: "SUCCEEDED" },
    });

    const res = await postWebhook("sha256=abc");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      received: true,
      outcome: "ignored",
      reason: "out_of_order",
      paymentStatus: "SUCCEEDED",
    });
  });

  it("acknowledges an unknown payment without applying it", async () => {
    mocks.processPaymentWebhook.mockResolvedValue({
      outcome: "unknown_payment",
    });

    const res = await postWebhook("sha256=abc");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      received: true,
      outcome: "unknown_payment",
    });
  });

  it("maps an invalid signature to 401", async () => {
    mocks.processPaymentWebhook.mockRejectedValue(
      new PaymentError("Invalid webhook signature", 401),
    );

    const res = await postWebhook("sha256=bad");

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Invalid webhook signature",
    });
  });

  it("maps a malformed payload to 400", async () => {
    mocks.processPaymentWebhook.mockRejectedValue(
      new PaymentError("Malformed webhook payload", 400),
    );

    const res = await postWebhook("sha256=abc");

    expect(res.status).toBe(400);
  });

  it("maps an unconfigured provider to 503", async () => {
    mocks.processPaymentWebhook.mockRejectedValue(
      new PaymentError("Payment provider is not configured", 503),
    );

    const res = await postWebhook("sha256=abc");

    expect(res.status).toBe(503);
  });

  it("returns 500 and logs unexpected processing failures", async () => {
    mocks.processPaymentWebhook.mockRejectedValue(new Error("boom"));

    const res = await postWebhook("sha256=abc");

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to process webhook",
    });
    expect(mocks.logError).toHaveBeenCalled();
  });
});
