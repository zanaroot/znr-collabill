"use server";

import { getGithubClient } from "@/http/actions/github/get-github-client.action";
import { getRepoDetails } from "@/lib/github";

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
