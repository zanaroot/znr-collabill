import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import { findValidSessionByToken } from "@/http/repositories/session.repository";

export const authMiddleware = createMiddleware<AuthEnv>(
  async (c: Context, next: Next) => {
    const token =
      c.req.header("Authorization")?.replace("Bearer ", "") ??
      getCookieValue(c, "session_token");

    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const result = await findValidSessionByToken(token);

    if (!result) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("user", {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
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
