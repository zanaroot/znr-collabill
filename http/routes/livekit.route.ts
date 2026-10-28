import { Hono } from "hono";
import { handleLiveKitWebhook } from "@/http/controllers/livekit-webhook.controller";

export const livekitWebhookRoutes = new Hono().post("/", handleLiveKitWebhook);
