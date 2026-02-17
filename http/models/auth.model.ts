import { z } from "zod";

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const registerSchema = z.object({
  organizationName: z.string().min(2),
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  organizationId: string | null;
  organizationName: string | null;
  organizationRole: "OWNER" | "COLLABORATOR" | null;
};

export type AuthEnv = {
  Variables: {
    user: AuthUser;
  };
};

export type ActionResponse = {
  message?: string;
  error?: string;
  success: boolean;
};
