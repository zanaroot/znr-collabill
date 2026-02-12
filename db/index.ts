import { config } from "dotenv";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Load environment variables from .env file
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Please configure your .env file with a valid PostgreSQL connection string."
  );
}

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
