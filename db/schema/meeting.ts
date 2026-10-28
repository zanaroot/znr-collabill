import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { meetingInvitationTypeEnum, meetingStatusEnum } from "./enums";
import { organizations } from "./organization";
import { users } from "./user";

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    roomName: text("room_name").notNull(),

    title: text("title").notNull(),

    scheduledAt: timestamp("scheduled_at"),

    expiresAt: timestamp("expires_at"),

    guestAccess: boolean("guest_access").notNull().default(false),

    status: meetingStatusEnum("status").notNull().default("SCHEDULED"),

    startedAt: timestamp("started_at"),

    endedAt: timestamp("ended_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("meetings_organization_idx").on(table.organizationId),
    uniqueIndex("meetings_room_name_idx").on(table.roomName),
    index("meetings_created_by_idx").on(table.createdBy),
  ],
);

export const meetingInvitations = pgTable(
  "meeting_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, {
        onDelete: "cascade",
      }),

    inviteeUserId: uuid("invitee_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),

    email: text("email"),

    type: meetingInvitationTypeEnum("type").notNull().default("MEMBER"),

    tokenHash: text("token_hash"),

    expiresAt: timestamp("expires_at"),

    revokedAt: timestamp("revoked_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("meeting_invitations_meeting_idx").on(table.meetingId),
    uniqueIndex("meeting_invitations_token_hash_idx").on(table.tokenHash),
  ],
);

export const meetingParticipants = pgTable(
  "meeting_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, {
        onDelete: "cascade",
      }),

    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    identity: text("identity"),

    guestName: text("guest_name"),

    joinedAt: timestamp("joined_at").defaultNow().notNull(),

    leftAt: timestamp("left_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("meeting_participants_meeting_idx").on(table.meetingId)],
);

export const livekitWebhookEvents = pgTable("livekit_webhook_events", {
  id: text("id").primaryKey(),

  eventType: text("event_type").notNull(),

  roomName: text("room_name"),

  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [meetings.organizationId],
    references: [organizations.id],
  }),

  creator: one(users, {
    fields: [meetings.createdBy],
    references: [users.id],
    relationName: "createdMeetings",
  }),

  invitations: many(meetingInvitations),

  participants: many(meetingParticipants),
}));

export const meetingInvitationsRelations = relations(
  meetingInvitations,
  ({ one }) => ({
    meeting: one(meetings, {
      fields: [meetingInvitations.meetingId],
      references: [meetings.id],
    }),

    inviteeUser: one(users, {
      fields: [meetingInvitations.inviteeUserId],
      references: [users.id],
    }),
  }),
);

export const meetingParticipantsRelations = relations(
  meetingParticipants,
  ({ one }) => ({
    meeting: one(meetings, {
      fields: [meetingParticipants.meetingId],
      references: [meetings.id],
    }),

    user: one(users, {
      fields: [meetingParticipants.userId],
      references: [users.id],
    }),
  }),
);
