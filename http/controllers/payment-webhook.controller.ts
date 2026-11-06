import type { Context } from "hono";
import { PaymentError } from "@/http/models/payment.model";
import { processPaymentWebhook } from "@/http/services/payment-webhook.service";
import { logError } from "@/lib/sentry";

export const handlePaymentWebhook = async (c: Context) => {
  const signature = c.req.header("X-Payment-Signature") ?? null;
  if (!signature) {
    return c.json({ error: "Missing webhook signature" }, 401);
  }

  const rawBody = await c.req.text();

  try {
    const result = await processPaymentWebhook(rawBody, signature);

    if (result.outcome === "unknown_payment") {
      return c.json({ received: true, outcome: result.outcome });
    }

    return c.json({
      received: true,
      outcome: result.outcome,
      reason: result.outcome === "ignored" ? result.reason : undefined,
      paymentStatus: result.payment.status,
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    logError(error, { action: "payment_webhook" });
    return c.json({ error: "Failed to process webhook" }, 500);
  }
};
