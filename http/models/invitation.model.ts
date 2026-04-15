import { z } from "zod";
import { roleEnum } from "@/http/models/user.model";

export const inviteUserSchema = z.object({
  email: z.email(),
  role: z.enum(["ADMIN", "COLLABORATOR"]).default("COLLABORATOR"),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const createPasswordSchema = z.object({
  token: z.string(),
  name: z.string().min(2),
  password: z.string().min(8),
});

export type CreatePasswordInput = z.infer<typeof createPasswordSchema>;

export const invitationContentSchema = z.object({
  currentUserName: z.string(),
  organizationName: z.string(),
  role: roleEnum,
  invitationToken: z.string(),
});

export type InvitationContentInput = z.infer<typeof invitationContentSchema>;
