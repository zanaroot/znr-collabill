import { z } from "zod";

export const iterationStatusEnum = z.enum(["OPEN", "CLOSED", "ARCHIVED"]);

export const iterationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  status: iterationStatusEnum,
  createdAt: z.string(),
});

export type Iteration = z.infer<typeof iterationSchema>;

export const createIterationSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  status: iterationStatusEnum.optional().default("OPEN"),
});

export type CreateIterationInput = z.infer<typeof createIterationSchema>;

export const updateIterationSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: iterationStatusEnum.optional(),
});

export type UpdateIterationInput = z.infer<typeof updateIterationSchema>;
