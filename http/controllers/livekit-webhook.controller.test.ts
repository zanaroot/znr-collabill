import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleLiveKitWebhook } from "@/http/controllers/livekit-webhook.controller";

const mocks = vi.hoisted(() => ({
  insertWebhookEventIfNew: vi.fn(),
  isLiveKitConfigured: vi.fn(() => true),
  getWebhookReceiver: vi.fn(),
  processLiveKitWebhookEvent: vi.fn(() => Promise.resolve()),
  logError: vi.fn(),
}));

vi.mock("@/http/repositories/meeting.repository", () => mocks);
vi.mock("@/http/services/livekit.service", () => mocks);
vi.mock("@/http/services/livekit-webhook.service", () => ({
  processLiveKitWebhookEvent: mocks.processLiveKitWebhookEvent,
}));
vi.mock("@/lib/sentry", () => ({ logError: mocks.logError }));

const app = new Hono().post("/", handleLiveKitWebhook);

const postWebhook = (auth?: string) =>
  app.request("/", {
    method: "POST",
    headers: auth ? { Authorization: auth } : {},
    body: JSON.stringify({ event: "room_started" }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isLiveKitConfigured.mockReturnValue(true);
  mocks.getWebhookReceiver.mockReturnValue({
    receive: vi.fn().mockResolvedValue({
      id: "evt-1",
      event: "room_started",
      room: { name: "meet_room" },
    }),
  });
  mocks.insertWebhookEventIfNew.mockResolvedValue(true);
});

describe("POST /webhooks/livekit", () => {
  it("returns 401 without an authorization header", async () => {
    expect((await postWebhook()).status).toBe(401);
  });

  it("returns 503 when LiveKit is not configured", async () => {
    mocks.isLiveKitConfigured.mockReturnValue(false);
    expect((await postWebhook("Bearer token")).status).toBe(503);
  });

  it("returns 401 for an invalid signature", async () => {
    mocks.getWebhookReceiver.mockReturnValue({
      receive: vi.fn().mockRejectedValue(new Error("bad signature")),
    });
    expect((await postWebhook("Bearer bad")).status).toBe(401);
  });

  it("processes a new event exactly once", async () => {
    const res = await postWebhook("Bearer token");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(mocks.processLiveKitWebhookEvent).toHaveBeenCalledTimes(1);
  });

  it("deduplicates replayed events", async () => {
    mocks.insertWebhookEventIfNew.mockResolvedValue(false);
    const res = await postWebhook("Bearer token");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, duplicate: true });
    expect(mocks.processLiveKitWebhookEvent).not.toHaveBeenCalled();
  });

  it("returns 500 when processing fails", async () => {
    mocks.processLiveKitWebhookEvent.mockRejectedValue(new Error("boom"));
    const res = await postWebhook("Bearer token");
    expect(res.status).toBe(500);
    expect(mocks.logError).toHaveBeenCalled();
  });
});
