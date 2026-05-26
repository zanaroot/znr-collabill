CREATE TYPE "public"."project_role" AS ENUM('MEMBER', 'PRODUCT_OWNER');--> statement-breakpoint
ALTER TABLE "project_members" ADD COLUMN "role" "project_role" DEFAULT 'MEMBER' NOT NULL;