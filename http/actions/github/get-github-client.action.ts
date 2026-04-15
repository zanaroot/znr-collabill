"use server";

import { Octokit } from "octokit";
import { getOrgGithubCredentialsDecrypted } from "@/http/actions/integrations.action";

export const getGithubClient = async (organizationId?: string) => {
  let token: string | undefined;

  if (organizationId) {
    const orgCreds = await getOrgGithubCredentialsDecrypted(organizationId);
    if (orgCreds?.token) {
      token = orgCreds.token;
    }
  }

  if (!token) {
    console.warn(
      "[GitHub] No token configured. Write operations will fail on private repos and some API calls may be rate limited.",
    );
  } else {
    console.log(`[GitHub] Using token (length: ${token.length})`);
  }

  return new Octokit({ auth: token });
};
