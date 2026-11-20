// @vitest-environment node

import type { Context, Next } from "hono";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv, AuthUser } from "@/http/models/auth.model";
import {
  sendMemberEmailVerification,
  verifyEmail,
} from "./email-verification.controller";

const mocks = vi.hoisted(() => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      emailVerifications: { findFirst: vi.fn() },
    },
    delete: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
  },
  tx: {
    execute: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
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
const validToken = "a".repeat(64);
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
    )
    .post("/email-verification/verify", ...verifyEmail);

const createChains = () => {
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  selectChain.limit.mockResolvedValue([]);

  const deleteChain = {
    where: vi.fn(),
    returning: vi.fn(),
  };
  deleteChain.where.mockReturnValue(deleteChain);
  deleteChain.returning.mockResolvedValue([]);

  const insertChain = {
    values: vi.fn().mockResolvedValue(undefined),
  };

  const updateChain = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn(),
  };
  updateChain.set.mockReturnValue(updateChain);
  updateChain.where.mockReturnValue(updateChain);
  updateChain.returning.mockResolvedValue([]);

  return { selectChain, deleteChain, insertChain, updateChain };
};

let chains: ReturnType<typeof createChains>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://collabill.test");

  chains = createChains();

  mocks.db.query.users.findFirst.mockResolvedValue(ownEmailRecord);
  mocks.db.query.emailVerifications.findFirst.mockResolvedValue(null);
  mocks.db.delete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  mocks.db.insert.mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });
  mocks.db.transaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(mocks.tx),
  );

  mocks.tx.execute.mockResolvedValue(undefined);
  mocks.tx.select.mockReturnValue(chains.selectChain);
  mocks.tx.delete.mockReturnValue(chains.deleteChain);
  mocks.tx.insert.mockReturnValue(chains.insertChain);
  mocks.tx.update.mockReturnValue(chains.updateChain);

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

    const sentHtml = mocks.sendEmail.mock.calls[0][0].html as string;
    expect(sentHtml).toContain("https://collabill.test/verify-email?token=");
    expect(sentHtml).not.toContain("/api/auth/email-verification/verify");
  });

  it("returns already verified without sending an email", async () => {
    mocks.db.query.users.findFirst.mockResolvedValue({
      ...ownEmailRecord,
      emailVerified: new Date(),
    });

    const response = await createApp(createUser(ownerId, "OWNER")).request(
      `/email-verification/send-member/${ownerId}`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      alreadyVerified: true,
    });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("enforces the resend cooldown inside the transaction", async () => {
    chains.selectChain.limit.mockResolvedValueOnce([{ id: "recent" }]);

    const response = await createApp(createUser(ownerId, "OWNER")).request(
      `/email-verification/send-member/${ownerId}`,
      { method: "POST" },
    );

    expect(response.status).toBe(429);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("cleans up the token when sending the email fails", async () => {
    mocks.sendEmail.mockRejectedValueOnce(new Error("Brevo down"));

    const response = await createApp(createUser(ownerId, "OWNER")).request(
      `/email-verification/send-member/${ownerId}`,
      { method: "POST" },
    );

    expect(response.status).toBe(500);
    expect(mocks.db.delete).toHaveBeenCalled();
  });
});

describe("verifyEmail", () => {
  const postVerify = (token: string) =>
    createApp(createUser(ownerId, "OWNER")).request(
      "/email-verification/verify",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      },
    );

  it("verifies a valid token", async () => {
    chains.deleteChain.returning.mockResolvedValueOnce([
      {
        userId: ownerId,
        email: "owner@example.com",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    chains.updateChain.returning.mockResolvedValueOnce([{ id: ownerId }]);

    const response = await postVerify(validToken);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      status: "verified",
    });
  });

  it("reports an expired token and consumes it", async () => {
    chains.deleteChain.returning.mockResolvedValueOnce([
      {
        userId: ownerId,
        email: "owner@example.com",
        expiresAt: new Date(Date.now() - 60_000),
      },
    ]);

    const response = await postVerify(validToken);

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      success: false,
      status: "expired",
    });
    expect(mocks.tx.update).not.toHaveBeenCalled();
  });

  it("reports an unknown token as invalid", async () => {
    chains.deleteChain.returning.mockResolvedValueOnce([]);

    const response = await postVerify(validToken);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      status: "invalid",
    });
  });

  it("rejects malformed tokens", async () => {
    const response = await postVerify("not-a-token");

    expect(response.status).toBe(400);
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("treats an already-verified matching account as verified", async () => {
    chains.deleteChain.returning.mockResolvedValueOnce([
      {
        userId: ownerId,
        email: "owner@example.com",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    chains.updateChain.returning.mockResolvedValueOnce([]);
    chains.selectChain.limit.mockResolvedValueOnce([
      { email: "owner@example.com" },
    ]);

    const response = await postVerify(validToken);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      status: "verified",
    });
  });
});
