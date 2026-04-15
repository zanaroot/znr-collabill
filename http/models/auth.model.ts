import { z } from "zod";
import type { Role } from "@/http/models/user.model";

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
  avatar: string | null;
  organizationId: string | null;
  organizationName: string | null;
  organizationRole: Role | null;
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

export const createAccountSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
