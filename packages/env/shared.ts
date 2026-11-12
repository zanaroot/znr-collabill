import { z } from "zod";

const formatIssues = (issues: z.core.$ZodIssue[]) =>
  issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

const isProduction = process.env.NODE_ENV === "production";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_S3_ENDPOINT: z.string().trim().min(1).default("/api/storage"),
  NEXT_PUBLIC_APP_URL: isProduction
    ? z.string().trim().url("NEXT_PUBLIC_APP_URL must be a valid URL").min(1)
    : z.string().trim().min(1).default("http://localhost:3000"),
});

const baseServerEnvSchema = publicEnvSchema.extend({
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
  S3_PROJECT_FILES_BUCKET: z
    .string()
    .trim()
    .min(1, "S3_PROJECT_FILES_BUCKET must not be empty")
    .default("collabill-project-files"),
  S3_REGION: z.string().trim().min(1, "S3_REGION is required"),
  ENCRYPTION_KEY: z
    .string()
    .trim()
    .min(32, "ENCRYPTION_KEY must be at least 32 characters"),
  BREVO_API_KEY: z.string().trim().min(1, "BREVO_API_KEY is required"),
  MAIL_FROM: z.email().trim().min(1, "MAIL_FROM is required"),
  LIVEKIT_URL: z.string().trim().optional(),
  LIVEKIT_API_KEY: z.string().trim().optional(),
  LIVEKIT_API_SECRET: z.string().trim().optional(),
  PAYMENT_PROVIDER: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.enum(["mock", "nowpayments"]).default("mock"),
  ),
  PAYMENT_WEBHOOK_SECRET: z.string().trim().optional(),
  NOWPAYMENTS_API_KEY: z.string().trim().optional(),
  NOWPAYMENTS_BASE_URL: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z
      .string()
      .trim()
      .url("NOWPAYMENTS_BASE_URL must be a valid URL")
      .default("https://api.nowpayments.io/v1"),
  ),
  NOWPAYMENTS_IPN_SECRET: z.string().trim().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .optional(),
});

export const serverEnvSchema = baseServerEnvSchema
  .refine((env) => env.S3_BUCKET !== env.S3_PROJECT_FILES_BUCKET, {
    path: ["S3_PROJECT_FILES_BUCKET"],
    message: "Project files must use a bucket separate from S3_BUCKET",
  })
  .superRefine((env, ctx) => {
    if (env.PAYMENT_PROVIDER !== "nowpayments") {
      return;
    }

    if (!env.NOWPAYMENTS_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["NOWPAYMENTS_API_KEY"],
        message:
          "NOWPAYMENTS_API_KEY is required when PAYMENT_PROVIDER is nowpayments",
      });
    }
    if (!env.NOWPAYMENTS_IPN_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["NOWPAYMENTS_IPN_SECRET"],
        message:
          "NOWPAYMENTS_IPN_SECRET is required when PAYMENT_PROVIDER is nowpayments",
      });
    }
    if (env.NODE_ENV === "production") {
      const appUrl = env.NEXT_PUBLIC_APP_URL;
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(
        appUrl,
      );
      if (!appUrl.startsWith("https://") && !isLocalhost) {
        ctx.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_APP_URL"],
          message:
            "NEXT_PUBLIC_APP_URL must use https in production so the NOWPayments IPN callback URL is HTTPS",
        });
      }
    }
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
