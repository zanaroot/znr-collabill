import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { deleteCookie, getCookie } from "hono/cookie";
import { z } from "zod";
import type { AuthEnv } from "@/http/models/auth.model";
import { deleteSessionByToken } from "@/http/repositories/session.repository";

const LogoutResponseSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  summary: "Logout",
  description: "Logout current user by clearing session cookie",
  responses: {
    200: {
      description: "Logout successful",
      content: {
        "application/json": {
          schema: LogoutResponseSchema,
        },
      },
    },
  },
});

export const authRoutes = new OpenAPIHono<AuthEnv>().openapi(
  logoutRoute,
  async (c) => {
    const token = getCookie(c, "session_token");

    if (token) {
      await deleteSessionByToken(token);
    }

    deleteCookie(c, "session_token", { path: "/" });

    return c.json({
      message: "Logout successful",
      success: true,
    });
  },
);
