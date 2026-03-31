"server only";

import { endOfDay } from "date-fns";
import { and, asc, count, desc, eq, gte, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  collaboratorRates,
  organizationMembers,
  projects,
  tasks,
  users,
} from "@/db/schema";
import type {
  CreateTaskInput,
  UpdateTaskSystemInput,
} from "@/http/models/task.model";

const taskSelectFields = {
  id: tasks.id,
  projectId: tasks.projectId,
  title: tasks.title,
  description: tasks.description,
  size: tasks.size,
  priority: tasks.priority,
  dueDate: tasks.dueDate,
  assignedTo: tasks.assignedTo,
  status: sql`${tasks.status}::text`.as("status"),
  validatedAt: tasks.validatedAt,
  validatedBy: tasks.validatedBy,
  gitRepo: tasks.gitRepo,
  gitBranch: tasks.gitBranch,
  gitPullRequest: tasks.gitPullRequest,
  createdAt: tasks.createdAt,
};

export const findTasksByProjectId = async (projectId: string) => {
  return await db
    .select(taskSelectFields)
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.priority), desc(tasks.createdAt));
};

export const findTasksByProjectIdAndPeriod = async (
  projectId: string,
  startDate: Date,
  _endDate: Date,
) => {
  const endDate = endOfDay(_endDate);
  const isCurrentPeriod = endDate >= new Date();

  const whereClauses = [eq(tasks.projectId, projectId)];

  if (isCurrentPeriod) {
    // Current period: show all non-validated tasks OR tasks validated in this period
    const validatedInPeriod = and(
      eq(tasks.status, "VALIDATED"),
      gte(tasks.validatedAt, startDate),
      lte(tasks.validatedAt, endDate),
    );
    if (validatedInPeriod) {
      const condition = or(ne(tasks.status, "VALIDATED"), validatedInPeriod);
      if (condition) {
        whereClauses.push(condition);
      }
    } else {
      whereClauses.push(ne(tasks.status, "VALIDATED"));
    }
  } else {
    // Past period: ONLY show tasks validated in that period
    const validatedInPeriod = and(
      eq(tasks.status, "VALIDATED"),
      gte(tasks.validatedAt, startDate),
      lte(tasks.validatedAt, endDate),
    );
    if (validatedInPeriod) {
      whereClauses.push(validatedInPeriod);
    }
  }

  return await db
    .select(taskSelectFields)
    .from(tasks)
    .where(and(...whereClauses))
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

export const getValidatedTaskSummaryByOrganization = async (
  userId: string,
  organizationId: string,
  targetUserId?: string,
  startDate?: Date,
  endDate?: Date,
) => {
  const whereClauses = [
    eq(organizationMembers.userId, targetUserId ?? userId),
    eq(organizationMembers.organizationId, organizationId),
    eq(projects.organizationId, organizationId),
    eq(tasks.status, "VALIDATED"),
  ];

  if (startDate && endDate) {
    whereClauses.push(
      gte(tasks.validatedAt, startDate),
      lte(tasks.validatedAt, endOfDay(endDate)),
    );
  }

  return await db
    .select({
      userId: users.id,
      userName: users.name,
      projectId: projects.id,
      projectName: projects.name,
      projectBaseRate: projects.baseRate,
      size: tasks.size,
      taskCount: count(tasks.id),
      rateXs: collaboratorRates.rateXs,
      rateS: collaboratorRates.rateS,
      rateM: collaboratorRates.rateM,
      rateL: collaboratorRates.rateL,
      rateXl: collaboratorRates.rateXl,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(users, eq(tasks.assignedTo, users.id))
    .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .leftJoin(
      collaboratorRates,
      and(
        eq(users.id, collaboratorRates.userId),
        eq(collaboratorRates.organizationId, organizationId),
      ),
    )
    .where(and(...whereClauses))
    .groupBy(
      users.id,
      projects.id,
      projects.name,
      projects.baseRate,
      tasks.size,
      collaboratorRates.rateXs,
      collaboratorRates.rateS,
      collaboratorRates.rateM,
      collaboratorRates.rateL,
      collaboratorRates.rateXl,
    );
};
