const getPublicS3Endpoint = () => {
  const endpoint =
    process.env.NEXT_PUBLIC_S3_ENDPOINT || "http://localhost:9000";
  return endpoint.replace(/\/$/, "");
};

export const getAvatarUrl = (
  avatar: string | null | undefined,
  email: string | null | undefined,
) => {
  if (avatar) {
    if (avatar.startsWith("http")) return avatar;

    const endpoint = getPublicS3Endpoint();
    const path = avatar.startsWith("/") ? avatar : `/${avatar}`;
    return `${endpoint}${path}`;
  }
  return getAvatarUrlByEmail(email);
};

export const getAvatarUrlByEmail = (email: string | null | undefined) => {
  const normalizedEmail = email?.trim().toLowerCase() || "default";

  const seed = encodeURIComponent(normalizedEmail);

  return `https://api.dicebear.com/9.x/identicon/svg?seed=${seed}`;
};
