import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { platformAdminMiddleware } from "@/http/middleware/auth.middleware";
import type { AuthEnv, AuthUser } from "@/http/models/auth.model";

const baseUser: AuthUser = {
  id: "00000000-0000-4000-8000-0000000000aa",
  email: "user@example.com",
  name: "User",
  avatar: null,
  phoneNumber: null,
  phoneOwnerName: null,
  organizationId: null,
  organizationName: null,
  organizationRole: null,
  platformRole: null,
  emailVerified: null,
};

const platformAdmin: AuthUser = {
  ...baseUser,
  id: "00000000-0000-4000-8000-0000000000bb",
  platformRole: "PLATFORM_ADMIN",
};

const buildApp = (user: AuthUser | null) =>
  new Hono<AuthEnv>()
    .use("*", async (c, next) => {
      if (user) c.set("user", user);
      await next();
    })
    .use("*", platformAdminMiddleware)
    .get("/", (c) => c.json({ ok: true }));

describe("platformAdminMiddleware", () => {
  it("allows platform administrators", async () => {
    const res = await buildApp(platformAdmin).request("/");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("rejects organization owners", async () => {
    const owner: AuthUser = { ...baseUser, organizationRole: "OWNER" };
    const res = await buildApp(owner).request("/");
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "Forbidden: platform administrator access required",
    });
  });

  it("rejects organization admins", async () => {
    const admin: AuthUser = { ...baseUser, organizationRole: "ADMIN" };
    const res = await buildApp(admin).request("/");
    expect(res.status).toBe(403);
  });

  it("rejects collaborators", async () => {
    const collaborator: AuthUser = {
      ...baseUser,
      organizationRole: "COLLABORATOR",
    };
    const res = await buildApp(collaborator).request("/");
    expect(res.status).toBe(403);
  });

  it("rejects anonymous requests", async () => {
    const res = await buildApp(null).request("/");
    expect(res.status).toBe(403);
  });
});
