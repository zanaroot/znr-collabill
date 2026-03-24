import { z } from "zod";

const formatIssues = (issues: z.ZodIssue[]) =>
  issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().trim().url().default("http://localhost:3000"),
});

export const serverEnvSchema = publicEnvSchema.extend({
  BREVO_API_KEY: z.string().trim().min(1, "BREVO_API_KEY is required"),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  MAIL_FROM: z.string().trim().min(1, "MAIL_FROM is required"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SEED_COLLABORATOR_EMAIL: z
    .string()
    .trim()
    .email()
    .default("collab@collabill.local"),
  SEED_OWNER_EMAIL: z.string().trim().email().default("owner@collabill.local"),
  SEED_PASSWORD: z.string().trim().min(8).default("password123"),
});

export const parseEnv = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  source: Record<string, string | undefined>,
  label: string,
): z.infer<TSchema> => {
  const parsed = schema.safeParse(source);

  if (parsed.success) {
    return parsed.data;
  }

  throw new Error(
    `Invalid ${label} environment variables:\n${formatIssues(parsed.error.issues)}`,
  );
};
