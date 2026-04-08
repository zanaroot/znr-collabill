import { Octokit } from "octokit";
import { serverEnv } from "@/packages/env/server";

const octokit = new Octokit({
  auth: serverEnv.GITHUB_TOKEN || undefined,
});

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

    // Split pathname and filter out empty strings
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
export const fetchBranches = async (repoUrl: string): Promise<string[]> => {
  const details = getRepoDetails(repoUrl);
  if (!details) return [];

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
): Promise<string | null> => {
  const details = getRepoDetails(repoUrl);
  if (!details) return null;

  try {
    const { data } = await octokit.rest.git.getRef({
      owner: details.owner,
      repo: details.repo,
      ref: `heads/${branchName}`,
    });
    return data.object.sha;
  } catch (error) {
    console.error(`Error fetching SHA for branch ${branchName}:`, error);
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
): Promise<boolean> => {
  const details = getRepoDetails(repoUrl);
  if (!details) return false;

  try {
    const sha = await getBranchSha(repoUrl, sourceBranchName);
    if (!sha) return false;

    await octokit.rest.git.createRef({
      owner: details.owner,
      repo: details.repo,
      ref: `refs/heads/${newBranchName}`,
      sha,
    });
    return true;
  } catch (error) {
    console.error(`Error creating branch ${newBranchName}:`, error);
    return false;
  }
};
