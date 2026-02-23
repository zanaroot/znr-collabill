"server only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  organizationMembers,
  projectMembers,
  projects,
  users,
} from "@/db/schema";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/http/models/project.model";

export const createProject = async (
  input: CreateProjectInput & { createdBy: string; organizationId: string },
) => {
  return await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: input.name,
        description: input.description,
        gitRepo: input.gitRepo,
        organizationId: input.organizationId,
        createdBy: input.createdBy,
      })
      .returning();

    await tx.insert(projectMembers).values({
      projectId: project.id,
      userId: input.createdBy,
    });

    return project;
  });
};

export const findProjectById = async (id: string) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return project ?? null;
};

export const findProjectsByOrganizationId = async (organizationId: string) => {
  return await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .orderBy(projects.createdAt);
};

export const findProjectsForCollaborator = async (
  organizationId: string,
  userId: string,
) => {
  return await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      gitRepo: projects.gitRepo,
      organizationId: projects.organizationId,
      createdBy: projects.createdBy,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projectMembers.userId, userId),
      ),
    )
    .orderBy(projects.createdAt);
};

export const findProjectsByUserId = async (userId: string) => {
  return await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      gitRepo: projects.gitRepo,
      createdBy: projects.createdBy,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, userId));
};

export const updateProject = async (id: string, input: UpdateProjectInput) => {
  const [project] = await db
    .update(projects)
    .set(input)
    .where(eq(projects.id, id))
    .returning();
  return project ?? null;
};

export const deleteProject = async (id: string) => {
  return await db.transaction(async (tx) => {
    await tx.delete(projectMembers).where(eq(projectMembers.projectId, id));
    const [project] = await tx
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();
    return project ?? null;
  });
};

export const isProjectMember = async (projectId: string, userId: string) => {
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);
  return !!member;
};

export const isOrganizationMember = async (
  organizationId: string,
  userId: string,
) => {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);
  return !!member;
};

export const getOrganizationRole = async (
  userId: string,
  organizationId: string,
) => {
  const [member] = await db
    .select()
    .from(organizationMembers) // ou ta table qui relie users <-> org
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!member) return null;

  return member.role; // role = "owner" ou "collaborator"
};

export const findProjectMembers = async (projectId: string) => {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .innerJoin(projectMembers, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId));
};

export const addProjectMember = async (projectId: string, userId: string) => {
  const [member] = await db
    .insert(projectMembers)
    .values({ projectId, userId })
    .onConflictDoNothing()
    .returning();
  return member ?? null;
};
