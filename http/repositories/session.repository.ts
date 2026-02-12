"server only";

import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const createSession = async (data: {
  userId: string;
  token: string;
  expiresAt: Date;
}) => {
  const [session] = await db.insert(sessions).values(data).returning();
  return session;
};

export const findValidSessionByToken = async (token: string) => {
  const [result] = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return result ?? null;
};

export const deleteSessionByToken = async (token: string) => {
  await db.delete(sessions).where(eq(sessions.token, token));
};
