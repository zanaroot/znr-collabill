import { Hono } from "hono";
import { handleNowpaymentsWebhook } from "@/http/controllers/nowpayments-webhook.controller";

export const nowpaymentsWebhookRoutes = new Hono().post(
  "/webhook",
  handleNowpaymentsWebhook,
);
