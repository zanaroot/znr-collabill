const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

const extractMaxNumber = (branches: string[]) =>
  branches.reduce((max, branch) => {
    const match = branch.match(/^(\d+)-/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

export const generateUniqueGitBranchFromTitle = (
  title: string,
  existingBranches: string[],
) => {
  if (!title?.trim()) return "";

  const slug = slugify(title);
  const safeSlug = slug || "untitled";

  const nextNumber = (extractMaxNumber(existingBranches) + 1)
    .toString()
    .padStart(2, "0");

  return `${nextNumber}-${safeSlug}`;
};
