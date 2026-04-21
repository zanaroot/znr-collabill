"server only";

import type { IntegrationType } from "@/http/models/integration.model";
import { getIntegration } from "@/http/repositories/integration.repository";
import { getOrganizationById } from "@/http/repositories/organization.repository";
import { decrypt } from "@/lib/crypto";

export const getOrgIntegrationCredentials = async (
  organizationId: string,
  type: IntegrationType,
) => {
  const integration = await getIntegration(organizationId, type);

  if (!integration || integration.isActive !== "true") {
    return null;
  }

  return integration.credentials;
};

export const getOrgSlackCredentials = async (organizationId: string) => {
  const creds = await getOrgIntegrationCredentials(organizationId, "SLACK");

  if (creds?.slack) {
    return creds.slack;
  }

  // Fallback to organizations table
  const org = await getOrganizationById(organizationId);
  if (org?.slackBotTokenEncrypted) {
    try {
      return {
        botToken: decrypt(org.slackBotTokenEncrypted),
        defaultChannel: org.slackDefaultChannel || undefined,
      };
    } catch {
      return null;
    }
  }

  return null;
};

export const getOrgGithubCredentials = async (organizationId: string) => {
  const creds = await getOrgIntegrationCredentials(organizationId, "GITHUB");
  return creds?.github ?? null;
};

export const getOrgIntegrationConfig = async (
  organizationId: string,
  type: IntegrationType,
) => {
  const integration = await getIntegration(organizationId, type);
  return integration?.config ?? null;
};

export const getOrgSlackCredentialsDecrypted = async (
  organizationId: string,
) => {
  const integration = await getIntegration(organizationId, "SLACK");

  if (integration && integration.isActive === "true") {
    const creds = integration.credentials as {
      slack?: { botToken: string; defaultChannel?: string };
    };
    if (creds?.slack?.botToken) {
      return {
        botToken: creds.slack.botToken,
        defaultChannel: creds.slack.defaultChannel,
      };
    }
  }

  // Fallback to organizations table
  const org = await getOrganizationById(organizationId);
  if (org?.slackBotTokenEncrypted) {
    try {
      return {
        botToken: decrypt(org.slackBotTokenEncrypted),
        defaultChannel: org.slackDefaultChannel || undefined,
      };
    } catch (error) {
      console.error("[Slack] Failed to decrypt token from org table:", error);
      return null;
    }
  }

  return null;
};

export const getOrgGithubCredentialsDecrypted = async (
  organizationId: string,
) => {
  const integration = await getIntegration(organizationId, "GITHUB");

  if (!integration || integration.isActive !== "true") {
    return null;
  }

  const creds = integration.credentials as { github?: { token: string } };
  if (!creds?.github?.token) {
    return null;
  }

  return creds.github;
};
