"server only";

import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import type {
  CreateTaskInput,
  UpdateTaskSystemInput,
} from "@/http/models/task.model";

export const findTasksByProjectId = async (projectId: string) => {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.priority), desc(tasks.createdAt));
};

export const findTaskById = async (id: string) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return task ?? null;
};

export const createTask = async (input: CreateTaskInput) => {
  const [task] = await db
    .insert(tasks)
    .values({
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      size: input.size,
      priority: input.priority,
      dueDate: input.dueDate,
      assignedTo: input.assignedTo,
      status: input.status,
      gitRepo: input.gitRepo,
      gitBranch: input.gitBranch,
      gitPullRequest: input.gitPullRequest,
    })
    .returning();

  return task;
};

export const updateTask = async (id: string, input: UpdateTaskSystemInput) => {
  const [task] = await db
    .update(tasks)
    .set(input)
    .where(eq(tasks.id, id))
    .returning();

  return task ?? null;
};

export const deleteTask = async (id: string) => {
  const [task] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  return task ?? null;
};

export const countTasksByProjectId = async (projectId: string) => {
  return await db.$count(tasks, eq(tasks.projectId, projectId));
};
