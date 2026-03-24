import { defineConfig } from "drizzle-kit";
import { serverEnv } from "./packages/env/server";

export default defineConfig({
  schema: "./db/schema/index.ts",
  dialect: "postgresql",
  out: "./db/migration",
  dbCredentials: {
    url: serverEnv.DATABASE_URL,
  },
  schemaFilter: "public",
});
