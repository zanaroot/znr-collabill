CREATE TYPE "public"."subscription_payment_status_new" AS ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'REFUNDED');--> statement-breakpoint
ALTER TABLE "public"."subscription_payments" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
DROP INDEX "subscription_payments_pending_unique_idx";--> statement-breakpoint
ALTER TABLE "public"."subscription_payments" ALTER COLUMN "status" SET DATA TYPE "public"."subscription_payment_status_new" USING "status"::text::"public"."subscription_payment_status_new";--> statement-breakpoint
DROP TYPE "public"."subscription_payment_status";--> statement-breakpoint
ALTER TYPE "public"."subscription_payment_status_new" RENAME TO "subscription_payment_status";--> statement-breakpoint
ALTER TABLE "public"."subscription_payments" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD COLUMN "interval" "subscription_interval";--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payments_pending_unique_idx" ON "subscription_payments" USING btree ("organization_id") WHERE "subscription_payments"."status" in ('PENDING', 'PROCESSING');
