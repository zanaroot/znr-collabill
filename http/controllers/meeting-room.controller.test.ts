import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitsForTests } from "@/http/middleware/rate-limit.middleware";
import type { AuthEnv } from "@/http/models/auth.model";
import { meetingRoutes } from "@/http/routes/meeting.route";
import { publicMeetingRoutes } from "@/http/routes/meeting-public.route";

const mocks = vi.hoisted(() => ({
  closeAllOpenMeetingParticipants: vi.fn(),
  closeMeetingParticipantByIdentity: vi.fn(),
  createGuestInvitation: vi.fn(() => Promise.resolve({ id: "invitation-new" })),
  createMeeting: vi.fn((data: Record<string, unknown>) =>
    Promise.resolve({
      id: "meeting-new",
      organizationId: null,
      createdBy: null,
      roomName: "meet_new",
      title: data.title ?? "Instant Meeting",
      scheduledAt: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      guestAccess: true,
      status: "SCHEDULED",
      startedAt: null,
      endedAt: null,
      createdAt: new Date(),
    }),
  ),
  expireMeetingIfDue: vi.fn(),
  findMeetingByIdWithDetails: vi.fn(),
  findValidGuestInvitationByTokenHash: vi.fn(),
  updateMeetingStatusIf: vi.fn(),
  upsertMeetingParticipantOnJoin: vi.fn(),
  isLiveKitConfigured: vi.fn(() => true),
  buildMeetingGrant: vi.fn(() => ({})),
  deleteLiveKitRoom: vi.fn(() => Promise.resolve()),
  generateParticipantToken: vi.fn(() => Promise.resolve("meeting-token")),
  getLiveKitServerUrl: vi.fn(() => "wss://test.livekit.io"),
}));

