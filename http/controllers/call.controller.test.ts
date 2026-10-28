import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv } from "@/http/models/auth.model";
import { callRoutes } from "@/http/routes/call.route";

const mocks = vi.hoisted(() => ({
  countOpenCallParticipants: vi.fn(),
  createCallWithParticipants: vi.fn(),
  expireStaleRingingCallsForUser: vi.fn(),
  findCallByIdWithParticipants: vi.fn(),
  findCallHistoryForUser: vi.fn(),
  findOpenCallsForUser: vi.fn(),
  hasOpenCallForUser: vi.fn(),
  updateCallParticipant: vi.fn(),
  updateCallStatusIf: vi.fn(),
  createNotification: vi.fn(),
  isUserInOrganization: vi.fn(),
  isLiveKitConfigured: vi.fn(() => true),
  buildCallGrant: vi.fn(() => ({})),
  deleteLiveKitRoom: vi.fn(() => Promise.resolve()),
  generateParticipantToken: vi.fn(() => Promise.resolve("test-token")),
  getLiveKitServerUrl: vi.fn(() => "wss://test.livekit.io"),
  logError: vi.fn(),
}));

vi.mock("@/http/repositories/call.repository", () => mocks);
vi.mock("@/http/repositories/notification.repository", () => mocks);
vi.mock("@/http/repositories/organization.repository", () => mocks);
vi.mock("@/http/services/livekit.service", () => ({
  ...mocks,
  LiveKitNotConfiguredError: class LiveKitNotConfiguredError extends Error {},
}));
vi.mock("@/lib/sentry", () => ({ logError: mocks.logError }));

type TestUser = NonNullable<AuthEnv["Variables"]["user"]>;

const buildUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: "11111111-1111-4111-8111-111111111111",
  email: "user1@example.com",
  name: "User One",
  avatar: null,
  phoneNumber: null,
  phoneOwnerName: null,
  organizationId: "org-1",
  organizationName: "Org",
  organizationRole: "COLLABORATOR",
  ...overrides,
});

type CallOverrides = {
  organizationId?: string;
  status?: "RINGING" | "ACTIVE" | "ENDED" | "MISSED" | "REJECTED" | "CANCELLED";
  participantStatuses?: {
    caller?: "INVITED" | "JOINED" | "LEFT" | "REJECTED" | "MISSED";
    callee?: "INVITED" | "JOINED" | "LEFT" | "REJECTED" | "MISSED";
  };
};

const buildCallRecord = (overrides: CallOverrides = {}) => ({
  id: "call-1",
  organizationId: overrides.organizationId ?? "org-1",
  roomName: "call_room",
  type: "AUDIO" as const,
  status: overrides.status ?? ("RINGING" as const),
  initiatedBy: "11111111-1111-4111-8111-111111111111",
  startedAt: null as Date | null,
  endedAt: null as Date | null,
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
  initiator: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "User One",
    avatar: null,
  },
  participants: [
    {
      id: "p-1",
      callId: "call-1",
      userId: "11111111-1111-4111-8111-111111111111",
      guestName: null,
      status: overrides.participantStatuses?.caller ?? ("INVITED" as const),
      joinedAt: null as Date | null,
      leftAt: null as Date | null,
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "User One",
        avatar: null,
      },
    },
    {
      id: "p-2",
      callId: "call-1",
      userId: "22222222-2222-4222-8222-222222222222",
      guestName: null,
      status: overrides.participantStatuses?.callee ?? ("INVITED" as const),
      joinedAt: null as Date | null,
      leftAt: null as Date | null,
      user: {
        id: "22222222-2222-4222-8222-222222222222",
        name: "User Two",
        avatar: null,
      },
    },
  ],
});

let currentUser: TestUser | undefined;

const app = new Hono<AuthEnv>();
app.use("*", async (c, next) => {
  if (currentUser) c.set("user", currentUser);
  await next();
});
app.route("/", callRoutes);

const postCall = (body: unknown) =>
  app.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const postCallAction = (path: string) => app.request(path, { method: "POST" });

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = buildUser();
  mocks.isLiveKitConfigured.mockReturnValue(true);
  mocks.findCallByIdWithParticipants.mockResolvedValue(buildCallRecord());
  mocks.updateCallStatusIf.mockResolvedValue(true);
  mocks.updateCallParticipant.mockResolvedValue(undefined);
  mocks.createNotification.mockResolvedValue(undefined);
  mocks.hasOpenCallForUser.mockResolvedValue(false);
  mocks.isUserInOrganization.mockResolvedValue(true);
});

