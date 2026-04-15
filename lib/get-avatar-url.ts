import { getPublicS3Endpoint } from "@/app/_utils/get-pulic-s3-endpoint";
import { normalizeEmail } from "@/lib/normalize-email";

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
  const normalizedEmail = normalizeEmail(email);

  return `https://api.dicebear.com/9.x/identicon/svg?seed=${normalizedEmail}`;
};
