import { z } from "zod";

const formatIssues = (issues: z.core.$ZodIssue[]) =>
  issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_S3_ENDPOINT: z
    .string()
    .trim()
    .min(1)
    .default("http://localhost:9000"),
});

export const serverEnvSchema = publicEnvSchema.extend({
  BREVO_API_KEY: z.string().trim().min(1, "BREVO_API_KEY is required"),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  MAIL_FROM: z.string().trim().min(1, "MAIL_FROM is required"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SEED_COLLABORATOR_EMAIL: z.email().trim().default("collab@collabill.local"),
  SEED_OWNER_EMAIL: z.email().trim().default("owner@collabill.local"),
  SEED_ADMIN_EMAIL: z.email().trim().default("admin@collabill.local"),
  SEED_PASSWORD: z.string().trim().min(8).default("password123"),
  S3_ENDPOINT: z.string().trim().min(1, "S3_ENDPOINT is required"),
  S3_ACCESS_KEY: z.string().trim().min(1, "S3_ACCESS_KEY is required"),
  S3_SECRET_KEY: z.string().trim().min(1, "S3_SECRET_KEY is required"),
  S3_BUCKET: z.string().trim().min(1, "S3_BUCKET is required"),
  S3_REGION: z.string().trim().min(1, "S3_REGION is required"),
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
