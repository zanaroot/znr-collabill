"server only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { taskComments, tasks, users } from "@/db/schema";

export interface CreateTaskCommentInput {
  taskId: string;
  userId: string;
  content: string;
}

export const findCommentsByTaskId = async (taskId: string) => {
  return await db
    .select({
      id: taskComments.id,
      content: taskComments.content,
      createdAt: taskComments.createdAt,
      updatedAt: taskComments.updatedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(taskComments)
    .innerJoin(users, eq(taskComments.userId, users.id))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(desc(taskComments.createdAt));
};

export const createTaskComment = async (input: CreateTaskCommentInput) => {
  const [comment] = await db
    .insert(taskComments)
    .values({
      taskId: input.taskId,
      userId: input.userId,
      content: input.content,
    })
    .returning();

  return comment;
};

export const updateTaskComment = async (id: string, content: string) => {
  const [comment] = await db
    .update(taskComments)
    .set({ content, updatedAt: new Date() })
    .where(eq(taskComments.id, id))
    .returning();

  return comment ?? null;
};

export const findCommentById = async (id: string) => {
  const [comment] = await db
    .select()
    .from(taskComments)
    .where(eq(taskComments.id, id))
    .limit(1);

  return comment ?? null;
};

export const findTaskWithProject = async (taskId: string) => {
  const [task] = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  return task ?? null;
};
