export const buildGitBranchNameFromTitle = (title: string): string => {
  if (!title?.trim()) return "";

  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // par défaut premier numéro
  return `01-${slug}`;
};

const extractNumber = (branch: string) => {
  const match = branch.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
};

export const ensureUniqueGitBranchName = (
  baseName: string,
  existingNames: readonly string[],
): string => {
  if (!baseName) return "";

  const taken = new Set(existingNames.map((n) => n.trim()));

  // 1. pas de conflit → on garde le baseName
  if (!taken.has(baseName)) {
    return baseName;
  }

  // 2. conflit → on calcule le prochain numéro global
  const numbers = existingNames
    .map(extractNumber)
    .filter((n): n is number => n !== null);

  const max = numbers.length ? Math.max(...numbers) : 0;

  const next = String(max + 1).padStart(2, "0");

  const slugMatch = baseName.match(/^\d+-(.+)$/);
  const slug = slugMatch ? slugMatch[1] : baseName;

  return `${next}-${slug}`;
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
