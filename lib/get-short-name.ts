export const getShortName = (name?: string, max = 2): string => {
  if (!name) return "";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, max)
    .map((word) => word[0].toUpperCase())
    .join("");
};
