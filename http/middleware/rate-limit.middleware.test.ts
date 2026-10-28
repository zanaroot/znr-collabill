import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  rateLimit,
  resetRateLimitsForTests,
} from "@/http/middleware/rate-limit.middleware";
import type { AuthEnv } from "@/http/models/auth.model";

const buildUser = (id: string) => ({
  id,
  email: `${id}@example.com`,
  name: id,
  avatar: null,
  phoneNumber: null,
  phoneOwnerName: null,
  organizationId: "org-1",
  organizationName: "Org",
  organizationRole: "COLLABORATOR" as const,
});

const buildApp = (options: {
  name: string;
  limit: number;
  windowMs: number;
  keyBy?: "user" | "ip";
}) => {
  let currentUser: AuthEnv["Variables"]["user"] | undefined;

  const app = new Hono<AuthEnv>();
  app.use("*", async (c, next) => {
    if (currentUser) c.set("user", currentUser);
    await next();
  });
  app.use("*", rateLimit(options));
  app.get("/", (c) => c.json({ ok: true }));

  return {
    app,
    setUser: (user: AuthEnv["Variables"]["user"] | undefined) => {
      currentUser = user;
    },
  };
};

afterEach(() => {
  resetRateLimitsForTests();
  vi.useRealTimers();
});

describe("rateLimit middleware", () => {
  it("allows requests up to the limit then returns 429", async () => {
    const { app, setUser } = buildApp({
      name: "test-limit",
      limit: 2,
      windowMs: 60_000,
    });
    setUser(buildUser("u1"));

    expect((await app.request("/")).status).toBe(200);
    expect((await app.request("/")).status).toBe(200);
    const blocked = await app.request("/");
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "Too many requests" });
  });

  it("tracks buckets per user", async () => {
    const { app, setUser } = buildApp({
      name: "test-user-key",
      limit: 1,
      windowMs: 60_000,
    });

    setUser(buildUser("u1"));
    expect((await app.request("/")).status).toBe(200);
    expect((await app.request("/")).status).toBe(429);

    setUser(buildUser("u2"));
    expect((await app.request("/")).status).toBe(200);
  });

  it("keys by ip when configured", async () => {
    const { app, setUser } = buildApp({
      name: "test-ip-key",
      limit: 1,
      windowMs: 60_000,
      keyBy: "ip",
    });
    setUser(buildUser("u1"));

    const first = await app.request("/", {
      headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
    });
    expect(first.status).toBe(200);

    const second = await app.request("/", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    expect(second.status).toBe(429);

    const other = await app.request("/", {
      headers: { "x-forwarded-for": "10.0.0.9" },
    });
    expect(other.status).toBe(200);
  });

  it("resets after the window elapses", async () => {
    vi.useFakeTimers();
    const { app, setUser } = buildApp({
      name: "test-window",
      limit: 1,
      windowMs: 60_000,
    });
    setUser(buildUser("u1"));

    expect((await app.request("/")).status).toBe(200);
    expect((await app.request("/")).status).toBe(429);

    vi.advanceTimersByTime(60_001);
    expect((await app.request("/")).status).toBe(200);
  });
});
