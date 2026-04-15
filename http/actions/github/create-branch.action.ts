"use server";

import { getBranchSha } from "@/http/actions/github/get-branch-sha.action";
import { getGithubClient } from "@/http/actions/github/get-github-client.action";
import { getRepoDetails } from "@/lib/github";

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
