import type { Context } from "hono";
import { PaymentError } from "@/http/models/payment.model";
import { processNowpaymentsWebhook } from "@/http/services/nowpayments-webhook.service";
import { logError } from "@/lib/sentry";

export const handleNowpaymentsWebhook = async (c: Context) => {
  const signature = c.req.header("x-nowpayments-sig") ?? null;
  if (!signature) {
    return c.json({ error: "Missing webhook signature" }, 401);
  }

  const rawBody = await c.req.text();

  try {
    const result = await processNowpaymentsWebhook(rawBody, signature);

    if (result.outcome === "in_flight") {
      return c.json({ received: true, outcome: result.outcome });
    }

    if (result.outcome === "unknown_payment") {
      return c.json({ error: "Payment not found" }, 404);
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
    logError(error, { action: "nowpayments_webhook" });
    return c.json({ error: "Failed to process webhook" }, 500);
  }
};
