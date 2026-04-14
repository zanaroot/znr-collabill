import { parseEnv, publicEnvSchema } from "./shared";

export const publicEnv = parseEnv(
  publicEnvSchema,
  {
    NEXT_PUBLIC_S3_ENDPOINT: process.env.NEXT_PUBLIC_S3_ENDPOINT,
  },
  "public",
);

export type PublicEnv = typeof publicEnv;
