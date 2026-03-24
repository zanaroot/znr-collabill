import { parseEnv, publicEnvSchema } from "./shared";

export const publicEnv = parseEnv(
  publicEnvSchema,
  {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  "public",
);

export type PublicEnv = typeof publicEnv;
