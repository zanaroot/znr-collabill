"server only";

import { Octokit } from "octokit";
import { getOrgGithubCredentialsDecrypted } from "@/lib/integrations";

export const getGithubClient = async (organizationId?: string) => {
  let token: string | undefined;

  if (organizationId) {
    const orgCreds = await getOrgGithubCredentialsDecrypted(organizationId);
    if (orgCreds?.token) {
      token = orgCreds.token;
    }
  }

  if (!token) {
    token = process.env.GITHUB_TOKEN;
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

/**
 * Extracts owner and repo from a GitHub URL.
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - http://github.com/owner/repo
 */
export const getRepoDetails = (repoUrl: string) => {
  try {
    const url = new URL(repoUrl);
    if (url.hostname !== "github.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");

    return { owner, repo };
  } catch {
    return null;
  }
};

/**
 * Fetches all branches for a given GitHub repository URL.
 * Returns an array of branch names.
 */
export const fetchBranches = async (
  repoUrl: string,
  organizationId?: string,
): Promise<string[]> => {
  const details = getRepoDetails(repoUrl);
  if (!details) return [];

  const octokit = await getGithubClient(organizationId);

  try {
    const branches = await octokit.paginate(octokit.rest.repos.listBranches, {
      owner: details.owner,
      repo: details.repo,
      per_page: 100,
    });

    return branches.map((branch) => branch.name);
  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
};

/**
 * Gets the SHA of a specific branch.
 */
export const getBranchSha = async (
  repoUrl: string,
  branchName: string,
  organizationId?: string,
): Promise<string | null> => {
  const details = getRepoDetails(repoUrl);
  if (!details) return null;

  const octokit = await getGithubClient(organizationId);

  try {
    const { data } = await octokit.rest.git.getRef({
      owner: details.owner,
      repo: details.repo,
      ref: `heads/${branchName}`,
    });
    return data.object.sha;
  } catch (error) {
    console.error(
      `[GitHub] Error fetching SHA for branch ${branchName}:`,
      error,
    );
    return null;
  }
};

/**
 * Creates a new branch from a source branch.
 */
export const createBranch = async (
  repoUrl: string,
  newBranchName: string,
  sourceBranchName: string,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> => {
  const details = getRepoDetails(repoUrl);
  if (!details) {
    return { success: false, error: "Invalid GitHub repository URL" };
  }

  const octokit = await getGithubClient(organizationId);

  try {
    console.log(
      `[GitHub] Creating branch "${newBranchName}" from "${sourceBranchName}" in ${details.owner}/${details.repo}`,
    );

    const sha = await getBranchSha(repoUrl, sourceBranchName, organizationId);
    if (!sha) {
      return {
        success: false,
        error: `Could not find SHA for source branch "${sourceBranchName}"`,
      };
    }

    await octokit.rest.git.createRef({
      owner: details.owner,
      repo: details.repo,
      ref: `refs/heads/${newBranchName}`,
      sha,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error(`[GitHub] Error creating branch ${newBranchName}:`, error);
    return {
      success: false,
      error: (error as Error).message || "Unknown GitHub error",
    };
  }
};
