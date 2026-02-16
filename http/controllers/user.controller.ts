import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  deleteInvitationById,
  getAllInvitations,
} from "@/http/repositories/invitation.repository";
import {
  deleteUser,
  getAllUsersWithRoles,
  hasUserRole,
  updateUserRole,
} from "@/http/repositories/user.repository";

const factory = createFactory<AuthEnv>();

export const getMe = factory.createHandlers(async (c) => {
  const user = c.get("user");
  return c.json(user);
});

export const getUsers = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const isOwner = await hasUserRole(currentUser.id, "OWNER");

  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const users = await getAllUsersWithRoles();
  return c.json(users);
});

export const getInvitations = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const isOwner = await hasUserRole(currentUser.id, "OWNER");

  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const invitations = await getAllInvitations();
  return c.json(invitations);
});

export const revokeInvitation = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const isOwner = await hasUserRole(currentUser.id, "OWNER");

  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { id } = c.req.param();
  await deleteInvitationById(id);
  return c.json({ message: "Invitation revoked" });
});

export const removeUser = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const isOwner = await hasUserRole(currentUser.id, "OWNER");

  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { id } = c.req.param();
  if (id === currentUser.id) {
    return c.json({ error: "Cannot remove yourself" }, 400);
  }

  await deleteUser(id);
  return c.json({ message: "User removed" });
});

export const updateUserRoleHandler = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const isOwner = await hasUserRole(currentUser.id, "OWNER");

  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { id } = c.req.param();
  const { role } = await c.req.json<{ role: "OWNER" | "COLLABORATOR" }>();

  if (id === currentUser.id) {
    return c.json({ error: "Cannot change your own role" }, 400);
  }

  await updateUserRole(id, role);
  return c.json({ message: "Role updated" });
});