vi.mock("@/http/repositories/meeting.repository", () => mocks);
vi.mock("@/http/services/livekit.service", () => ({
  ...mocks,
  LiveKitNotConfiguredError: class LiveKitNotConfiguredError extends Error {},
}));
vi.mock("@/packages/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}));

type TestUser = NonNullable<AuthEnv["Variables"]["user"]>;

const buildUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: "user-1",
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

type MeetingOverrides = {
  organizationId?: string;
  status?: "SCHEDULED" | "ACTIVE" | "ENDED" | "EXPIRED" | "CANCELLED";
  createdBy?: string;
  guestAccess?: boolean;
};

const buildMeetingRecord = (overrides: MeetingOverrides = {}) => ({
  id: "meeting-1",
  organizationId: overrides.organizationId ?? "org-1",
  createdBy: overrides.createdBy ?? "user-1",
  roomName: "meet_room",
  title: "Weekly sync",
  scheduledAt: null as Date | null,
  expiresAt: null as Date | null,
  guestAccess: overrides.guestAccess ?? true,
  status: overrides.status ?? ("SCHEDULED" as const),
  startedAt: null as Date | null,
  endedAt: null as Date | null,
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
  creator: { id: "user-1", name: "User One", avatar: null },
  invitations: [],
  participants: [],
});

const buildInvitation = () => ({
  id: "invitation-1",
  meetingId: "meeting-1",
  tokenHash: "hashed-token",
  expiresAt: new Date("2026-12-31T00:00:00.000Z"),
  revokedAt: null as Date | null,
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
});

let currentUser: TestUser | undefined;

const app = new Hono<AuthEnv>();
app.use("*", async (c, next) => {
  if (currentUser) c.set("user", currentUser);
  await next();
});
app.route("/meetings/public", publicMeetingRoutes);
app.route("/meetings", meetingRoutes);

const getPublicInfo = (token: string) =>
  app.request(`/meetings/public/${token}`);

const guestJoin = (token: string, name: string) =>
  app.request(`/meetings/public/${token}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

const createInstant = (body?: Record<string, unknown>) =>
  app.request("/meetings/public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimitsForTests();
  currentUser = buildUser();
  mocks.isLiveKitConfigured.mockReturnValue(true);
  mocks.expireMeetingIfDue.mockResolvedValue(undefined);
  mocks.updateMeetingStatusIf.mockResolvedValue(
    buildMeetingRecord({ status: "ACTIVE" }),
  );
  mocks.findMeetingByIdWithDetails.mockResolvedValue(buildMeetingRecord());
  mocks.findValidGuestInvitationByTokenHash.mockResolvedValue(
    buildInvitation(),
  );
});

describe("POST /meetings/public", () => {
  it("returns 503 when LiveKit is not configured", async () => {
    mocks.isLiveKitConfigured.mockReturnValue(false);
    expect((await createInstant()).status).toBe(503);
  });

  it("creates an instant meeting with a guest invitation", async () => {
    const res = await createInstant();
    expect(res.status).toBe(201);

    const body = (await res.json()) as { token: string; url: string };
    expect(body.token).toBeTruthy();
    expect(body.url).toContain(`/meet/${body.token}`);

    expect(mocks.createMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        guestAccess: true,
        title: "Instant Meeting",
        expiresAt: expect.any(Date),
      }),
    );
    expect(mocks.createGuestInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingId: "meeting-new",
        tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        expiresAt: expect.any(Date),
      }),
    );
  });

  it("accepts a custom title", async () => {
    await createInstant({ title: "My standup" });
    expect(mocks.createMeeting).toHaveBeenCalledWith(
      expect.objectContaining({ title: "My standup" }),
    );
  });

  it("rejects an empty title", async () => {
    expect((await createInstant({ title: "   " })).status).toBe(400);
  });

  it("rejects a title over 200 characters", async () => {
    expect((await createInstant({ title: "a".repeat(201) })).status).toBe(400);
  });

  it("does not set organizationId or createdBy", async () => {
    await createInstant();
    const call = mocks.createMeeting.mock.calls[0]?.[0];
    expect(call?.organizationId).toBeUndefined();
    expect(call?.createdBy).toBeUndefined();
  });
});

describe("GET /meetings/public/:token", () => {
  it("returns 503 when LiveKit is not configured", async () => {
    mocks.isLiveKitConfigured.mockReturnValue(false);
    expect((await getPublicInfo("some-token")).status).toBe(503);
  });

  it("returns 404 for a revoked or unknown token", async () => {
    mocks.findValidGuestInvitationByTokenHash.mockResolvedValue(null);
    const res = await getPublicInfo("revoked-token");
    expect(res.status).toBe(404);
    expect(mocks.findValidGuestInvitationByTokenHash).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
  });

  it("returns 410 when the meeting has ended", async () => {
    mocks.findMeetingByIdWithDetails.mockResolvedValue(
      buildMeetingRecord({ status: "ENDED" }),
    );
    expect((await getPublicInfo("valid-token")).status).toBe(410);
  });

  it("returns public meeting info for a valid token", async () => {
    const res = await getPublicInfo("valid-token");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; title: string };
    expect(body.id).toBe("meeting-1");
    expect(body.title).toBe("Weekly sync");
  });
});

describe("POST /meetings/public/:token/join", () => {
  it("returns 404 when the invite was revoked or expired", async () => {
    mocks.findValidGuestInvitationByTokenHash.mockResolvedValue(null);
    const res = await guestJoin("revoked-token", "Guest");
    expect(res.status).toBe(404);
  });

  it("rejects an empty guest name", async () => {
    const res = await guestJoin("valid-token", "   ");
    expect(res.status).toBe(400);
  });

  it("joins a guest with a generated identity", async () => {
    const res = await guestJoin("valid-token", "Ada Guest");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      token: string;
      meeting: { status: string };
    };
    expect(body.token).toBe("meeting-token");
    expect(body.meeting.status).toBe("ACTIVE");

    expect(mocks.upsertMeetingParticipantOnJoin).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingId: "meeting-1",
        guestName: "Ada Guest",
        identity: expect.stringMatching(/^guest_/),
      }),
    );
    expect(mocks.updateMeetingStatusIf).toHaveBeenCalledWith(
      "meeting-1",
      ["SCHEDULED", "ACTIVE"],
      "ACTIVE",
      expect.anything(),
    );
  });

  it("returns 410 when the meeting already ended", async () => {
    mocks.findMeetingByIdWithDetails.mockResolvedValue(
      buildMeetingRecord({ status: "EXPIRED" }),
    );
    expect((await guestJoin("valid-token", "Ada")).status).toBe(410);
  });
});

describe("POST /meetings/:id/join", () => {
  const join = () =>
    app.request("/meetings/meeting-1/join", { method: "POST" });

  it("returns 401 without a session user", async () => {
    currentUser = undefined;
    expect((await join()).status).toBe(401);
  });

  it("returns 404 for meetings in another organization", async () => {
    mocks.findMeetingByIdWithDetails.mockResolvedValue(
      buildMeetingRecord({ organizationId: "other-org" }),
    );
    expect((await join()).status).toBe(404);
  });

  it("returns 410 when the meeting has ended", async () => {
    mocks.findMeetingByIdWithDetails.mockResolvedValue(
      buildMeetingRecord({ status: "CANCELLED" }),
    );
    expect((await join()).status).toBe(410);
  });

  it("issues a member token on success", async () => {
    const res = await join();
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      token: string;
      meeting: { status: string };
    };
    expect(body.token).toBe("meeting-token");
    expect(mocks.upsertMeetingParticipantOnJoin).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingId: "meeting-1",
        userId: "user-1",
        identity: "user_user-1",
      }),
    );
  });
});

describe("POST /meetings/:id/end", () => {
  const end = () => app.request("/meetings/meeting-1/end", { method: "POST" });

  it("blocks members who are not creator or admin", async () => {
    currentUser = buildUser({
      id: "someone-else",
      organizationRole: "COLLABORATOR",
    });
    expect((await end()).status).toBe(403);
  });

  it("returns 409 when the meeting already ended", async () => {
    currentUser = buildUser({ organizationRole: "ADMIN" });
    mocks.updateMeetingStatusIf.mockResolvedValue(null);
    expect((await end()).status).toBe(409);
  });

  it("ends the meeting, closes participants, and deletes the room", async () => {
    currentUser = buildUser({ id: "user-1" });

    const res = await end();
    expect(res.status).toBe(200);
    expect(mocks.updateMeetingStatusIf).toHaveBeenCalledWith(
      "meeting-1",
      ["SCHEDULED", "ACTIVE"],
      "ENDED",
      expect.objectContaining({ endedAt: expect.any(Date) }),
    );
    expect(mocks.closeAllOpenMeetingParticipants).toHaveBeenCalledWith(
      "meeting-1",
    );
    expect(mocks.deleteLiveKitRoom).toHaveBeenCalledWith("meet_room");
  });
});
