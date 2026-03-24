CREATE TYPE "public"."iteration_status" AS ENUM('OPEN', 'CLOSED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "iterations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "iteration_status" DEFAULT 'OPEN',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "iteration_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "base_rate" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "iteration_id" uuid;--> statement-breakpoint
ALTER TABLE "iterations" ADD CONSTRAINT "iterations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_iteration_id_iterations_id_fk" FOREIGN KEY ("iteration_id") REFERENCES "public"."iterations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_iteration_id_iterations_id_fk" FOREIGN KEY ("iteration_id") REFERENCES "public"."iterations"("id") ON DELETE no action ON UPDATE no action;