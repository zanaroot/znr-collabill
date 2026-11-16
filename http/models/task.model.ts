import { z } from "zod";

export const TASK_SIZES = ["XS", "S", "M", "L", "XL"] as const;
export type TaskSize = (typeof TASK_SIZES)[number];

export const TASK_STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "APPROVED",
  "VALIDATED",
  "BLOCKED",
  "TRASH",
  "ARCHIVED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

const taskSizeEnum = z.enum(TASK_SIZES);
const taskStatusEnum = z.enum(TASK_STATUSES);

const gitBranchSchema = z
  .string()
  .trim()
  .max(255, "Branch name must be at most 255 characters")
  .regex(/^\S*$/, "Branch name cannot contain spaces")
  .nullable()
  .optional();

const previewLinkSchema = z
  .url("Preview link must be a valid URL")
  .nullable()
  .optional()
  .or(z.literal(""));

export const taskSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  size: taskSizeEnum,
  priority: z.number().int().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  assignedTo: z.uuid().nullable().optional(),
  status: taskStatusEnum,
  validatedAt: z.string().nullable().optional(),
  validatedBy: z.uuid().nullable().optional(),
  reviewerId: z.uuid().nullable().optional(),
  gitRepo: z.url().nullable().optional().or(z.literal("")),
  gitBranch: gitBranchSchema,
  gitPullRequest: z.string().nullable().optional(),
  previewLink: previewLinkSchema,
  createdAt: z.string(),
});

export type Task = z.infer<typeof taskSchema>;

export const createTaskSchema = z.object({
  projectId: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  size: taskSizeEnum,
  priority: z.number().int().optional(),
  dueDate: z.string().optional().nullable(),
  assignedTo: z.uuid().optional().nullable(),
  status: taskStatusEnum.optional(),
  validatedAt: z.string().nullable().optional(),
  validatedBy: z.uuid().nullable().optional(),
  reviewerId: z.uuid().nullable().optional(),
  gitRepo: z.url().optional().nullable().or(z.literal("")),
  gitBranch: gitBranchSchema,
  gitPullRequest: z.string().optional().nullable(),
  previewLink: previewLinkSchema,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  size: taskSizeEnum.optional(),
  priority: z.number().int().optional(),
  dueDate: z.string().optional().nullable(),
  assignedTo: z.uuid().optional().nullable(),
  reviewerId: z.uuid().optional().nullable(),
  status: taskStatusEnum.optional(),
  gitRepo: z.url().optional().nullable().or(z.literal("")),
  gitBranch: gitBranchSchema,
  gitPullRequest: z.string().optional().nullable(),
  previewLink: previewLinkSchema,
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export type UpdateTaskSystemInput = UpdateTaskInput & {
  validatedAt?: Date | null;
  validatedBy?: string | null;
  reviewerId?: string | null;
  archivedAt?: Date | null;
};

export type RawTaskSummary = {
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  projectBaseRate: string | null;
  size: TaskSize;
  taskCount: number;
  rateXs: string | null;
  rateS: string | null;
  rateM: string | null;
  rateL: string | null;
  rateXl: string | null;
};

export type ReviewerTaskSummary = {
  assignedTo: string;
  assigneeName: string;
  projectId: string;
  projectName: string;
  projectReviewerRate: string | null;
  rateXs: string | null;
  rateS: string | null;
  rateM: string | null;
  rateL: string | null;
  rateXl: string | null;
  size: TaskSize;
  taskCount: number;
};
