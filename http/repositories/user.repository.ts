"server only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, users } from "@/db/schema";

export const findUserByEmail = async (email: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
};

export const findUserById = async (id: string) => {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return user ?? null;
};

export const hasUserRole = async (
  userId: string,
  role: "OWNER" | "COLLABORATOR",
) => {
  const [record] = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
    .limit(1);

  return !!record;
};
