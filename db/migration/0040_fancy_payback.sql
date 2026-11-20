ALTER TYPE "public"."subscription_payment_status" ADD VALUE 'PROCESSING' BEFORE 'SUCCEEDED';--> statement-breakpoint
ALTER TYPE "public"."subscription_payment_status" ADD VALUE 'EXPIRED' BEFORE 'REFUNDED';--> statement-breakpoint
DROP INDEX "subscription_payments_pending_unique_idx";--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD COLUMN "interval" "subscription_interval";--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payments_pending_unique_idx" ON "subscription_payments" USING btree ("organization_id") WHERE "subscription_payments"."status" in ('PENDING', 'PROCESSING');