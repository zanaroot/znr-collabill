ALTER TABLE "projects" ADD COLUMN "reviewer_rate" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reviewer_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;