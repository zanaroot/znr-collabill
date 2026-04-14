CREATE TYPE "public"."integration_type" AS ENUM('GITHUB', 'BREVO', 'SLACK');--> statement-breakpoint
CREATE TABLE "organization_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" "integration_type" NOT NULL,
	"credentials_encrypted" text NOT NULL,
	"config" text,
	"is_active" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_notifications" (
	"task_id" uuid NOT NULL,
	"type" text NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	CONSTRAINT "task_notifications_task_id_type_pk" PRIMARY KEY("task_id","type")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "slack_bot_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "slack_default_channel" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "slack_channel" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "slack_notifications_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "organization_integrations" ADD CONSTRAINT "organization_integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;