describe("POST /calls", () => {
  it("returns 401 without a session user", async () => {
    currentUser = undefined;
    const res = await postCall({
      type: "AUDIO",
      calleeId: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(401);
  });

  it("rejects calling yourself", async () => {
    const res = await postCall({
      type: "AUDIO",
      calleeId: "11111111-1111-4111-8111-111111111111",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "You cannot call yourself" });
  });

  it("rejects callees outside the organization", async () => {
    mocks.isUserInOrganization.mockResolvedValue(false);
    const res = await postCall({
      type: "VIDEO",
      calleeId: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(403);
  });

  it("rejects invalid payloads", async () => {
    const res = await postCall({
      type: "SCREEN",
      calleeId: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(400);
  });

  it("rejects when the caller is already in a call", async () => {
    mocks.hasOpenCallForUser.mockImplementation((id: string) =>
      Promise.resolve(id === "11111111-1111-4111-8111-111111111111"),
    );
    const res = await postCall({
      type: "AUDIO",
      calleeId: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "You are already in a call" });
  });

  it("returns 503 when LiveKit is not configured", async () => {
    mocks.isLiveKitConfigured.mockReturnValue(false);
    const res = await postCall({
      type: "AUDIO",
      calleeId: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(503);
  });

  it("creates a call and notifies the callee", async () => {
    mocks.createCallWithParticipants.mockResolvedValue({ id: "call-1" });
    mocks.findCallByIdWithParticipants.mockResolvedValue(buildCallRecord());

    const res = await postCall({
      type: "AUDIO",
      calleeId: "22222222-2222-4222-8222-222222222222",
    });
    expect(res.status).toBe(201);

    const body = (await res.json()) as { call: { id: string; type: string } };
    expect(body.call.id).toBe("call-1");
    expect(body.call.type).toBe("AUDIO");

    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "22222222-2222-4222-8222-222222222222",
        type: "CALL_INVITE",
        entityType: "CALL",
        entityId: "call-1",
      }),
    );
  });
});

describe("GET /calls", () => {
  it("returns call history for the current user", async () => {
    mocks.findCallHistoryForUser.mockResolvedValue([
      buildCallRecord({ status: "ENDED" }),
    ]);

    const res = await app.request("/");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { id: string; status: string }[];
    expect(body).toHaveLength(1);
    expect(body[0]?.status).toBe("ENDED");
    expect(mocks.findCallHistoryForUser).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "org-1",
      50,
    );
  });

  it("returns 401 without a session user", async () => {
    currentUser = undefined;
    expect((await app.request("/")).status).toBe(401);
  });
});

describe("GET /calls/active", () => {
  it("expires stale ringing calls before listing", async () => {
    mocks.expireStaleRingingCallsForUser.mockResolvedValue(undefined);
    mocks.findOpenCallsForUser.mockResolvedValue([]);

    const res = await app.request("/active");
    expect(res.status).toBe(200);
    expect(mocks.expireStaleRingingCallsForUser).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(mocks.findOpenCallsForUser).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "org-1",
    );
  });
});

describe("POST /calls/:id/accept", () => {
  const accept = () => postCallAction("/call-1/accept");

  it("returns 404 for calls in another organization", async () => {
    mocks.findCallByIdWithParticipants.mockResolvedValue(
      buildCallRecord({ organizationId: "other-org" }),
    );
    expect((await accept()).status).toBe(404);
  });

  it("returns 403 for non-participants", async () => {
    currentUser = buildUser({ id: "stranger" });
    expect((await accept()).status).toBe(403);
  });

  it("returns 409 when the call is no longer ringing", async () => {
    mocks.findCallByIdWithParticipants.mockResolvedValue(
      buildCallRecord({ status: "ENDED" }),
    );
    expect((await accept()).status).toBe(409);
  });

  it("activates a ringing call and issues a token", async () => {
    currentUser = buildUser({ id: "22222222-2222-4222-8222-222222222222" });

    const res = await accept();
    expect(res.status).toBe(200);

    const body = (await res.json()) as { token: string; serverUrl: string };
    expect(body.token).toBe("test-token");
    expect(body.serverUrl).toBe("wss://test.livekit.io");
    expect(mocks.updateCallStatusIf).toHaveBeenCalledWith(
      "call-1",
      ["RINGING"],
      "ACTIVE",
      expect.objectContaining({ startedAt: expect.any(Date) }),
    );
    expect(mocks.updateCallParticipant).toHaveBeenCalledWith(
      "call-1",
      "22222222-2222-4222-8222-222222222222",
      expect.objectContaining({ status: "JOINED" }),
    );
  });

  it("returns 409 when the transition loses the race", async () => {
    currentUser = buildUser({ id: "22222222-2222-4222-8222-222222222222" });
    mocks.updateCallStatusIf.mockResolvedValue(false);

    expect((await accept()).status).toBe(409);
  });
});

describe("POST /calls/:id/reject", () => {
  const reject = () => postCallAction("/call-1/reject");

  it("only lets the invited callee reject", async () => {
    currentUser = buildUser({ id: "initiator-only" });
    expect((await reject()).status).toBe(403);
  });

  it("marks a ringing call as rejected", async () => {
    currentUser = buildUser({ id: "22222222-2222-4222-8222-222222222222" });

    const res = await reject();
    expect(res.status).toBe(200);
    expect(mocks.updateCallStatusIf).toHaveBeenCalledWith(
      "call-1",
      ["RINGING"],
      "REJECTED",
      expect.objectContaining({ endedAt: expect.any(Date) }),
    );
  });

  it("returns 409 when the call already left ringing state", async () => {
    currentUser = buildUser({ id: "22222222-2222-4222-8222-222222222222" });
    mocks.updateCallStatusIf.mockResolvedValue(false);

    expect((await reject()).status).toBe(409);
  });
});

describe("POST /calls/:id/cancel", () => {
  const cancel = () => postCallAction("/call-1/cancel");

  it("only lets the initiator cancel", async () => {
    currentUser = buildUser({ id: "22222222-2222-4222-8222-222222222222" });
    expect((await cancel()).status).toBe(403);
  });

  it("cancels a ringing call and marks invited participants missed", async () => {
    const res = await cancel();
    expect(res.status).toBe(200);
    expect(mocks.updateCallStatusIf).toHaveBeenCalledWith(
      "call-1",
      ["RINGING"],
      "CANCELLED",
      expect.objectContaining({ endedAt: expect.any(Date) }),
    );
    expect(mocks.updateCallParticipant).toHaveBeenCalledWith(
      "call-1",
      "22222222-2222-4222-8222-222222222222",
      {
        status: "MISSED",
      },
    );
  });
});

describe("POST /calls/:id/leave", () => {
  const leave = () => postCallAction("/call-1/leave");

  it("returns 409 when the user has not joined", async () => {
    expect((await leave()).status).toBe(409);
  });

  it("ends the call when the last participant leaves", async () => {
    mocks.findCallByIdWithParticipants.mockResolvedValue(
      buildCallRecord({
        status: "ACTIVE",
        participantStatuses: { caller: "JOINED", callee: "INVITED" },
      }),
    );
    mocks.countOpenCallParticipants.mockResolvedValue(0);

    const res = await leave();
    expect(res.status).toBe(200);
    expect(mocks.updateCallStatusIf).toHaveBeenCalledWith(
      "call-1",
      ["ACTIVE", "RINGING"],
      "ENDED",
      expect.objectContaining({ endedAt: expect.any(Date) }),
    );
    expect(mocks.deleteLiveKitRoom).toHaveBeenCalledWith("call_room");
  });

  it("keeps the call open while others remain", async () => {
    mocks.findCallByIdWithParticipants.mockResolvedValue(
      buildCallRecord({
        status: "ACTIVE",
        participantStatuses: { caller: "JOINED", callee: "INVITED" },
      }),
    );
    mocks.countOpenCallParticipants.mockResolvedValue(1);

    const res = await leave();
    expect(res.status).toBe(200);
    expect(mocks.updateCallStatusIf).not.toHaveBeenCalledWith(
      "call-1",
      ["ACTIVE", "RINGING"],
      "ENDED",
      expect.anything(),
    );
  });
});
