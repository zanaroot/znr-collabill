import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema/index.ts",
  dialect: "postgresql",
  out: "./db/schema",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  schemaFilter: "public",
});
