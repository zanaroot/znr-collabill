import { Hono } from "hono";
import { handlePaymentWebhook } from "@/http/controllers/payment-webhook.controller";

export const paymentWebhookRoutes = new Hono().post("/", handlePaymentWebhook);
