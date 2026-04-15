"server only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationIntegrations } from "@/db/schema";
import type { IntegrationType } from "@/http/models/integration.model";
import { decrypt, encrypt } from "@/lib/crypto";

export type IntegrationCredentials = {
  github?: {
    token: string;
  };
  slack?: {
    botToken: string;
    defaultChannel?: string;
  };
};

export type IntegrationConfig = {
  slack?: {
    defaultChannel?: string;
  };
  github?: {
    defaultBranch?: string;
  };
};

export const saveIntegration = async (
  organizationId: string,
  type: IntegrationType,
  credentials: IntegrationCredentials,
  config?: IntegrationConfig,
) => {
  const credentialsEncrypted = encrypt(JSON.stringify(credentials));
  const configStr = config ? JSON.stringify(config) : null;

  const [existing] = await db
    .select()
    .from(organizationIntegrations)
    .where(
      and(
        eq(organizationIntegrations.organizationId, organizationId),
        eq(organizationIntegrations.type, type),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(organizationIntegrations)
      .set({
        credentialsEncrypted,
        config: configStr,
        updatedAt: new Date(),
      })
      .where(eq(organizationIntegrations.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(organizationIntegrations)
    .values({
      organizationId,
      type,
      credentialsEncrypted,
      config: configStr,
    })
    .returning();

  return created;
};

export const getIntegration = async (
  organizationId: string,
  type: IntegrationType,
) => {
  const [integration] = await db
    .select()
    .from(organizationIntegrations)
    .where(
      and(
        eq(organizationIntegrations.organizationId, organizationId),
        eq(organizationIntegrations.type, type),
      ),
    )
    .limit(1);

  if (!integration) return null;

  let credentials: IntegrationCredentials;
  try {
    credentials = JSON.parse(decrypt(integration.credentialsEncrypted));
  } catch {
    credentials = {};
  }

  let config: IntegrationConfig | undefined;
  if (integration.config) {
    try {
      config = JSON.parse(integration.config);
    } catch {
      config = undefined;
    }
  }

  return {
    ...integration,
    credentials,
    config,
  };
};

export const getOrganizationIntegrations = async (organizationId: string) => {
  const integrations = await db
    .select()
    .from(organizationIntegrations)
    .where(eq(organizationIntegrations.organizationId, organizationId));

  return integrations.map((integration) => {
    let config: IntegrationConfig | undefined;
    if (integration.config) {
      try {
        config = JSON.parse(integration.config);
      } catch {
        config = undefined;
      }
    }

    return {
      ...integration,
      config,
      hasCredentials: !!integration.credentialsEncrypted,
    };
  });
};

export const deleteIntegration = async (
  organizationId: string,
  type: IntegrationType,
) => {
  await db
    .delete(organizationIntegrations)
    .where(
      and(
        eq(organizationIntegrations.organizationId, organizationId),
        eq(organizationIntegrations.type, type),
      ),
    );
};

export const toggleIntegration = async (
  organizationId: string,
  type: IntegrationType,
  isActive: boolean,
) => {
  await db
    .update(organizationIntegrations)
    .set({ isActive: isActive ? "true" : "false" })
    .where(
      and(
        eq(organizationIntegrations.organizationId, organizationId),
        eq(organizationIntegrations.type, type),
      ),
    );
};
