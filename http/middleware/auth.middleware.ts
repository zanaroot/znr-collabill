import { and, eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
import type { AuthEnv } from "@/http/models/auth.model";
import { findValidSessionByToken } from "@/http/repositories/session.repository";

export const authMiddleware = createMiddleware<AuthEnv>(
  async (c: Context, next: Next) => {
    const token =
      c.req.header("Authorization")?.replace("Bearer ", "") ??
      getCookieValue(c, "session_token");

    if (!token) {
      return c.redirect("/", 302);
    }

    const result = await findValidSessionByToken(token);

    if (!result) {
      return c.redirect("/", 302);
    }

    let organizationRole: "OWNER" | "COLLABORATOR" | null = null;
    if (result.session.organizationId) {
      const members = await db
        .select({ role: organizationMembers.role })
        .from(organizationMembers)
        .where(
          and(
            eq(
              organizationMembers.organizationId,
              result.session.organizationId,
            ),
            eq(organizationMembers.userId, result.user.id),
          ),
        )
        .limit(1);
      organizationRole = members[0]?.role ?? null;
    }

    c.set("user", {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      organizationId: result.organization?.id ?? null,
      organizationName: result.organization?.name ?? null,
      organizationRole,
    });

    await next();
  },
);

const getCookieValue = (c: Context, name: string): string | undefined => {
  const cookie = c.req.header("Cookie");
  if (!cookie) return undefined;

  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1];
};
