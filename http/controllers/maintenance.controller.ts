import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import { closeStaleIterations } from "@/http/repositories/iteration.repository";

const factory = createFactory<AuthEnv>();

export const closeStaleIterationsHandler = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");

  if (currentUser.organizationRole !== "OWNER") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const result = await closeStaleIterations();

  return c.json({
    message: "Closed stale iterations successfully",
    ...result,
  });
});
