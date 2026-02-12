import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";

const factory = createFactory<AuthEnv>();

export const getMe = factory.createHandlers(async (c) => {
  const user = c.get("user");
  return c.json(user);
});
