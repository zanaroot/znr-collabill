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
