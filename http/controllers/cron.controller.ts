import { createFactory } from "hono/factory";
import { env } from "hono/adapter";
import { closeStaleIterations } from "@/http/repositories/iteration.repository";

const factory = createFactory();

export const cronController = {
  closeIterations: factory.createHandlers(async (c) => {
    // Secure this endpoint with a secret
    const { CRON_SECRET } = env<{ CRON_SECRET: string }>(c);
    const cronSecret = CRON_SECRET as string | undefined;
    const authHeader = c.req.header("Authorization");

    if (!cronSecret || `Bearer ${cronSecret}` !== authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const result = await closeStaleIterations();

    return c.json({
      message: "Cron job executed successfully",
      ...result,
    });
  }),
};
