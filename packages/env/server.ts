import { config } from "dotenv";
import { parseEnv, serverEnvSchema } from "./shared";

config();

export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    MAIL_FROM: process.env.MAIL_FROM,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    SEED_COLLABORATOR_EMAIL: process.env.SEED_COLLABORATOR_EMAIL,
    SEED_OWNER_EMAIL: process.env.SEED_OWNER_EMAIL,
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
    SEED_PASSWORD: process.env.SEED_PASSWORD,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
  },
  "server",
);

export type ServerEnv = typeof serverEnv;
