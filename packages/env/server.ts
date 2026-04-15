import { config } from "dotenv";
import { parseEnv, serverEnvSchema } from "./shared";

config();

const readServerEnv = () =>
  parseEnv(
    serverEnvSchema,
    {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "postgresql://ci:ci@localhost:5432/collabill_ci"
          : undefined),
      MINIO_ROOT_USER:
        process.env.MINIO_ROOT_USER ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "ci-user"
          : undefined),
      MINIO_ROOT_PASSWORD:
        process.env.MINIO_ROOT_PASSWORD ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "ci-password"
          : undefined),
      S3_ENDPOINT:
        process.env.S3_ENDPOINT ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "http://localhost:9000"
          : undefined),
      S3_ACCESS_KEY:
        process.env.S3_ACCESS_KEY ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "ci-access-key"
          : undefined),
      S3_SECRET_KEY:
        process.env.S3_SECRET_KEY ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "ci-secret-key"
          : undefined),
      S3_BUCKET:
        process.env.S3_BUCKET ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "ci-bucket"
          : undefined),
      S3_REGION:
        process.env.S3_REGION ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "us-east-1"
          : undefined),
      ENCRYPTION_KEY:
        process.env.ENCRYPTION_KEY ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "ci-encryption-key-1234567890123456789012"
          : undefined),
      BREVO_API_KEY:
        process.env.BREVO_API_KEY ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "ci-brevo-key"
          : undefined),
      MAIL_FROM:
        process.env.MAIL_FROM ??
        (process.env.SKIP_SERVER_ENV_VALIDATION === "1"
          ? "ci@example.com"
          : undefined),
      NODE_ENV: process.env.NODE_ENV,
    },
    "server",
  );

let cachedServerEnv: ReturnType<typeof readServerEnv> | null = null;

export const getServerEnv = () => {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  cachedServerEnv = readServerEnv();
  return cachedServerEnv;
};

export const serverEnv = new Proxy({} as ReturnType<typeof readServerEnv>, {
  get: (_target, property) => {
    const env = getServerEnv();
    return Reflect.get(env, property);
  },
});

export type ServerEnv = typeof serverEnv;
