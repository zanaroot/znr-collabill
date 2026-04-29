CREATE TYPE "public"."leave_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('FULL_DAY', 'HALF_DAY_AM', 'HALF_DAY_PM');--> statement-breakpoint
CREATE TYPE "public"."unused_leave_policy" AS ENUM('CARRY_OVER', 'PAID_AS_WORKED');--> statement-breakpoint
ALTER TYPE "public"."presence_status" ADD VALUE 'ON_LEAVE';--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"balance" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"used" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"remaining" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"type" "leave_type" DEFAULT 'FULL_DAY' NOT NULL,
	"status" "leave_request_status" DEFAULT 'PENDING' NOT NULL,
	"reason" text,
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "unused_leave_policy" "unused_leave_policy" DEFAULT 'CARRY_OVER' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "admin_leave_quota" numeric(4, 1) DEFAULT '2.5' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "collaborator_leave_quota" numeric(4, 1) DEFAULT '2.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;