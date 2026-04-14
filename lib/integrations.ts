"server only";

import type { IntegrationType } from "@/http/models/integration.model";
import { getIntegration } from "@/http/repositories/integration.repository";
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
  return creds?.slack ?? null;
};

export const getOrgGithubCredentials = async (organizationId: string) => {
  const creds = await getOrgIntegrationCredentials(organizationId, "GITHUB");
  return creds?.github ?? null;
};

export const getOrgBrevoCredentials = async (organizationId: string) => {
  const creds = await getOrgIntegrationCredentials(organizationId, "BREVO");
  return creds?.brevo ?? null;
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

  if (!integration || integration.isActive !== "true") {
    return null;
  }

  const creds = integration.credentials as {
    slack?: { botToken: string; defaultChannel?: string };
  };
  if (!creds?.slack?.botToken) {
    return null;
  }

  return {
    botToken: decrypt(creds.slack.botToken),
    defaultChannel: creds.slack.defaultChannel,
  };
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

export const getOrgBrevoCredentialsDecrypted = async (
  organizationId: string,
) => {
  const integration = await getIntegration(organizationId, "BREVO");

  if (!integration || integration.isActive !== "true") {
    return null;
  }

  const creds = integration.credentials as {
    brevo?: { apiKey: string; mailFrom: string };
  };
  if (!creds?.brevo?.apiKey) {
    return null;
  }

  return creds.brevo;
};
