import { z } from "zod";
import { TASK_SIZES, type TaskSize } from "@/lib/task-size";
import { TASK_STATUSES, type TaskStatus } from "@/lib/task-status";

const taskSizeEnum = z.enum(TASK_SIZES);
const taskStatusEnum = z.enum(TASK_STATUSES);

export const taskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  size: taskSizeEnum,
  priority: z.number().int().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  status: taskStatusEnum,
  validatedAt: z.string().nullable().optional(),
  validatedBy: z.string().uuid().nullable().optional(),
  gitRepo: z.string().url().nullable().optional().or(z.literal("")),
  gitBranch: z.string().nullable().optional(),
  gitPullRequest: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type Task = z.infer<typeof taskSchema>;
export type TaskStatusValue = TaskStatus;
export type TaskSizeValue = TaskSize;

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  size: taskSizeEnum,
  priority: z.number().int().optional(),
  dueDate: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  status: taskStatusEnum.optional(),
  gitRepo: z.string().url().optional().nullable().or(z.literal("")),
  gitBranch: z.string().optional().nullable(),
  gitPullRequest: z.string().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  size: taskSizeEnum.optional(),
  priority: z.number().int().optional(),
  dueDate: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  status: taskStatusEnum.optional(),
  gitRepo: z.string().url().optional().nullable().or(z.literal("")),
  gitBranch: z.string().optional().nullable(),
  gitPullRequest: z.string().optional().nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export type UpdateTaskSystemInput = UpdateTaskInput & {
  validatedAt?: Date | null;
  validatedBy?: string | null;
};
