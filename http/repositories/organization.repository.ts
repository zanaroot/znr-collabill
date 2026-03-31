"server only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  collaboratorRates,
  organizationMembers,
  organizations,
  projectMembers,
  projects,
  tasks,
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
      avatar: users.avatar,
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
  role: "OWNER" | "ADMIN" | "COLLABORATOR",
) => {
  await db.transaction(async (tx) => {
    if (role === "OWNER") {
      // Find current owner
      const currentOwner = await tx
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.role, "OWNER"),
          ),
        )
        .limit(1);

      if (currentOwner.length > 0 && currentOwner[0].userId !== userId) {
        // Demote current owner to ADMIN
        await tx
          .update(organizationMembers)
          .set({ role: "ADMIN" })
          .where(
            and(
              eq(organizationMembers.organizationId, organizationId),
              eq(organizationMembers.userId, currentOwner[0].userId),
            ),
          );

        await tx
          .update(userRoles)
          .set({ role: "ADMIN" })
          .where(
            and(
              eq(userRoles.organizationId, organizationId),
              eq(userRoles.userId, currentOwner[0].userId),
            ),
          );
      }
    } else {
      // If we are demoting someone who is currently the OWNER, we should block it
      // because an organization must have an owner.
      // They should promote someone else to OWNER instead.
      const member = await tx
        .select({ role: organizationMembers.role })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId),
          ),
        )
        .limit(1);

      if (member.length > 0 && member[0].role === "OWNER") {
        throw new Error(
          "Cannot demote the organization owner. Transfer ownership to another member first.",
        );
      }
    }

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
    const member = await tx
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      )
      .limit(1);

    if (member.length > 0 && member[0].role === "OWNER") {
      throw new Error(
        "Cannot remove the organization owner. Transfer ownership to another member first or delete the organization.",
      );
    }

    // 1. Get all projects for this organization
    const orgProjects = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    const projectIds = orgProjects.map((p) => p.id);

    // 2. Remove user from those projects
    if (projectIds.length > 0) {
      await tx
        .delete(projectMembers)
        .where(
          and(
            inArray(projectMembers.projectId, projectIds),
            eq(projectMembers.userId, userId),
          ),
        );
    }

    // 3. Remove collaborator rates for this user in this organization
    await tx
      .delete(collaboratorRates)
      .where(
        and(
          eq(collaboratorRates.organizationId, organizationId),
          eq(collaboratorRates.userId, userId),
        ),
      );

    // 4. Remove organization membership
    await tx
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      );

    // 5. Remove user roles for this organization
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

type OrganizationMemberSummary = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "COLLABORATOR";
};

export type OwnedOrganization = {
  id: string;
  name: string;
  members: OrganizationMemberSummary[];
};

export const getOrganizationsOwnedByUser = async (
  userId: string,
): Promise<OwnedOrganization[]> => {
  const ownedOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
    })
    .from(organizations)
    .innerJoin(
      organizationMembers,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.role, "OWNER"),
      ),
    )
    .orderBy(organizations.createdAt);

  if (ownedOrgs.length === 0) return [];

  const organizationIds = ownedOrgs.map((o) => o.id);

  const members = await db
    .select({
      organizationId: organizationMembers.organizationId,
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: organizationMembers.role,
    })

    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(inArray(organizationMembers.organizationId, organizationIds))
    .orderBy(organizationMembers.joinedAt);

  const byOrgId = new Map<string, OrganizationMemberSummary[]>();
  for (const m of members) {
    const list = byOrgId.get(m.organizationId) ?? [];
    list.push({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
    });
    byOrgId.set(m.organizationId, list);
  }

  return ownedOrgs.map((org) => ({
    ...org,
    members: byOrgId.get(org.id) ?? [],
  }));
};

export const getUserOrganizationsWithMembers = async (
  userId: string,
): Promise<OwnedOrganization[]> => {
  const userOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
    })
    .from(organizations)
    .innerJoin(
      organizationMembers,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .where(eq(organizationMembers.userId, userId))
    .orderBy(organizations.createdAt);

  if (userOrgs.length === 0) return [];

  const organizationIds = userOrgs.map((o) => o.id);

  const members = await db
    .select({
      organizationId: organizationMembers.organizationId,
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: organizationMembers.role,
    })

    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(inArray(organizationMembers.organizationId, organizationIds))
    .orderBy(organizationMembers.joinedAt);

  const byOrgId = new Map<string, OrganizationMemberSummary[]>();
  for (const m of members) {
    const list = byOrgId.get(m.organizationId) ?? [];
    list.push({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
    });
    byOrgId.set(m.organizationId, list);
  }

  return userOrgs.map((org) => ({
    ...org,
    members: byOrgId.get(org.id) ?? [],
  }));
};

export const isOrganizationOwner = async (
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
        eq(organizationMembers.role, "OWNER"),
      ),
    )
    .limit(1);

  return !!record;
};

export const deleteOrganizationById = async (
  organizationId: string,
  userId: string,
) => {
  await db.transaction(async (tx) => {
    const membership = await tx
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      )
      .limit(1);

    if (!membership.length) {
      throw new Error("You are not a member of this organization");
    }

    if (membership[0].role !== "OWNER") {
      throw new Error("Only the owner can delete this organization");
    }

    const orgProjects = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    const projectIds = orgProjects.map((p) => p.id);

    if (projectIds.length > 0) {
      await tx.delete(tasks).where(inArray(tasks.projectId, projectIds));
      await tx
        .delete(projectMembers)
        .where(inArray(projectMembers.projectId, projectIds));
    }

    await tx
      .delete(projects)
      .where(eq(projects.organizationId, organizationId));

    await tx
      .delete(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));

    await tx
      .delete(userRoles)
      .where(eq(userRoles.organizationId, organizationId));

    await tx.delete(organizations).where(eq(organizations.id, organizationId));
  });
};

export const getOrganizationOwner = async (organizationId: string) => {
  const [owner] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.role, "OWNER"),
      ),
    )
    .limit(1);

  return owner ?? null;
};
