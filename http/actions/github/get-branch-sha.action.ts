import { getGithubClient } from "@/http/actions/github/get-github-client.action";
import { getRepoDetails } from "@/lib/github";

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
