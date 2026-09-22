CREATE TYPE "public"."job_run_status" AS ENUM('RUNNING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job" text NOT NULL,
	"period" text NOT NULL,
	"status" "job_run_status" DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"error" text,
	"tasks_deleted" integer DEFAULT 0 NOT NULL,
	"files_deleted" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "job_runs_job_period_unique" ON "job_runs" USING btree ("job","period");