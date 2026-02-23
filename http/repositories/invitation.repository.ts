"server only";

import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import {
  invitations,
  organizationMembers,
  userRoles,
  users,
} from "@/db/schema";

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
  role: "ADMIN" | "COLLABORATOR";
  organizationId: string;
  expiresAt: Date;
}) => {
  await db
    .insert(invitations)
    .values(data)
    .onConflictDoUpdate({
      target: [invitations.email, invitations.organizationId],
      set: {
        token: data.token,
        role: data.role,
        expiresAt: data.expiresAt,
        createdAt: new Date(),
      },
    });
};

export const findPendingInvitation = async (
  organizationId: string,
  email: string,
) => {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        eq(invitations.email, email),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return invitation ?? null;
};

export const deleteInvitationById = async (id: string) => {
  await db.delete(invitations).where(eq(invitations.id, id));
};

export const getAllInvitations = async (organizationId?: string) => {
  const query = db.select().from(invitations).orderBy(invitations.createdAt);

  if (organizationId) {
    return query.where(eq(invitations.organizationId, organizationId));
  }

  return query;
};

export const createUserFromInvitation = async (data: {
  email: string;
  name: string;
  passwordHash: string;
  role: "ADMIN" | "COLLABORATOR" | "OWNER";
  invitationId: string;
  organizationId: string;
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

    // Add to organization
    await tx.insert(organizationMembers).values({
      userId: newUser.id,
      organizationId: data.organizationId,
      role: data.role,
    });

    // Also add to global roles for backward compatibility if needed,
    // but preferably organizationMembers is enough.
    // However, existing code checks userRoles. So we keep it.
    await tx.insert(userRoles).values({
      userId: newUser.id,
      role: data.role,
      organizationId: data.organizationId,
    });

    await tx.delete(invitations).where(eq(invitations.id, data.invitationId));

    return newUser;
  });
};

export const acceptInvitation = async (data: {
  userId: string;
  organizationId: string;
  role: "ADMIN" | "COLLABORATOR" | "OWNER";
  invitationId: string;
}) => {
  return db.transaction(async (tx) => {
    // Add to organization
    await tx.insert(organizationMembers).values({
      userId: data.userId,
      organizationId: data.organizationId,
      role: data.role,
    });

    // Also add to global roles for backward compatibility
    await tx.insert(userRoles).values({
      userId: data.userId,
      role: data.role,
      organizationId: data.organizationId,
    });

    await tx.delete(invitations).where(eq(invitations.id, data.invitationId));
  });
};
