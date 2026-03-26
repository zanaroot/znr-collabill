import { defineConfig } from "drizzle-kit";
import { serverEnv } from "./packages/env/server";

const databaseUrl = new URL(serverEnv.DATABASE_URL);

export default defineConfig({
  schema: "./db/schema/index.ts",
  dialect: "postgresql",
  out: "./db/migration",
  dbCredentials: {
    host: databaseUrl.hostname,
    port: parseInt(databaseUrl.port || "5432"),
    user: databaseUrl.username,
    password: databaseUrl.password,
    database: databaseUrl.pathname.replace("/", ""),
    ssl: false,
  },
  verbose: true,
});
