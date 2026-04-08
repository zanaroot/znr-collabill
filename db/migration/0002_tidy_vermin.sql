ALTER TYPE "public"."task_status" ADD VALUE 'BACKLOG' BEFORE 'TODO';--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'BACKLOG';