import { z } from "zod";

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type SignInInput = z.infer<typeof signInSchema>;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
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
