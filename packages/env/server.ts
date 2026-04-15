import { config } from "dotenv";
import { parseEnv, serverEnvSchema } from "./shared";

config();

export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_S3_ENDPOINT: process.env.NEXT_PUBLIC_S3_ENDPOINT,
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
  },
  "server",
);

export type ServerEnv = typeof serverEnv;
