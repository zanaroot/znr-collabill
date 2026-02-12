import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? "";

declare global {
  var dbInstance: PostgresJsDatabase<typeof schema> | undefined;
  var postgresClient: ReturnType<typeof postgres> | undefined;
}

if (!global.postgresClient) {
  global.postgresClient = postgres(connectionString);
}

if (!global.dbInstance) {
  global.dbInstance = drizzle(global.postgresClient, { schema });
}

export const db = global.dbInstance;
