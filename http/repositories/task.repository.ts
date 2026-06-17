"server only";

import { endOfDay } from "date-fns";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
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
  reviewerId: tasks.reviewerId,
  archivedAt: tasks.archivedAt,
  gitRepo: tasks.gitRepo,
  gitBranch: tasks.gitBranch,
  gitPullRequest: tasks.gitPullRequest,
  previewLink: tasks.previewLink,
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

  const whereClauses = [
    eq(tasks.projectId, projectId),
    ne(tasks.status, "ARCHIVED"),
  ];

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

export const findTaskWithAssigneeById = async (id: string) => {
  const [task] = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      title: tasks.title,
      status: sql`${tasks.status}::text`.as("status"),
      assignedTo: tasks.assignedTo,
      assigneeName: users.name,
      reviewerId: tasks.reviewerId,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(eq(tasks.id, id))
    .limit(1);

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
      previewLink: input.previewLink ?? null,
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

export const getValidatedTaskSummaryByReviewer = async (
  userId: string,
  organizationId: string,
  startDate?: Date,
  endDate?: Date,
) => {
  const whereClauses = [
    eq(tasks.reviewerId, userId),
    ne(tasks.assignedTo, tasks.reviewerId),
    eq(projects.organizationId, organizationId),
    or(
      and(eq(tasks.status, "VALIDATED"), ne(tasks.status, "ARCHIVED")),
      and(eq(tasks.status, "ARCHIVED"), isNotNull(tasks.invoiceId)),
    ),
  ];

  if (startDate && endDate) {
    whereClauses.push(
      or(
        and(
          isNotNull(tasks.validatedAt),
          gte(tasks.validatedAt, startDate),
          lte(tasks.validatedAt, endOfDay(endDate)),
        ),
        and(
          isNull(tasks.validatedAt),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endOfDay(endDate)),
        ),
      ),
    );
  }

  return await db
    .select({
      userId: users.id,
      userName: users.name,
      projectId: projects.id,
      projectName: projects.name,
      projectReviewerRate: projects.reviewerRate,
      size: tasks.size,
      taskCount: count(tasks.id),
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(users, eq(tasks.reviewerId, users.id))
    .where(and(...whereClauses))
    .groupBy(
      users.id,
      projects.id,
      projects.name,
      projects.reviewerRate,
      tasks.size,
    );
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
    or(
      and(eq(tasks.status, "VALIDATED"), ne(tasks.status, "ARCHIVED")),
      and(eq(tasks.status, "ARCHIVED"), isNotNull(tasks.invoiceId)),
    ),
  ];

  if (startDate && endDate) {
    whereClauses.push(
      or(
        and(
          isNotNull(tasks.validatedAt),
          gte(tasks.validatedAt, startDate),
          lte(tasks.validatedAt, endOfDay(endDate)),
        ),
        and(
          isNull(tasks.validatedAt),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endOfDay(endDate)),
        ),
      ),
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

export const archiveTasksByIds = async (
  taskIds: string[],
  invoiceId: string,
) => {
  if (taskIds.length === 0) return [];
  return await db
    .update(tasks)
    .set({ status: "ARCHIVED", archivedAt: new Date(), invoiceId })
    .where(and(inArray(tasks.id, taskIds), eq(tasks.status, "VALIDATED")))
    .returning();
};

export const unarchiveTasksByInvoice = async (invoiceId: string) => {
  return await db
    .update(tasks)
    .set({ status: "VALIDATED", archivedAt: null, invoiceId: null })
    .where(and(eq(tasks.invoiceId, invoiceId), eq(tasks.status, "ARCHIVED")))
    .returning();
};

export const getValidatedTaskIdsByPeriodAndUser = async (
  userId: string,
  startDate: Date,
  endDate: Date,
) => {
  const result = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedTo, userId),
        eq(tasks.status, "VALIDATED"),
        or(
          and(
            isNotNull(tasks.validatedAt),
            gte(tasks.validatedAt, startDate),
            lte(tasks.validatedAt, endOfDay(endDate)),
          ),
          and(
            isNull(tasks.validatedAt),
            gte(tasks.createdAt, startDate),
            lte(tasks.createdAt, endOfDay(endDate)),
          ),
        ),
      ),
    );
  return result.map((r) => r.id);
};

export const getValidatedTaskIdsByPeriodAndReviewer = async (
  userId: string,
  startDate: Date,
  endDate: Date,
) => {
  const result = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.reviewerId, userId),
        ne(tasks.assignedTo, tasks.reviewerId),
        eq(tasks.status, "VALIDATED"),
        or(
          and(
            isNotNull(tasks.validatedAt),
            gte(tasks.validatedAt, startDate),
            lte(tasks.validatedAt, endOfDay(endDate)),
          ),
          and(
            isNull(tasks.validatedAt),
            gte(tasks.createdAt, startDate),
            lte(tasks.createdAt, endOfDay(endDate)),
          ),
        ),
      ),
    );
  return result.map((r) => r.id);
};

const _getArchivedTaskIdsByPeriodAndUser = async (
  userId: string,
  startDate: Date,
  endDate: Date,
) => {
  const result = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedTo, userId),
        eq(tasks.status, "ARCHIVED"),
        gte(tasks.archivedAt, startDate),
        lte(tasks.archivedAt, endOfDay(endDate)),
      ),
    );
  return result.map((r) => r.id);
};

const _restoreArchivedTasksByIds = async (taskIds: string[]) => {
  if (taskIds.length === 0) return [];
  return await db
    .update(tasks)
    .set({ status: "VALIDATED", archivedAt: null })
    .where(and(inArray(tasks.id, taskIds), eq(tasks.status, "ARCHIVED")))
    .returning();
};
