// @vitest-environment node

import type { Context, Next } from "hono";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv, AuthUser } from "@/http/models/auth.model";
import { sendMemberEmailVerification } from "./email-verification.controller";

const mocks = vi.hoisted(() => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      emailVerifications: { findFirst: vi.fn() },
    },
    delete: vi.fn(),
    insert: vi.fn(),
  },
  sendEmail: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/packages/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/http/middleware/auth.middleware", () => ({
  authMiddleware: async (_c: Context, next: Next) => {
    await next();
  },
}));

const ownerId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000002";
const ownEmailRecord = {
  id: ownerId,
  email: "owner@example.com",
  name: "Email Owner",
  emailVerified: null,
};

const createUser = (
  id: string,
  organizationRole: AuthUser["organizationRole"],
): AuthUser => ({
  id,
  email: "owner@example.com",
  name: "Email Owner",
  avatar: null,
  phoneNumber: null,
  phoneOwnerName: null,
  organizationId: "00000000-0000-4000-8000-000000000003",
  organizationName: "Acme",
  organizationRole,
  platformRole: null,
  emailVerified: null,
});

const createApp = (user: AuthUser) =>
  new Hono<AuthEnv>()
    .use("*", async (c, next) => {
      c.set("user", user);
      await next();
    })
    .post(
      "/email-verification/send-member/:userId",
      ...sendMemberEmailVerification,
    );

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://collabill.test");

  mocks.db.query.users.findFirst.mockResolvedValue(ownEmailRecord);
  mocks.db.query.emailVerifications.findFirst.mockResolvedValue(null);
  mocks.db.delete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  mocks.db.insert.mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });
  mocks.sendEmail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendMemberEmailVerification", () => {
  it.each([
    "OWNER",
    "ADMIN",
    "COLLABORATOR",
  ] as const)("rejects %s when requesting verification for another user", async (role) => {
    const response = await createApp(createUser(ownerId, role)).request(
      `/email-verification/send-member/${otherUserId}`,
      { method: "POST" },
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      success: false,
      error: "You can only verify your own email address.",
    });
    expect(mocks.db.query.users.findFirst).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it.each([
    "OWNER",
    "ADMIN",
    "COLLABORATOR",
  ] as const)("allows %s to request verification of their own email", async (role) => {
    const response = await createApp(createUser(ownerId, role)).request(
      `/email-verification/send-member/${ownerId}`,
      {
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      message: "Verification email sent successfully.",
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ownEmailRecord.email }),
    );
  });
});
