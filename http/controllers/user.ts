import { getCurrentUser } from "@/http/repositories/users.repository";
import { createFactory } from "hono/factory";

const factory = createFactory();

export const userController = {
  get: factory.createHandlers(async (c) => {
    const data = await getCurrentUser();

    return c.json(data);
  }),
};
