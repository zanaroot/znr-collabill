"server only";

import { cookies } from "next/headers";
import { findValidSessionByToken } from "@/http/repositories/session.repository";

export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) return null;

  const result = await findValidSessionByToken(token);
  return result?.user ?? null;
};
