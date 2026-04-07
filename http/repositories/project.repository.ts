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
  Project,
  UpdateProjectInput,
} from "@/http/models/project.model";

const normalizeProject = <T extends { baseRate: string | null }>(
  project: T,
) => ({
  ...project,
  baseRate: Number(project.baseRate ?? "0"),
});

export const createProject = async (
  input: CreateProjectInput & { createdBy: string; organizationId: string },
): Promise<Project> => {
  return await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: input.name,
        description: input.description,
        gitRepo: input.gitRepo,
        baseRate: input.baseRate.toString(),
        organizationId: input.organizationId,
        createdBy: input.createdBy,
      })
      .returning();

    await tx.insert(projectMembers).values({
      projectId: project.id,
      userId: input.createdBy,
    });

    return normalizeProject(project);
  });
};

export const findProjectById = async (id: string): Promise<Project | null> => {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return project ? normalizeProject(project) : null;
};

export const findProjectsByOrganizationId = async (
  organizationId: string,
): Promise<Project[]> => {
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .orderBy(projects.createdAt);

  return result.map(normalizeProject);
};

export const findProjectsForCollaborator = async (
  organizationId: string,
  userId: string,
): Promise<(Project & { organizationId: string })[]> => {
  const result = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      gitRepo: projects.gitRepo,
      baseRate: projects.baseRate,
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

  return result.map(normalizeProject);
};

export const findProjectsByUserId = async (userId: string) => {
  const result = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      gitRepo: projects.gitRepo,
      baseRate: projects.baseRate,
      createdBy: projects.createdBy,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, userId));

  return result.map(normalizeProject);
};

export const updateProject = async (
  id: string,
  input: UpdateProjectInput,
): Promise<Project | null> => {
  const [project] = await db
    .update(projects)
    .set({
      ...input,
      baseRate:
        input.baseRate === undefined ? undefined : input.baseRate.toString(),
    })
    .where(eq(projects.id, id))
    .returning();
  return project ? normalizeProject(project) : null;
};

export const deleteProject = async (id: string) => {
  return await db.transaction(async (tx) => {
    await tx.delete(projectMembers).where(eq(projectMembers.projectId, id));
    const [project] = await tx
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();
    return project ? normalizeProject(project) : null;
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
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!member) return null;

  return member.role;
};

export const findProjectMembers = async (projectId: string) => {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
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

export const removeProjectMember = async (
  projectId: string,
  userId: string,
) => {
  const [removed] = await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .returning();
  return removed ?? null;
};

export const findProjectCreator = async (projectId: string) => {
  const [project] = await db
    .select({ createdBy: projects.createdBy })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return project?.createdBy ?? null;
};
