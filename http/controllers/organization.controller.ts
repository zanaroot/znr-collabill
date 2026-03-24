import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  deleteOrganizationById,
  getOrganizationOwner,
  getUserOrganizationsWithMembers,
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

  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID required" }, 400);

  await deleteOrganizationById(id, currentUser.id);
  return c.json({ message: "Organization deleted" });
});

export const organizationOwner = factory.createHandlers(async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID required" }, 400);

  const owner = await getOrganizationOwner(id);
  return c.json(owner);
});

export const selectOrganization = factory.createHandlers(async (c) => {
  const { getCookie } = await import("hono/cookie");
  const { updateSessionOrganization } = await import(
    "@/http/repositories/session.repository"
  );

  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID required" }, 400);

  const token = getCookie(c, "session_token");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  await updateSessionOrganization(token, id);

  return c.json({ message: "Organization selected", success: true });
});

export const getMyOrganizations = factory.createHandlers(async (c) => {
  const { getUserOrganizations } = await import(
    "@/http/repositories/organization.repository"
  );
  const currentUser = c.get("user");

  const organizations = await getUserOrganizations(currentUser.id);
  return c.json(organizations);
});
