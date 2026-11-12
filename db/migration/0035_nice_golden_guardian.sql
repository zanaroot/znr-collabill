CREATE TYPE "public"."platform_role" AS ENUM('PLATFORM_ADMIN');--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'SUSPENDED' BEFORE 'CANCELED';--> statement-breakpoint
CREATE TABLE "subscription_admin_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscription_id" uuid,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "code" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "amount_minor_yearly" integer;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "supported_currencies" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "platform_role" "platform_role";--> statement-breakpoint
ALTER TABLE "subscription_admin_notes" ADD CONSTRAINT "subscription_admin_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_admin_notes" ADD CONSTRAINT "subscription_admin_notes_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_admin_notes" ADD CONSTRAINT "subscription_admin_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_admin_notes_organization_id_idx" ON "subscription_admin_notes" USING btree ("organization_id");--> statement-breakpoint
DROP TYPE "public"."subscription_plan_code";