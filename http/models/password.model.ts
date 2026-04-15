import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const resetPasswordConfirmSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordConfirmInput = z.infer<
  typeof resetPasswordConfirmSchema
>;
