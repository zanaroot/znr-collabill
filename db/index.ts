import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "../packages/env/server";
import * as schema from "./schema";

declare global {
  var dbInstance: PostgresJsDatabase<typeof schema> | undefined;
  var postgresClient: ReturnType<typeof postgres> | undefined;
}

if (!global.postgresClient) {
  global.postgresClient = postgres(serverEnv.DATABASE_URL);
}

if (!global.dbInstance) {
  global.dbInstance = drizzle(global.postgresClient, { schema });
}

export const dbClient = global.postgresClient;
export const db = global.dbInstance;
