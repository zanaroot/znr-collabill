"server only";

import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { organizations, sessions, users } from "@/db/schema";

export const createSession = async (data: {
  userId: string;
  organizationId?: string;
  token: string;
  expiresAt: Date;
}) => {
  const [session] = await db.insert(sessions).values(data).returning();
  return session;
};

export const findValidSessionByToken = async (token: string) => {
  const results = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (results.length === 0) return null;

  const result = results[0];

  let organization = null;
  if (result.session.organizationId) {
    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, result.session.organizationId))
      .limit(1);
    organization = orgs[0] ?? null;
  }

  return {
    user: result.user,
    session: result.session,
    organization,
  };
};

export const deleteSessionByToken = async (token: string) => {
  await db.delete(sessions).where(eq(sessions.token, token));
};

export const updateSessionOrganization = async (
  token: string,
  organizationId: string,
) => {
  await db
    .update(sessions)
    .set({ organizationId })
    .where(eq(sessions.token, token));
};
