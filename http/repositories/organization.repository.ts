"server only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  organizationMembers,
  organizations,
  userRoles,
  users,
} from "@/db/schema";
import { generateSlug } from "@/lib/organization-utils";

export const registerOrganizationAndOwner = async (data: {
  organizationName: string;
  name: string;
  email: string;
  passwordHash: string;
}) => {
  return db.transaction(async (tx) => {
    // 1. Create User
    const [user] = await tx
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
      })
      .returning();

    // 2. Create Organization
    let slug = generateSlug(data.organizationName);
    const existing = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const [org] = await tx
      .insert(organizations)
      .values({ name: data.organizationName, slug })
      .returning();

    // 3. Link User to Organization as OWNER
    await tx.insert(organizationMembers).values({
      organizationId: org.id,
      userId: user.id,
      role: "OWNER",
    });

    // 4. Add User Role
    await tx.insert(userRoles).values({
      userId: user.id,
      role: "OWNER",
      organizationId: org.id,
    });

    return { user, organization: org };
  });
};

export const getOrganizationById = async (organizationId: string) => {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return org ?? null;
};

export const createOrganization = async (name: string, ownerId: string) => {
  return db.transaction(async (tx) => {
    let slug = generateSlug(name);

    // Simple slug uniqueness check (can be improved)
    const existing = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const [newOrg] = await tx
      .insert(organizations)
      .values({ name, slug })
      .returning();

    await tx.insert(organizationMembers).values({
      organizationId: newOrg.id,
      userId: ownerId,
      role: "OWNER",
    });

    return newOrg;
  });
};

export const findOrganizationBySlug = async (slug: string) => {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  return org ?? null;
};

export const getUserOrganizations = async (userId: string) => {
  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, userId));

  return orgs;
};

export const getOrganizationMembers = async (organizationId: string) => {
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId));

  return members;
};

export const isUserInOrganization = async (
  organizationId: string,
  userId: string,
) => {
  const [record] = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);

  return !!record;
};

export const updateOrganizationMemberRole = async (
  organizationId: string,
  userId: string,
  role: "OWNER" | "COLLABORATOR",
) => {
  await db.transaction(async (tx) => {
    await tx
      .update(organizationMembers)
      .set({ role })
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      );

    await tx
      .update(userRoles)
      .set({ role })
      .where(
        and(
          eq(userRoles.organizationId, organizationId),
          eq(userRoles.userId, userId),
        ),
      );
  });
};

export const removeOrganizationMember = async (
  organizationId: string,
  userId: string,
) => {
  await db.transaction(async (tx) => {
    await tx
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      );

    await tx
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.organizationId, organizationId),
          eq(userRoles.userId, userId),
        ),
      );
  });
};
