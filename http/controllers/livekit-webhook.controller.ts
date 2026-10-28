import type { Context } from "hono";
import type { WebhookEvent } from "livekit-server-sdk";
import { insertWebhookEventIfNew } from "@/http/repositories/meeting.repository";
import {
  getWebhookReceiver,
  isLiveKitConfigured,
} from "@/http/services/livekit.service";
import { processLiveKitWebhookEvent } from "@/http/services/livekit-webhook.service";
import { logError } from "@/lib/sentry";

export const handleLiveKitWebhook = async (c: Context) => {
  const authorization = c.req.header("Authorization");

  if (!authorization) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!isLiveKitConfigured()) {
    return c.json({ error: "LiveKit is not configured" }, 503);
  }

  const body = await c.req.text();

  let event: WebhookEvent;
  try {
    event = await getWebhookReceiver().receive(body, authorization);
  } catch {
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  try {
    const isNew = await insertWebhookEventIfNew({
      id: event.id,
      eventType: event.event,
      roomName: event.room?.name ?? null,
    });

    if (!isNew) {
      return c.json({ received: true, duplicate: true });
    }

    await processLiveKitWebhookEvent(event);
  } catch (error) {
    logError(error, { action: "livekit_webhook", event: event.event });
    return c.json({ error: "Failed to process webhook" }, 500);
  }

  return c.json({ received: true });
};
