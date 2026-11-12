import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildNowpaymentsIpnEvent,
  NowPaymentsProvider,
  signNowpaymentsIpn,
  verifyNowpaymentsIpn,
} from "./nowpayments";

const ipnSecret = "test-ipn-secret";
const apiKey = "test-api-key";

const provider = new NowPaymentsProvider({
  apiKey,
  ipnSecret,
  baseUrl: "https://api.nowpayments.io/v1/",
  appUrl: "http://localhost:3000/",
});

const paymentId = "66666666-6666-4666-8666-666666666666";

const finishedPayload = {
  payment_id: 123456789,
  payment_status: "finished",
  price_amount: 19,
  price_currency: "usd",
  order_id: paymentId,
  order_description: "Plan PRO",
  actually_paid: 0.0045,
  pay_currency: "btc",
  fee: { currency: "btc", depositFee: 0.1, withdrawalFee: 0, serviceFee: 0 },
  updated_at: "2026-01-02T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
};

const sortObjectLikeNowpayments = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortObjectLikeNowpayments);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortObjectLikeNowpayments(record[key])]),
    );
  }
  return value;
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("signNowpaymentsIpn", () => {
  it("matches the documented NOWPayments HMAC-SHA512 algorithm", () => {
    const sorted = JSON.stringify(sortObjectLikeNowpayments(finishedPayload));
    const expected = createHmac("sha512", ipnSecret)
      .update(sorted)
      .digest("hex");

    expect(signNowpaymentsIpn(finishedPayload, ipnSecret)).toBe(expected);
  });

  it("sorts nested keys recursively", () => {
    const payload = { b: { z: 1, a: { d: 2, c: 3 } }, a: 1 };
    const reordered = { a: 1, b: { a: { c: 3, d: 2 }, z: 1 } };

    expect(signNowpaymentsIpn(payload, ipnSecret)).toBe(
      signNowpaymentsIpn(reordered, ipnSecret),
    );
  });
});

describe("verifyNowpaymentsIpn", () => {
  it("accepts a valid signature regardless of raw body key order", () => {
    const payload = {
      payment_status: "finished",
      order_id: paymentId,
      payment_id: 123456789,
      price_currency: "usd",
      price_amount: 19,
      updated_at: "2026-01-02T00:00:00.000Z",
    };
    const signature = signNowpaymentsIpn(payload, ipnSecret);
    const unsortedBody = JSON.stringify(payload);

    const result = verifyNowpaymentsIpn(unsortedBody, signature, ipnSecret);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toEqual({
        paymentId: "123456789",
        status: "finished",
        priceAmountMinor: 1900,
        priceCurrency: "USD",
        orderId: paymentId,
        occurredAt: "2026-01-02T00:00:00.000Z",
      });
    }
  });

  it("rejects a missing signature", () => {
    const result = verifyNowpaymentsIpn(
      JSON.stringify(finishedPayload),
      null,
      ipnSecret,
    );

    expect(result).toEqual({ ok: false, reason: "missing_signature" });
  });

  it("rejects an invalid signature", () => {
    const result = verifyNowpaymentsIpn(
      JSON.stringify(finishedPayload),
      "0".repeat(128),
      ipnSecret,
    );

    expect(result).toEqual({ ok: false, reason: "invalid_signature" });
  });

  it("rejects a signature computed over the unsorted raw body", () => {
    const unsortedBody = JSON.stringify({
      payment_status: "finished",
      payment_id: 123456789,
      price_amount: 19,
      price_currency: "usd",
      order_id: paymentId,
    });
    const naiveSignature = createHmac("sha512", ipnSecret)
      .update(unsortedBody)
      .digest("hex");

    const result = verifyNowpaymentsIpn(
      unsortedBody,
      naiveSignature,
      ipnSecret,
    );

    expect(result).toEqual({ ok: false, reason: "invalid_signature" });
  });

  it("rejects a tampered payload with a previously valid signature", () => {
    const signature = signNowpaymentsIpn(finishedPayload, ipnSecret);
    const tampered = { ...finishedPayload, payment_status: "failed" };

    const result = verifyNowpaymentsIpn(
      JSON.stringify(tampered),
      signature,
      ipnSecret,
    );

    expect(result).toEqual({ ok: false, reason: "invalid_signature" });
  });

  it("rejects malformed JSON", () => {
    const result = verifyNowpaymentsIpn(
      "{not-json",
      "0".repeat(128),
      ipnSecret,
    );

    expect(result).toEqual({ ok: false, reason: "malformed_payload" });
  });

  it("rejects a signed payload with an unknown payment status", () => {
    const payload = { ...finishedPayload, payment_status: "bogus" };
    const signature = signNowpaymentsIpn(payload, ipnSecret);

    const result = verifyNowpaymentsIpn(
      JSON.stringify(payload),
      signature,
      ipnSecret,
    );

    expect(result).toEqual({ ok: false, reason: "malformed_payload" });
  });
});

