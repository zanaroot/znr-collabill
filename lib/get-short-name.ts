export const getShortName = (name?: unknown, max = 2): string => {
  if (name == null) return "";

  const str = String(name);

  return str
    .trim()
    .split(/\s+/)
    .slice(0, max)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
};
