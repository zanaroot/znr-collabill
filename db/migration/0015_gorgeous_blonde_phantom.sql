ALTER TABLE "presences" ALTER COLUMN "check_in_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "presences" ALTER COLUMN "check_in_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "presences" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "presences" ALTER COLUMN "status" SET DATA TYPE "public"."attendance_status" USING "status"::text::"public"."attendance_status";--> statement-breakpoint
ALTER TABLE "presences" ALTER COLUMN "status" SET DEFAULT 'OFFICE';--> statement-breakpoint
ALTER TABLE "presences" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "presences" ADD CONSTRAINT "presences_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;