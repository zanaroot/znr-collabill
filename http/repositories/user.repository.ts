"server only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  organizationMembers,
  organizations,
  userRoles,
  users,
} from "@/db/schema";

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
  organizationId: string,
  role: "OWNER" | "ADMIN" | "COLLABORATOR",
) => {
  const [record] = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.organizationId, organizationId),
        eq(userRoles.role, role),
      ),
    )
    .limit(1);

  return !!record;
};

export const getAllUsersWithRoles = async () => {
  const allUsers = await db.query.users.findMany({
    with: {
      roles: true,
    },
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  });

  return allUsers;
};

export const deleteUser = async (id: string) => {
  return db.transaction(async (tx) => {
    await tx.delete(userRoles).where(eq(userRoles.userId, id));
    await tx.delete(users).where(eq(users.id, id));
  });
};

export const updateUserRole = async (
  userId: string,
  organizationId: string,
  role: "OWNER" | "ADMIN" | "COLLABORATOR",
) => {
  await db.transaction(async (tx) => {
    await tx
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.organizationId, organizationId),
        ),
      );
    await tx.insert(userRoles).values({ userId, role, organizationId });
  });
};

export const getOrganizations = async (userId: string) => {
  const membership = await db
    .select()
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  return membership[0]?.organizations ?? null;
};
