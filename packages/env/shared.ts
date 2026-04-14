import { z } from "zod";

const formatIssues = (issues: z.core.$ZodIssue[]) =>
  issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_S3_ENDPOINT: z
    .string()
    .trim()
    .min(1)
    .default("http://localhost:9000"),
});

export const serverEnvSchema = publicEnvSchema.extend({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  MINIO_ROOT_USER: z.string().trim().min(1, "MINIO_ROOT_USER is required"),
  MINIO_ROOT_PASSWORD: z
    .string()
    .trim()
    .min(1, "MINIO_ROOT_PASSWORD is required"),
  S3_ENDPOINT: z.string().trim().min(1, "S3_ENDPOINT is required"),
  S3_ACCESS_KEY: z.string().trim().min(1, "S3_ACCESS_KEY is required"),
  S3_SECRET_KEY: z.string().trim().min(1, "S3_SECRET_KEY is required"),
  S3_BUCKET: z.string().trim().min(1, "S3_BUCKET is required"),
  S3_REGION: z.string().trim().min(1, "S3_REGION is required"),
  ENCRYPTION_KEY: z
    .string()
    .trim()
    .min(32, "ENCRYPTION_KEY must be at least 32 characters"),
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