describe("buildNowpaymentsIpnEvent", () => {
  it("maps finished to a succeeded event with a deterministic id", () => {
    const verification = verifyNowpaymentsIpn(
      JSON.stringify(finishedPayload),
      signNowpaymentsIpn(finishedPayload, ipnSecret),
      ipnSecret,
    );
    expect(verification.ok).toBe(true);
    if (!verification.ok) return;

    expect(buildNowpaymentsIpnEvent(verification.payload)).toEqual({
      eventId: "nowpayments:123456789:finished",
      type: "payment.succeeded",
      providerPaymentId: "123456789",
      amountMinor: 1900,
      currency: "USD",
      organizationId: null,
      failureReason: null,
      occurredAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it.each([
    ["failed", "failed"],
    ["expired", "expired"],
  ])("maps %s to a failed event with failure reason %s", (status, reason) => {
    const verification = verifyNowpaymentsIpn(
      JSON.stringify({ ...finishedPayload, payment_status: status }),
      signNowpaymentsIpn(
        { ...finishedPayload, payment_status: status },
        ipnSecret,
      ),
      ipnSecret,
    );
    expect(verification.ok).toBe(true);
    if (!verification.ok) return;

    expect(buildNowpaymentsIpnEvent(verification.payload)).toEqual(
      expect.objectContaining({
        type: "payment.failed",
        failureReason: reason,
      }),
    );
  });

  it("maps refunded to a refunded event", () => {
    const payload = { ...finishedPayload, payment_status: "refunded" };
    const verification = verifyNowpaymentsIpn(
      JSON.stringify(payload),
      signNowpaymentsIpn(payload, ipnSecret),
      ipnSecret,
    );
    expect(verification.ok).toBe(true);
    if (!verification.ok) return;

    expect(buildNowpaymentsIpnEvent(verification.payload)).toEqual(
      expect.objectContaining({
        type: "payment.refunded",
        failureReason: null,
      }),
    );
  });

  it.each([
    "waiting",
    "confirming",
    "confirmed",
    "sending",
    "partially_paid",
  ])("returns no event for in-flight status %s", (status) => {
    const payload = { ...finishedPayload, payment_status: status };
    const verification = verifyNowpaymentsIpn(
      JSON.stringify(payload),
      signNowpaymentsIpn(payload, ipnSecret),
      ipnSecret,
    );
    expect(verification.ok).toBe(true);
    if (!verification.ok) return;

    expect(buildNowpaymentsIpnEvent(verification.payload)).toBeNull();
  });
});

describe("NowPaymentsProvider.verifyWebhook", () => {
  it("returns the mapped event for a valid signature", () => {
    const verification = provider.verifyWebhook(
      JSON.stringify(finishedPayload),
      signNowpaymentsIpn(finishedPayload, ipnSecret),
    );

    expect(verification.ok).toBe(true);
    if (verification.ok) {
      expect(verification.event).toEqual(
        expect.objectContaining({ type: "payment.succeeded" }),
      );
    }
  });

  it("returns a null event for an in-flight status", () => {
    const payload = { ...finishedPayload, payment_status: "confirming" };
    const verification = provider.verifyWebhook(
      JSON.stringify(payload),
      signNowpaymentsIpn(payload, ipnSecret),
    );

    expect(verification).toEqual({ ok: true, event: null });
  });

  it("rejects an invalid signature", () => {
    const verification = provider.verifyWebhook(
      JSON.stringify(finishedPayload),
      "0".repeat(128),
    );

    expect(verification).toEqual({ ok: false, reason: "invalid_signature" });
  });
});

describe("NowPaymentsProvider.createCheckoutSession", () => {
  it("creates a payment with the IPN callback URL and internal order id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        payment_id: 123456789,
        payment_status: "waiting",
        payment_url: "https://nowpayments.io/payment/abc",
      }),
    });

    const session = await provider.createCheckoutSession({
      amountMinor: 1900,
      currency: "USD",
      metadata: {
        paymentId,
        organizationId: "11111111-1111-4111-8111-111111111111",
        planCode: "PRO",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.nowpayments.io/v1/payment",
      expect.objectContaining({
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body).toEqual({
      price_amount: 19,
      price_currency: "usd",
      ipn_callback_url:
        "http://localhost:3000/api/payments/nowpayments/webhook",
      order_id: paymentId,
      order_description: "Plan PRO",
    });
    expect(session).toEqual({
      providerCheckoutId: "123456789",
      url: "https://nowpayments.io/payment/abc",
      expiresAt: null,
    });
  });

  it("throws when the API rejects the request", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400 });

    await expect(
      provider.createCheckoutSession({
        amountMinor: 1900,
        currency: "USD",
        metadata: {
          paymentId,
          organizationId: "11111111-1111-4111-8111-111111111111",
          planCode: "PRO",
        },
      }),
    ).rejects.toThrow("NOWPayments create payment failed (400)");
  });
});

describe("NowPaymentsProvider.retrievePayment", () => {
  it("maps a finished payment to a succeeded snapshot", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        payment_id: 123456789,
        payment_status: "finished",
        price_amount: 19,
        price_currency: "usd",
        updated_at: "2026-01-02T00:00:00.000Z",
      }),
    });

    const snapshot = await provider.retrievePayment("123456789");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.nowpayments.io/v1/payment/123456789",
      { headers: { "x-api-key": apiKey } },
    );
    expect(snapshot).toEqual({
      providerPaymentId: "123456789",
      status: "SUCCEEDED",
      amountMinor: 1900,
      currency: "USD",
      failureReason: null,
      occurredAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("maps waiting to pending and expired to failed", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        payment_id: 1,
        payment_status: "waiting",
        price_amount: 19,
        price_currency: "usd",
      }),
    });
    expect((await provider.retrievePayment("1")).status).toBe("PENDING");

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        payment_id: 1,
        payment_status: "expired",
        price_amount: 19,
        price_currency: "usd",
      }),
    });
    const expired = await provider.retrievePayment("1");
    expect(expired.status).toBe("FAILED");
    expect(expired.failureReason).toBe("expired");
  });

  it("throws when the API call fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(provider.retrievePayment("1")).rejects.toThrow(
      "NOWPayments retrieve payment failed (404)",
    );
  });
});
