import { generateSlug } from "@/lib/text-to-slug";

const BRANCH_PREFIX = "feature/";

export const buildGitBranchNameFromTitle = (title: string): string => {
  const slug = generateSlug(title.trim());
  if (!slug) {
    return "";
  }
  return `${BRANCH_PREFIX}${slug}`;
};

const normalizeBranchName = (name: string): string => name.trim().toLowerCase();

export const ensureUniqueGitBranchName = (
  baseName: string,
  existingNames: readonly string[],
  options?: { taskId?: string },
): string => {
  if (!baseName) {
    return "";
  }

  const taken = new Set(
    existingNames.filter(Boolean).map((name) => normalizeBranchName(name)),
  );

  if (!taken.has(normalizeBranchName(baseName))) {
    return baseName;
  }

  for (let counter = 2; counter < 1000; counter += 1) {
    const candidate = `${baseName}-${counter}`;
    if (!taken.has(normalizeBranchName(candidate))) {
      return candidate;
    }
  }

  if (options?.taskId) {
    const candidate = `${baseName}-${options.taskId.slice(0, 8)}`;
    if (!taken.has(normalizeBranchName(candidate))) {
      return candidate;
    }
  }

  return `${baseName}-${Date.now()}`;
};

const extractBranchNumber = (branch: string) => {
  const match = branch.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
};

const getNextBranchNumber = (branches: string[]) => {
  const numbers = branches
    .map(extractBranchNumber)
    .filter((n): n is number => n !== null);

  const max = numbers.length ? Math.max(...numbers) : 0;

  return max + 1;
};

const formatNumber = (num: number) => String(num).padStart(2, "0");

export const generateUniqueGitBranchFromTitle = (
  title: string,
  existingBranches: string[],
) => {
  if (!title) return "";

  const nextNumber = getNextBranchNumber(existingBranches);
  const formatted = formatNumber(nextNumber);

  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${formatted}-${slug}`;
};
