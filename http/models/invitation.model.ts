import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z.email(),
  role: z.enum(["OWNER", "COLLABORATOR"]).default("COLLABORATOR"),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const createPasswordSchema = z.object({
  token: z.string(),
  name: z.string().min(2),
  password: z.string().min(8),
});

export type CreatePasswordInput = z.infer<typeof createPasswordSchema>;
