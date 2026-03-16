import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  deleteOrganizationById,
  getUserOrganizationsWithMembers,
  isOrganizationOwner,
} from "@/http/repositories/organization.repository";

const factory = createFactory<AuthEnv>();

export const getOwnedOrganizations = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");

  if (currentUser.organizationRole !== "OWNER") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const organizations = await getUserOrganizationsWithMembers(currentUser.id);
  return c.json(organizations);
});

export const deleteOrganization = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");

  if (currentUser.organizationRole !== "OWNER") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID required" }, 400);

  const canDelete = await isOrganizationOwner(id, currentUser.id);
  if (!canDelete) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await deleteOrganizationById(id);
  return c.json({ message: "Organization deleted" });
});
