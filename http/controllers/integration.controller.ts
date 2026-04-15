import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { createFactory } from "hono/factory";
import { z } from "zod";
import type { AuthEnv, AuthUser } from "@/http/models/auth.model";
import {
  deleteIntegrationSchema,
  saveIntegrationSchema,
  toggleIntegrationSchema,
} from "@/http/models/integration.model";
import {
  deleteIntegration,
  getIntegration,
  getOrganizationIntegrations,
  saveIntegration,
  toggleIntegration,
} from "@/http/repositories/integration.repository";
import { decrypt } from "@/lib/crypto";

const factory = createFactory<AuthEnv>();

const getOrganizationId = (c: Context<AuthEnv>) => {
  const user = c.get("user") as AuthUser;
  if (!user.organizationId) {
    return null;
  }
  if (user.organizationRole !== "OWNER" && user.organizationRole !== "ADMIN") {
    return null;
  }
  return user.organizationId;
};

export const getIntegrations = factory.createHandlers(async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const integrations = await getOrganizationIntegrations(organizationId);
  return c.json(integrations);
});

export const getIntegrationByType = factory.createHandlers(
  zValidator("param", z.object({ type: z.enum(["GITHUB", "SLACK"]) })),
  async (c) => {
    const organizationId = getOrganizationId(c);
    if (!organizationId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { type } = c.req.valid("param");
    const integration = await getIntegration(organizationId, type);

    if (!integration) {
      return c.json({ error: "Integration not found" }, 404);
    }

    return c.json({
      ...integration,
      credentials: undefined,
      hasCredentials: !!integration.credentialsEncrypted,
    });
  },
);

export const saveIntegrationHandler = factory.createHandlers(
  zValidator("json", saveIntegrationSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    if (!organizationId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const payload = c.req.valid("json");
    const { type, credentials, config } = payload;

    await saveIntegration(organizationId, type, credentials as never, config);

    return c.json({ message: "Integration saved", success: true }, 201);
  },
);

export const updateIntegration = factory.createHandlers(
  zValidator("param", z.object({ type: z.enum(["GITHUB", "SLACK"]) })),
  zValidator("json", saveIntegrationSchema.omit({ type: true })),
  async (c) => {
    const organizationId = getOrganizationId(c);
    if (!organizationId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { type } = c.req.valid("param");
    const payload = c.req.valid("json");
    const { credentials, config } = payload;

    await saveIntegration(organizationId, type, credentials as never, config);

    return c.json({ message: "Integration updated", success: true });
  },
);

export const toggleIntegrationHandler = factory.createHandlers(
  zValidator("json", toggleIntegrationSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    if (!organizationId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { type, isActive } = c.req.valid("json");

    await toggleIntegration(organizationId, type, isActive);

    return c.json({ message: "Integration toggled", success: true });
  },
);

export const deleteIntegrationHandler = factory.createHandlers(
  zValidator("json", deleteIntegrationSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    if (!organizationId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { type } = c.req.valid("json");

    await deleteIntegration(organizationId, type);

    return c.json({ message: "Integration deleted", success: true });
  },
);

export const getIntegrationCredentials = factory.createHandlers(
  zValidator("param", z.object({ type: z.enum(["GITHUB", "SLACK"]) })),
  async (c) => {
    const organizationId = getOrganizationId(c);
    if (!organizationId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { type } = c.req.valid("param");
    const integration = await getIntegration(organizationId, type);

    if (!integration) {
      return c.json({ error: "Integration not found" }, 404);
    }

    let credentials: Record<string, unknown> = {};
    try {
      credentials = JSON.parse(decrypt(integration.credentialsEncrypted));
    } catch {
      credentials = {};
    }

    return c.json({ credentials, config: integration.config });
  },
);
