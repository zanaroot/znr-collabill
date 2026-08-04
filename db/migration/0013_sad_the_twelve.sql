CREATE TYPE "public"."attendance_status" AS ENUM('OFFICE', 'REMOTE', 'ON_SITE', 'SICK', 'VACATION', 'ON_LEAVE');--> statement-breakpoint
CREATE TABLE "organization_attendance_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" "attendance_status" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"rate" numeric(5, 2) DEFAULT '100' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_finance_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "organization_attendance_settings" ADD CONSTRAINT "organization_attendance_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_finance_emails" ADD CONSTRAINT "organization_finance_emails_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_attendance_type_unique" ON "organization_attendance_settings" USING btree ("organization_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_finance_email_unique" ON "organization_finance_emails" USING btree ("organization_id","email");