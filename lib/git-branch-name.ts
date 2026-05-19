export const generateUniqueGitBranchFromTitle = (
  title: string,
  existingBranches: string[],
) => {
  if (!title?.trim()) return "";

  const slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  const numbers = existingBranches
    .map((b) => {
      const match = b.match(/^(\d+)-/);
      return match ? Number(match[1]) : null;
    })
    .filter((n): n is number => n !== null && !Number.isNaN(n));

  const next = (Math.max(0, ...numbers) + 1).toString().padStart(2, "0");

  return `${next}-${slug}`;
};
