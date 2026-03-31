import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import { z } from "zod";
import {
  inviteUserAction,
  resendInvitationAction,
} from "@/http/actions/invitation.action";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  allowedAvatarTypes,
  collaboratorRateSchema,
  createInvitationSchema,
} from "@/http/models/user.model";
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
  updateUser,
  upsertCollaboratorRate,
} from "@/http/repositories/user.repository";
import { logAudit } from "@/lib/audit";
import { serverEnv } from "@/packages/env/server";
import { deleteFile, uploadFile } from "@/packages/minio";

const factory = createFactory<AuthEnv>();

const deleteS3FileFromUrl = async (urlStr: string) => {
  try {
    let path = "";
    if (urlStr.startsWith("http")) {
      const url = new URL(urlStr);
      path = url.pathname;
    } else {
      path = urlStr;
    }

    const pathParts = path.split("/").filter(Boolean);
    const bucketIndex = pathParts.indexOf(serverEnv.S3_BUCKET);
    if (bucketIndex !== -1) {
      const key = pathParts.slice(bucketIndex + 1).join("/");
      if (key) {
        await deleteFile(key);
      }
    }
  } catch (e) {
    console.error("Failed to delete S3 file:", e);
  }
};

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
      avatar: z.string().optional().nullable(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { name, email, avatar } = c.req.valid("json");

    if (avatar === null && user.avatar) {
      await deleteS3FileFromUrl(user.avatar);
    }

    const updatedUser = await updateUser(user.id, { name, email, avatar });

    return c.json(updatedUser);
  },
);

export const uploadAvatar = factory.createHandlers(
  zValidator(
    "form",
    z.object({
      file: z
        .any()
        .refine(
          (file) => file instanceof File && file.size > 0,
          "File is empty",
        ),
    }),
  ),
  async (c) => {
    try {
      const user = c.get("user");
      const { file } = c.req.valid("form");

      if (!allowedAvatarTypes.includes(file.type)) {
        return c.json(
          { error: "Invalid file type. Only images are allowed." },
          400,
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return c.json({ error: "File size exceeds 5MB limit." }, 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileExtension = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExtension}`;
      const key = `avatars/${user.id}/${fileName}`;

      if (user.avatar) {
        await deleteS3FileFromUrl(user.avatar);
      }

      const url = await uploadFile(buffer, key, file.type);

      await updateUser(user.id, { avatar: url });

      return c.json({ url });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      return c.json({ error: "Failed to upload avatar" }, 500);
    }
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

export const createInvitation = factory.createHandlers(
  zValidator("json", createInvitationSchema),
  async (c) => {
    const currentUser = c.get("user");
    const isOwner = currentUser.organizationRole === "OWNER";

    if (!isOwner) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const data = c.req.valid("json");
    const result = await inviteUserAction(data);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ message: result.message }, 201);
  },
);

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

export const resendInvitation = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const isOwner = currentUser.organizationRole === "OWNER";

  if (!isOwner) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID required" }, 400);

  const result = await resendInvitationAction(id);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({ message: result.message });
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

  await logAudit({
    organizationId: currentUser.organizationId,
    actorId: currentUser.id,
    action: "DELETE",
    entity: "USER",
    entityId: id,
  });

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

    await logAudit({
      organizationId: currentUser.organizationId,
      actorId: currentUser.id,
      action: "UPDATE",
      entity: "USER",
      entityId: id,
      metadata: { previousRole: "unknown", newRole: role },
    });

    return c.json({ message: "Role updated" });
  },
);

export const getCollaboratorRateHandler = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");
  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID required" }, 400);

  if (!currentUser.organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  const rate = await getCollaboratorRate(id, currentUser.organizationId);
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

    if (!currentUser.organizationId) {
      return c.json({ error: "No organization found" }, 404);
    }

    const rates = c.req.valid("json");

    const updatedRate = await upsertCollaboratorRate(
      id,
      currentUser.organizationId,
      rates,
    );

    await logAudit({
      organizationId: currentUser.organizationId,
      actorId: currentUser.id,
      action: "UPDATE",
      entity: "USER",
      entityId: id,
      metadata: { type: "collaborator_rate", rates },
    });

    return c.json(updatedRate);
  },
);
