import { z } from "zod";

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
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.date().nullable().or(z.string()),
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  gitRepo: z.string().url("Invalid URL").optional().or(z.literal("")),
  baseRate: z.number().min(0, "Base rate must be positive"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  description: z.string().optional(),
  gitRepo: z.string().url("Invalid URL").optional().or(z.literal("")),
  baseRate: z.number().min(0, "Base rate must be positive").optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
