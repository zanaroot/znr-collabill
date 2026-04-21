import { config } from "dotenv";
import type { z } from "zod";
import { parseEnv, serverEnvSchema } from "./shared";

config();

type ParsedServerEnv = z.infer<typeof serverEnvSchema>;

const readServerEnv = (): ParsedServerEnv => {
  const source = {
    DATABASE_URL: process.env.DATABASE_URL,
    MINIO_ROOT_USER: process.env.MINIO_ROOT_USER,
    MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    MAIL_FROM: process.env.MAIL_FROM,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    SENTRY_DSN: process.env.SENTRY_DSN,
  };

  if (process.env.SKIP_SERVER_ENV_VALIDATION === "1") {
    return source as unknown as ParsedServerEnv;
  }

  return parseEnv(serverEnvSchema, source, "server");
};

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
