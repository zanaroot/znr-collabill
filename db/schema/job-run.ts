import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { jobRunStatusEnum } from "./enums";

export const jobRuns = pgTable(
  "job_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    job: text("job").notNull(),
    period: text("period").notNull(),
    status: jobRunStatusEnum("status").notNull().default("RUNNING"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
    error: text("error"),
    tasksDeleted: integer("tasks_deleted").notNull().default(0),
    filesDeleted: integer("files_deleted").notNull().default(0),
  },
  (t) => [uniqueIndex("job_runs_job_period_unique").on(t.job, t.period)],
);
