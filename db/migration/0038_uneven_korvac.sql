ALTER TABLE "subscription_payments" ADD COLUMN "provider_checkout_id" text;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD COLUMN "checkout_url" text;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_provider_checkout_id_unique" UNIQUE("provider_checkout_id");