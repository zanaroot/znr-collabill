ALTER TABLE "organization_attendance_settings" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "presences" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "presences" ALTER COLUMN "status" SET DEFAULT 'OFFICE'::text;--> statement-breakpoint
DROP TYPE "public"."attendance_status";--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('OFFICE', 'REMOTE', 'HALF_DAY', 'SICK', 'VACATION', 'ON_LEAVE');--> statement-breakpoint
ALTER TABLE "organization_attendance_settings" ALTER COLUMN "type" SET DATA TYPE "public"."attendance_status" USING "type"::"public"."attendance_status";--> statement-breakpoint
ALTER TABLE "presences" ALTER COLUMN "status" SET DEFAULT 'OFFICE'::"public"."attendance_status";--> statement-breakpoint
ALTER TABLE "presences" ALTER COLUMN "status" SET DATA TYPE "public"."attendance_status" USING "status"::"public"."attendance_status";--> statement-breakpoint
DROP TYPE "public"."presence_status";--> statement-breakpoint
CREATE TYPE "public"."presence_status" AS ENUM('OFFICE', 'REMOTE', 'HALF_DAY', 'SICK', 'VACATION', 'ON_LEAVE');