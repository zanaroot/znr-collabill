"server only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projectMembers, projects } from "@/db/schema";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/http/models/project.model";

export const createProject = async (
  input: CreateProjectInput & { createdBy: string },
) => {
  return await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: input.name,
        description: input.description,
        gitRepo: input.gitRepo,
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
