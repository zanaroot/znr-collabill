export const getAvatarUrlByEmail = (email: string | null | undefined) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const seed = encodeURIComponent(normalizedEmail);

  return `https://api.dicebear.com/9.x/identicon/svg?seed=${seed}`;
};
