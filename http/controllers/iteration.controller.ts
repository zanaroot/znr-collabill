import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  createIterationSchema,
  updateIterationSchema,
} from "@/http/models/iteration.model";
import {
  createIteration,
  deleteIteration,
  findIterationById,
  findIterationsByOrganizationId,
  updateIteration,
} from "@/http/repositories/iteration.repository";

const factory = createFactory<AuthEnv>();

export const iterationController = {
  list: factory.createHandlers(async (c) => {
    const user = c.get("user");
    if (!user.organizationId) {
      return c.json({ error: "No organization found" }, 404);
    }
    const iterations = await findIterationsByOrganizationId(user.organizationId);
    return c.json(iterations);
  }),

  get: factory.createHandlers(async (c) => {
    const id = c.req.param("id");
    if (!id) return c.json({ error: "Invalid ID" }, 400);
    const user = c.get("user");
    const iteration = await findIterationById(id);
    if (!iteration) return c.json({ error: "Iteration not found" }, 404);
    if (iteration.organizationId !== user.organizationId) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    return c.json(iteration);
  }),

  create: factory.createHandlers(
    zValidator("json", createIterationSchema),
    async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");
      
      if (!user.organizationId) {
        return c.json({ error: "No organization found" }, 404);
      }

      const iteration = await createIteration({
        ...input,
        organizationId: user.organizationId,
      });
      return c.json(iteration, 201);
    },
  ),

  update: factory.createHandlers(
    zValidator("json", updateIterationSchema),
    async (c) => {
      const id = c.req.param("id");
      if (!id) return c.json({ error: "Invalid ID" }, 400);
      const user = c.get("user");
      const input = c.req.valid("json");

      const existing = await findIterationById(id);
      if (!existing) return c.json({ error: "Iteration not found" }, 404);
      if (existing.organizationId !== user.organizationId) {
        return c.json({ error: "Unauthorized" }, 403);
      }

      const iteration = await updateIteration(id, input);
      return c.json(iteration);
    },
  ),

  delete: factory.createHandlers(async (c) => {
    const id = c.req.param("id");
    if (!id) return c.json({ error: "Invalid ID" }, 400);
    const user = c.get("user");

    const existing = await findIterationById(id);
    if (!existing) return c.json({ error: "Iteration not found" }, 404);
    if (existing.organizationId !== user.organizationId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    await deleteIteration(id);
    return c.json({ success: true });
  }),
};
