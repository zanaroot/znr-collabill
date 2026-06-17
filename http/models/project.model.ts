import { z } from "zod";

export const projectRoleEnum = z.enum(["MEMBER", "PRODUCT_OWNER"]);
export type ProjectMemberRole = z.infer<typeof projectRoleEnum>;

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  gitRepo: z
    .string()
    .url()
    .nullable()
    .or(z.literal(""))
    .or(z.string().length(0)),
  baseRate: z.number().default(0),
  reviewerRate: z.number().default(0),
  organizationId: z.string().uuid(),
  slackChannel: z.string().nullable().optional(),
  slackNotificationsEnabled: z.boolean().nullable().optional(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.date().nullable().or(z.string()),
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  gitRepo: z.string().url("Invalid URL").optional().or(z.literal("")),
  baseRate: z.number().min(0, "Base rate must be positive"),
  reviewerRate: z.number().min(0, "Reviewer rate must be positive").optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  description: z.string().optional(),
  gitRepo: z.string().url("Invalid URL").optional().or(z.literal("")),
  baseRate: z.number().min(0, "Base rate must be positive").optional(),
  reviewerRate: z.number().min(0, "Reviewer rate must be positive").optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

const _isProjectAdminOrOwner = (
  organizationRole: string | null | undefined,
  projectRole: string | null | undefined,
) => {
  if (organizationRole === "OWNER" || organizationRole === "ADMIN") return true;
  return projectRole === "PRODUCT_OWNER";
};
