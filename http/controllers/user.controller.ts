import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import { z } from "zod";
import type { AuthEnv } from "@/http/models/auth.model";
import { collaboratorRateSchema } from "@/http/models/user.model";
import {
  deleteInvitationById,
  getAllInvitations,
} from "@/http/repositories/invitation.repository";
import {
  getOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "@/http/repositories/organization.repository";
import {
  getCollaboratorRate,
  upsertCollaboratorRate,
  updateUser,
} from "@/http/repositories/user.repository";

const factory = createFactory<AuthEnv>();

export const getMe = factory.createHandlers(async (c) => {
  const user = c.get("user");
  return c.json(user);
});

export const updateMe = factory.createHandlers(
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Name is required").optional(),
      email: z.string().email("Invalid email").optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { name, email } = c.req.valid("json");

    const updatedUser = await updateUser(user.id, { name, email });

    return c.json(updatedUser);
  },
);

export const getUsers = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  if (!currentUser.organizationId) {
    return c.json({ error: "No organization found" }, 404);
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

  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID required" }, 400);
  await deleteInvitationById(id);
  return c.json({ message: "Invitation revoked" });
});

export const removeUser = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const isOwner = currentUser.organizationRole === "OWNER";

  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID required" }, 400);

  if (id === currentUser.id) {
    return c.json({ error: "Cannot remove yourself" }, 400);
  }

  if (!currentUser.organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  await removeOrganizationMember(currentUser.organizationId, id);
  return c.json({ message: "User removed from organization" });
});

export const updateUserRoleHandler = factory.createHandlers(
  zValidator(
    "json",
    z.object({ role: z.enum(["OWNER", "ADMIN", "COLLABORATOR"]) }),
  ),
  async (c) => {
    const currentUser = c.get("user");
    const isOwner = currentUser.organizationRole === "OWNER";

    if (!isOwner) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const id = c.req.param("id");
    if (!id) return c.json({ error: "ID required" }, 400);
    const { role } = c.req.valid("json");

    if (id === currentUser.id) {
      return c.json({ error: "Cannot change your own role" }, 400);
    }

    if (!currentUser.organizationId) {
      return c.json({ error: "No organization found" }, 404);
    }

    await updateOrganizationMemberRole(currentUser.organizationId, id, role);
    return c.json({ message: "Role updated" });
  },
);

export const getCollaboratorRateHandler = factory.createHandlers(async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID required" }, 400);

  const rate = await getCollaboratorRate(id);
  if (!rate) {
    return c.json({ error: "Collaborator rate not found" }, 404);
  }

  return c.json(rate);
});

export const updateCollaboratorRateHandler = factory.createHandlers(
  zValidator("json", collaboratorRateSchema),
  async (c) => {
    const currentUser = c.get("user");
    const isOwner = currentUser.organizationRole === "OWNER";

    if (!isOwner && currentUser.id !== c.req.param("id")) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const id = c.req.param("id");
    if (!id) return c.json({ error: "ID required" }, 400);
    const rates = c.req.valid("json");

    const updatedRate = await upsertCollaboratorRate(id, rates);
    return c.json(updatedRate);
  },
);
