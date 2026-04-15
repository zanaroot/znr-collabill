export const normalizeEmail = (email: string | null | undefined): string => {
  if (!email) return "default";

  return email
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
};
