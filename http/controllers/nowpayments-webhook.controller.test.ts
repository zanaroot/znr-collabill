import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleNowpaymentsWebhook } from "@/http/controllers/nowpayments-webhook.controller";
import { PaymentError } from "@/http/models/payment.model";

const mocks = vi.hoisted(() => ({
  processNowpaymentsWebhook: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/http/services/nowpayments-webhook.service", () => ({
  processNowpaymentsWebhook: mocks.processNowpaymentsWebhook,
}));
vi.mock("@/lib/sentry", () => ({ logError: mocks.logError }));

const app = new Hono().post("/webhook", handleNowpaymentsWebhook);

const postWebhook = (signature?: string) =>
  app.request("/webhook", {
    method: "POST",
    headers: signature ? { "x-nowpayments-sig": signature } : {},
    body: JSON.stringify({ payment_id: 123456789, payment_status: "finished" }),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /payments/nowpayments/webhook", () => {
  it("returns 401 without a signature header", async () => {
    const res = await postWebhook();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Missing webhook signature",
    });
    expect(mocks.processNowpaymentsWebhook).not.toHaveBeenCalled();
  });

  it("acknowledges a processed notification", async () => {
    mocks.processNowpaymentsWebhook.mockResolvedValue({
      outcome: "processed",
      payment: { status: "SUCCEEDED" },
      subscription: { id: "22222222-2222-4222-8222-222222222222" },
    });

    const res = await postWebhook("a".repeat(128));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      received: true,
      outcome: "processed",
      paymentStatus: "SUCCEEDED",
    });
    expect(mocks.processNowpaymentsWebhook).toHaveBeenCalledWith(
      expect.any(String),
      "a".repeat(128),
    );
  });

  it("acknowledges an in-flight notification", async () => {
    mocks.processNowpaymentsWebhook.mockResolvedValue({
      outcome: "in_flight",
    });

    const res = await postWebhook("a".repeat(128));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      received: true,
      outcome: "in_flight",
    });
  });

  it("acknowledges a duplicate notification", async () => {
    mocks.processNowpaymentsWebhook.mockResolvedValue({
      outcome: "duplicate",
      payment: { status: "SUCCEEDED" },
    });

    const res = await postWebhook("a".repeat(128));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      received: true,
      outcome: "duplicate",
      paymentStatus: "SUCCEEDED",
    });
  });

  it("reports an ignored out-of-order notification", async () => {
    mocks.processNowpaymentsWebhook.mockResolvedValue({
      outcome: "ignored",
      reason: "out_of_order",
      payment: { status: "SUCCEEDED" },
    });

    const res = await postWebhook("a".repeat(128));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      received: true,
      outcome: "ignored",
      reason: "out_of_order",
      paymentStatus: "SUCCEEDED",
    });
  });

  it("returns 404 for an unknown payment reference", async () => {
    mocks.processNowpaymentsWebhook.mockResolvedValue({
      outcome: "unknown_payment",
    });

    const res = await postWebhook("a".repeat(128));

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Payment not found" });
  });

  it("maps an invalid signature to 401", async () => {
    mocks.processNowpaymentsWebhook.mockRejectedValue(
      new PaymentError("Invalid webhook signature", 401),
    );

    const res = await postWebhook("b".repeat(128));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Invalid webhook signature",
    });
  });

  it("maps a malformed payload to 400", async () => {
    mocks.processNowpaymentsWebhook.mockRejectedValue(
      new PaymentError("Malformed webhook payload", 400),
    );

    const res = await postWebhook("a".repeat(128));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Malformed webhook payload",
    });
  });

  it("maps a missing payment to 404", async () => {
    mocks.processNowpaymentsWebhook.mockRejectedValue(
      new PaymentError("Payment not found", 404),
    );

    const res = await postWebhook("a".repeat(128));

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Payment not found" });
  });

  it("maps a reference mismatch to 400", async () => {
    mocks.processNowpaymentsWebhook.mockRejectedValue(
      new PaymentError("Payment reference mismatch", 400),
    );

    const res = await postWebhook("a".repeat(128));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Payment reference mismatch",
    });
  });

  it("maps an unconfigured IPN secret to 503", async () => {
    mocks.processNowpaymentsWebhook.mockRejectedValue(
      new PaymentError("NOWPayments IPN is not configured", 503),
    );

    const res = await postWebhook("a".repeat(128));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: "NOWPayments IPN is not configured",
    });
  });

  it("returns 500 and logs unexpected processing failures", async () => {
    mocks.processNowpaymentsWebhook.mockRejectedValue(new Error("boom"));

    const res = await postWebhook("a".repeat(128));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to process webhook",
    });
    expect(mocks.logError).toHaveBeenCalled();
  });
});
