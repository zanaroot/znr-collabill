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
  createdBy: z.string().uuid().nullable(),
  createdAt: z.date().nullable().or(z.string()),
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  gitRepo: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  description: z.string().optional(),
  gitRepo: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
