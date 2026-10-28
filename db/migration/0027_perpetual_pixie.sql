CREATE TYPE "public"."call_participant_status" AS ENUM('INVITED', 'JOINED', 'LEFT', 'REJECTED', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('RINGING', 'ACTIVE', 'ENDED', 'MISSED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."call_type" AS ENUM('AUDIO', 'VIDEO');--> statement-breakpoint
CREATE TYPE "public"."meeting_invitation_type" AS ENUM('MEMBER', 'GUEST');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('SCHEDULED', 'ACTIVE', 'ENDED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
ALTER TYPE "public"."notification_entity_type" ADD VALUE 'CALL';--> statement-breakpoint
ALTER TYPE "public"."notification_entity_type" ADD VALUE 'MEETING';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'CALL_INVITE';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'MEETING_INVITE';--> statement-breakpoint
CREATE TABLE "call_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"user_id" uuid,
	"identity" text,
	"guest_name" text,
	"status" "call_participant_status" DEFAULT 'INVITED' NOT NULL,
	"joined_at" timestamp,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"room_name" text NOT NULL,
	"type" "call_type" NOT NULL,
	"status" "call_status" DEFAULT 'RINGING' NOT NULL,
	"initiated_by" uuid NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "livekit_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"room_name" text,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"invitee_user_id" uuid,
	"email" text,
	"type" "meeting_invitation_type" DEFAULT 'MEMBER' NOT NULL,
	"token_hash" text,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"user_id" uuid,
	"identity" text,
	"guest_name" text,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"room_name" text NOT NULL,
	"title" text NOT NULL,
	"scheduled_at" timestamp,
	"expires_at" timestamp,
	"guest_access" boolean DEFAULT false NOT NULL,
	"status" "meeting_status" DEFAULT 'SCHEDULED' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_invitations" ADD CONSTRAINT "meeting_invitations_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_invitations" ADD CONSTRAINT "meeting_invitations_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_participants_call_idx" ON "call_participants" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "call_participants_user_idx" ON "call_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calls_organization_idx" ON "calls" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "calls_status_idx" ON "calls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "calls_initiated_by_idx" ON "calls" USING btree ("initiated_by");--> statement-breakpoint
CREATE INDEX "meeting_invitations_meeting_idx" ON "meeting_invitations" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_invitations_token_hash_idx" ON "meeting_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "meeting_participants_meeting_idx" ON "meeting_participants" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meetings_organization_idx" ON "meetings" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meetings_room_name_idx" ON "meetings" USING btree ("room_name");--> statement-breakpoint
CREATE INDEX "meetings_created_by_idx" ON "meetings" USING btree ("created_by");