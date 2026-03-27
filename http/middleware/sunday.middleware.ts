import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";

export const sundayMiddleware = createMiddleware(
  async (c: Context, next: Next) => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    if (dayOfWeek === 0) {
      return c.json(
        {
          error:
            "Access denied. Presence tracking is not available on Sundays.",
        },
        403,
      );
    }

    await next();
  },
);
