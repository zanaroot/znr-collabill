import { deleteCookie, getCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import { deleteSessionByToken } from "@/http/repositories/session.repository";

const factory = createFactory<AuthEnv>();

export const logout = factory.createHandlers(async (c) => {
  const token = getCookie(c, "session_token");

  if (token) {
    await deleteSessionByToken(token);
  }

  deleteCookie(c, "session_token", { path: "/" });

  return c.json({ message: "Logout successful", success: true });
});
