"server only";

import { db } from "@/db";
import { sessions, users } from "@/db/schema/schema";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) return null;

  const now = new Date();

  const [result] = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, sessionToken), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!result) return null;

  return result.user;
};
