import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
import type { AuthEnv } from "@/http/models/auth.model";
import type { Role } from "@/http/models/user.model";
import { findValidSessionByToken } from "@/http/repositories/session.repository";

export const authMiddleware = createMiddleware<AuthEnv>(
  async (c: Context, next: Next) => {
    try {
      const token =
        c.req.header("Authorization")?.replace("Bearer ", "") ??
        getCookieValue(c, "session_token");

      if (!token) {
        return c.redirect("/", 302);
      }

      const result = await findValidSessionByToken(token);

      if (!result || !result.user || !result.session) {
        return c.redirect("/", 302);
      }

      let organizationRole: Role | null = null;
      if (result.session.organizationId) {
        const members = await db
          .select({ role: organizationMembers.role })
          .from(organizationMembers)
          .where(
            eq(
              organizationMembers.organizationId,
              result.session.organizationId,
            ),
          )
          .limit(1);
        organizationRole = members[0]?.role ?? null;
      }

      c.set("user", {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatar: result.user.avatar ?? null,
        organizationId: result.organization?.id ?? null,
        organizationName: result.organization?.name ?? null,
        organizationRole,
      });

      await next();
    } catch (error) {
      Sentry.captureException(error);
      return c.json({ error: "Something went wrong" }, 500);
    }
  },
);

export const adminMiddleware = createMiddleware<AuthEnv>(
  async (c: Context, next: Next) => {
    const user = c.get("user");

    if (
      !user ||
      (user.organizationRole !== "OWNER" && user.organizationRole !== "ADMIN")
    ) {
      return c.json({ error: "Forbidden: Admin or Owner role required" }, 403);
    }

    await next();
  },
);

export const ownerMiddleware = createMiddleware<AuthEnv>(
  async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user || user.organizationRole !== "OWNER") {
      return c.json({ error: "Forbidden: Owner role required" }, 403);
    }

    await next();
  },
);

const getCookieValue = (c: Context, name: string): string | undefined => {
  const cookie = c.req.header("Cookie");
  if (!cookie) return undefined;

  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1];
};
