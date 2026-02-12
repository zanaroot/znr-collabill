"server only";

import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { invitations, userRoles, users } from "@/db/schema";

export const findValidInvitationByToken = async (token: string) => {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(eq(invitations.token, token), gt(invitations.expiresAt, new Date())),
    )
    .limit(1);

  return invitation ?? null;
};

export const upsertInvitation = async (data: {
  email: string;
  token: string;
  role: "OWNER" | "COLLABORATOR";
  expiresAt: Date;
}) => {
  await db
    .insert(invitations)
    .values(data)
    .onConflictDoUpdate({
      target: invitations.email,
      set: {
        token: data.token,
        role: data.role,
        expiresAt: data.expiresAt,
        createdAt: new Date(),
      },
    });
};

export const deleteInvitationById = async (id: string) => {
  await db.delete(invitations).where(eq(invitations.id, id));
};

export const createUserFromInvitation = async (data: {
  email: string;
  name: string;
  passwordHash: string;
  role: "OWNER" | "COLLABORATOR";
  invitationId: string;
}) => {
  return db.transaction(async (tx) => {
    const [existingUser] = await tx
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser) return null;

    const [newUser] = await tx
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
      })
      .returning();

    await tx.insert(userRoles).values({
      userId: newUser.id,
      role: data.role,
    });

    await tx.delete(invitations).where(eq(invitations.id, data.invitationId));

    return newUser;
  });
};
