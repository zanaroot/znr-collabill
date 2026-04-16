import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import { z } from "zod";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  deleteOrganizationById,
  getOrganizationOwner,
  getUserOrganizationsWithMembers,
  removeOrganizationMember,
} from "@/http/repositories/organization.repository";

const factory = createFactory<AuthEnv>();

export const leaveOrganization = factory.createHandlers(async (c) => {
  const { getCookie } = await import("hono/cookie");
  const { updateSessionOrganization } = await import(
    "@/http/repositories/session.repository"
  );

  const currentUser = c.get("user");
  const organizationId = c.req.param("id");

  if (!organizationId) {
    return c.json({ error: "Organization ID is required" }, 400);
  }

  try {
    await removeOrganizationMember(organizationId, currentUser.id);

    const token = getCookie(c, "session_token");
    if (token && currentUser.organizationId === organizationId) {
      await updateSessionOrganization(token, null);
    }

    return c.json({ message: "Left organization successfully", success: true });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

export const getOwnedOrganizations = factory.createHandlers(async (c) => {
  const currentUser = c.get("user");

  if (currentUser.organizationRole === "COLLABORATOR") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const organizations = await getUserOrganizationsWithMembers(currentUser.id);
  return c.json(organizations);
});

export const deleteOrganization = factory.createHandlers(
  zValidator(
    "json",
    z.object({
      confirmDelete: z.literal("DELETE"),
      hardDelete: z.boolean().optional().default(false),
    }),
  ),
  async (c) => {
    const currentUser = c.get("user");

    const id = c.req.param("id");
    if (!id) return c.json({ error: "ID required" }, 400);

    const { hardDelete } = c.req.valid("json");

    await deleteOrganizationById(id, currentUser.id, hardDelete);
    return c.json({
      message: hardDelete
        ? "Organization permanently deleted"
        : "Organization deleted",
      success: true,
    });
  },
);

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

export const createOrganization = factory.createHandlers(
  zValidator("json", z.object({ name: z.string().min(1) })),
  async (c) => {
    const { getCookie } = await import("hono/cookie");
    const { createOrganization: createOrg } = await import(
      "@/http/repositories/organization.repository"
    );
    const { updateSessionOrganization } = await import(
      "@/http/repositories/session.repository"
    );

    const currentUser = c.get("user");
    const { name } = c.req.valid("json");

    const organization = await createOrg(name, currentUser.id);

    const token = getCookie(c, "session_token");
    if (token) {
      await updateSessionOrganization(token, organization.id);
    }

    return c.json(
      { message: "Organization created successfully", success: true },
      201,
    );
  },
);

export const getMyOrganizations = factory.createHandlers(async (c) => {
  const { getUserOrganizations } = await import(
    "@/http/repositories/organization.repository"
  );
  const currentUser = c.get("user");

  const organizations = await getUserOrganizations(currentUser.id);
  return c.json(organizations);
});

export const getOrganizationSlackSettings = factory.createHandlers(
  async (c) => {
    const currentUser = c.get("user");

    if (currentUser.organizationRole !== "OWNER") {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (!currentUser.organizationId) {
      return c.json({ error: "No organization selected" }, 400);
    }

    const { getOrganizationById } = await import(
      "@/http/repositories/organization.repository"
    );

    const org = await getOrganizationById(currentUser.organizationId);
    if (!org) {
      return c.json({ error: "Organization not found" }, 404);
    }

    return c.json({
      slackBotTokenEncrypted: !!org.slackBotTokenEncrypted,
      slackDefaultChannel: org.slackDefaultChannel,
    });
  },
);

export const updateOrganizationSlackSettings = factory.createHandlers(
  zValidator(
    "json",
    z.object({
      slackBotToken: z.string().optional().nullable(),
      slackDefaultChannel: z.string().optional().nullable(),
    }),
  ),
  async (c) => {
    const currentUser = c.get("user");

    if (currentUser.organizationRole !== "OWNER") {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (!currentUser.organizationId) {
      return c.json({ error: "No organization selected" }, 400);
    }

    const payload = c.req.valid("json");

    const { updateOrganizationSlackSettings } = await import(
      "@/http/repositories/organization.repository"
    );
    const { encryptSlackToken } = await import("@/packages/slack");

    const encryptedToken = payload.slackBotToken
      ? encryptSlackToken(payload.slackBotToken)
      : null;

    await updateOrganizationSlackSettings(currentUser.organizationId, {
      slackBotTokenEncrypted: encryptedToken,
      slackDefaultChannel: payload.slackDefaultChannel,
    });

    return c.json({ message: "Slack settings updated", success: true });
  },
);
