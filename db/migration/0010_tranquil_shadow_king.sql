ALTER TABLE "invoices" ADD COLUMN "draft_key" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "updated_at" timestamp DEFAULT now();