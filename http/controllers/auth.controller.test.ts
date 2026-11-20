// @vitest-environment node

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { register } from "./auth.controller";

const mocks = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  registerOrganizationAndOwner: vi.fn(),
  createSession: vi.fn(),
  issueEmailVerification: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/http/repositories/organization.repository", () => ({
  getUserOrganizations: vi.fn(),
  registerOrganizationAndOwner: mocks.registerOrganizationAndOwner,
}));
vi.mock("@/http/repositories/session.repository", () => ({
  createSession: mocks.createSession,
  deleteSessionByToken: vi.fn(),
}));
vi.mock("@/http/repositories/user.repository", () => ({
  findUserByEmail: mocks.findUserByEmail,
}));
vi.mock("@/http/services/email-verification.service", () => ({
  issueEmailVerification: mocks.issueEmailVerification,
}));
vi.mock("@/lib/sentry", () => ({ logError: mocks.logError }));
vi.mock("@/lib/session-token", () => ({
  generateSessionToken: () => "session-token",
}));
vi.mock("@/lib/date", () => ({
  getFutureDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
}));
vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.compare,
    hash: mocks.hash,
  },
}));

const existingUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "owner@example.com",
  name: "Owner",
  passwordHash: "hashed-password",
  emailVerified: null,
};

const createdOrganization = { id: "org-1" };

const createApp = () => new Hono().post("/register", ...register);

const registerPayload = {
  organizationName: "Acme",
  name: "Owner",
  email: "owner@example.com",
  password: "password123",
};

beforeEach(() => {
  vi.clearAllMocks();

  mocks.registerOrganizationAndOwner.mockResolvedValue({
    user: existingUser,
    organization: createdOrganization,
  });
  mocks.createSession.mockResolvedValue(undefined);
  mocks.issueEmailVerification.mockResolvedValue({ status: "sent" });
  mocks.hash.mockResolvedValue("new-hashed-password");
});

describe("register", () => {
  it("normalizes the email before looking up the user", async () => {
    mocks.findUserByEmail.mockResolvedValue(null);

    const response = await createApp().request("/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...registerPayload,
        email: "  Owner@Example.com ",
      }),
    });

    expect(response.status).toBe(201);
    expect(mocks.findUserByEmail).toHaveBeenCalledWith("owner@example.com");
  });

  it("does not allow taking over an existing account with a wrong password", async () => {
    mocks.findUserByEmail.mockResolvedValue(existingUser);
    mocks.compare.mockResolvedValue(false);

    const response = await createApp().request("/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(registerPayload),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      success: false,
      error:
        "An account with this email already exists. Please sign in instead.",
    });
    expect(mocks.compare).toHaveBeenCalledWith(
      registerPayload.password,
      existingUser.passwordHash,
    );
    expect(mocks.registerOrganizationAndOwner).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("allows an existing user with the correct password to create another organization", async () => {
    mocks.findUserByEmail.mockResolvedValue(existingUser);
    mocks.compare.mockResolvedValue(true);

    const response = await createApp().request("/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(registerPayload),
    });

    expect(response.status).toBe(201);
    expect(mocks.registerOrganizationAndOwner).toHaveBeenCalledWith({
      email: "owner@example.com",
      name: "Owner",
      passwordHash: undefined,
      organizationName: "Acme",
    });
    expect(mocks.createSession).toHaveBeenCalled();
  });

  it("hashes the password for new users and sends verification server-side", async () => {
    mocks.findUserByEmail.mockResolvedValue(null);

    const response = await createApp().request("/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(registerPayload),
    });

    expect(response.status).toBe(201);
    expect(mocks.hash).toHaveBeenCalledWith(registerPayload.password, 10);
    expect(mocks.registerOrganizationAndOwner).toHaveBeenCalledWith({
      email: registerPayload.email,
      name: registerPayload.name,
      passwordHash: "new-hashed-password",
      organizationName: registerPayload.organizationName,
    });
    expect(mocks.issueEmailVerification).toHaveBeenCalledWith(existingUser);
    expect(await response.json()).toMatchObject({
      success: true,
      verificationEmailSent: true,
    });
  });
});
