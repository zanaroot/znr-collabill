import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  deleteInvitationById,
  getAllInvitations,
} from "@/http/repositories/invitation.repository";
import {
  getOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "@/http/repositories/organization.repository";

const factory = createFactory<AuthEnv>();

export const getMe = factory.createHandlers(async (c) => {
  const user = c.get("user");
  return c.json(user);
});

export const getUsers = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  if (!currentUser.organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  const isOwner = currentUser.organizationRole === "OWNER";
  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const members = await getOrganizationMembers(currentUser.organizationId);
  return c.json(members);
});

export const getInvitations = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  if (!currentUser.organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  const isOwner = currentUser.organizationRole === "OWNER";
  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const invitations = await getAllInvitations(currentUser.organizationId);
  return c.json(invitations);
});

export const revokeInvitation = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const isOwner = currentUser.organizationRole === "OWNER";

  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { id } = c.req.param();
  await deleteInvitationById(id);
  return c.json({ message: "Invitation revoked" });
});

export const removeUser = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const isOwner = currentUser.organizationRole === "OWNER";

  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { id } = c.req.param();
  if (id === currentUser.id) {
    return c.json({ error: "Cannot remove yourself" }, 400);
  }

  if (!currentUser.organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  await removeOrganizationMember(currentUser.organizationId, id);
  return c.json({ message: "User removed from organization" });
});

export const updateUserRoleHandler = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const isOwner = currentUser.organizationRole === "OWNER";

  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { id } = c.req.param();
  const { role } = await c.req.json<{ role: "OWNER" | "COLLABORATOR" }>();

  if (id === currentUser.id) {
    return c.json({ error: "Cannot change your own role" }, 400);
  }

  if (!currentUser.organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  await updateOrganizationMemberRole(currentUser.organizationId, id, role);
  return c.json({ message: "Role updated" });
});
