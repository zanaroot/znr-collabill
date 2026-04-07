import { z } from "zod";

export const periodSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export type Period = z.infer<typeof periodSchema>;
