"server only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationMembers, organizations } from "@/db/schema";
import { generateSlug } from "@/lib/organization-utils";

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
