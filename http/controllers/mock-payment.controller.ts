import { randomUUID } from "node:crypto";
import type { Context } from "hono";
import { PaymentError } from "@/http/models/payment.model";
import { findSubscriptionPaymentByProviderPaymentId } from "@/http/repositories/payment.repository";
import { processPaymentEvent } from "@/http/services/payment-webhook.service";
import { getMockPaymentProvider } from "@/packages/payment";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const page = (title: string, body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8" />` +
  `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
  `<title>${escapeHtml(title)} - Collabill mock payments</title>` +
  `<style>` +
  `body{font-family:system-ui,sans-serif;margin:0;background:#f5f5f5;color:#222}` +
  `main{max-width:32rem;margin:4rem auto;background:#fff;padding:2rem;` +
  `border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12)}` +
  `h1{font-size:1.25rem;margin-top:0}` +
  `.amount{font-size:1.75rem;font-weight:600}` +
  `form{display:inline-block;margin:0 .5rem .5rem 0}` +
  `button{font:inherit;padding:.5rem 1rem;border:0;border-radius:6px;` +
  `background:#1677ff;color:#fff;cursor:pointer}` +
  `button.secondary{background:#8c8c8c}` +
  `a{color:#1677ff}` +
  `</style></head><body><main><h1>${escapeHtml(title)}</h1>${body}` +
  `</main></body></html>`;

const resolveCheckout = async (c: Context) => {
  const provider = getMockPaymentProvider();
  if (!provider) {
    throw new PaymentError("Mock payment provider is not available", 404);
  }

  const checkoutId = c.req.param("checkoutId");
  if (!checkoutId) {
    throw new PaymentError("Checkout id is required", 400);
  }

  const payment = await findSubscriptionPaymentByProviderPaymentId(checkoutId);
  if (!payment || !payment.providerPaymentId) {
    throw new PaymentError("Mock checkout not found", 404);
  }

  return { provider, payment };
};

const paymentErrorPage = (error: unknown) => {
  if (error instanceof PaymentError) {
    return {
      body: page(
        "Mock checkout unavailable",
        `<p>${escapeHtml(error.message)}</p>`,
      ),
      status: error.statusCode,
    };
  }
  return null;
};

export const getMockCheckoutPage = async (c: Context) => {
  try {
    const { payment } = await resolveCheckout(c);
    const checkoutId = escapeHtml(payment.providerPaymentId ?? "");
    const amount = escapeHtml(
      `${(payment.amountMinor / 100).toFixed(2)} ${payment.currency}`,
    );

    if (payment.status !== "PENDING") {
      return c.html(
        page(
          "Mock checkout processed",
          `<p>This mock checkout is already ${escapeHtml(payment.status)}.</p>` +
            `<p><a href="/dashboard">Back to app</a></p>`,
        ),
      );
    }

    const action = `/api/payments/mock/checkout/${checkoutId}`;
    return c.html(
      page(
        "Mock checkout",
        `<p class="amount">${amount}</p>` +
          `<p>Simulate the provider outcome for this checkout session.</p>` +
          `<form method="post" action="${action}/complete">` +
          `<button type="submit">Pay successfully</button></form>` +
          `<form method="post" action="${action}/fail">` +
          `<button type="submit" class="secondary">Fail payment</button></form>`,
      ),
    );
  } catch (error) {
    const rendered = paymentErrorPage(error);
    if (rendered) {
      return c.html(rendered.body, rendered.status);
    }
    throw error;
  }
};

const simulateOutcome = async (c: Context, outcome: "SUCCEEDED" | "FAILED") => {
  const { provider, payment } = await resolveCheckout(c);

  if (payment.status !== "PENDING") {
    return c.json({ error: "Mock checkout is not pending" }, 409);
  }

  const checkoutId = payment.providerPaymentId ?? "";
  provider.recordPaymentOutcome(checkoutId, outcome, {
    amountMinor: payment.amountMinor,
    currency: payment.currency,
  });

  const result = await processPaymentEvent(
    {
      eventId: `mock_evt_${randomUUID()}`,
      type: outcome === "SUCCEEDED" ? "payment.succeeded" : "payment.failed",
      providerPaymentId: checkoutId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      organizationId: payment.organizationId,
      failureReason: outcome === "FAILED" ? "mock_card_declined" : null,
      occurredAt: new Date().toISOString(),
    },
    provider.name,
  );

  return c.json({
    outcome: result.outcome,
    paymentStatus:
      result.outcome === "unknown_payment"
        ? payment.status
        : result.payment.status,
  });
};

export const postMockCheckoutComplete = async (c: Context) => {
  try {
    return await simulateOutcome(c, "SUCCEEDED");
  } catch (error) {
    if (error instanceof PaymentError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    throw error;
  }
};

export const postMockCheckoutFail = async (c: Context) => {
  try {
    return await simulateOutcome(c, "FAILED");
  } catch (error) {
    if (error instanceof PaymentError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    throw error;
  }
};

export const postMockCheckoutRefund = async (c: Context) => {
  try {
    const { provider, payment } = await resolveCheckout(c);

    if (payment.status !== "SUCCEEDED") {
      return c.json({ error: "Only succeeded payments can be refunded" }, 409);
    }

    const checkoutId = payment.providerPaymentId ?? "";
    provider.recordPaymentOutcome(checkoutId, "REFUNDED", {
      amountMinor: payment.amountMinor,
      currency: payment.currency,
    });
    const refund = await provider.refundPayment(
      checkoutId,
      payment.amountMinor,
    );

    const result = await processPaymentEvent(
      {
        eventId: `mock_evt_${randomUUID()}`,
        type: "payment.refunded",
        providerPaymentId: checkoutId,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        organizationId: payment.organizationId,
        failureReason: null,
        occurredAt: new Date().toISOString(),
      },
      provider.name,
    );

    return c.json({
      outcome: result.outcome,
      providerRefundId: refund.providerRefundId,
      paymentStatus:
        result.outcome === "unknown_payment"
          ? payment.status
          : result.payment.status,
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    throw error;
  }
};
