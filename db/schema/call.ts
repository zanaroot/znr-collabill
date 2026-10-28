import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  callParticipantStatusEnum,
  callStatusEnum,
  callTypeEnum,
} from "./enums";
import { organizations } from "./organization";
import { users } from "./user";

export const calls = pgTable(
  "calls",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    roomName: text("room_name").notNull(),

    type: callTypeEnum("type").notNull(),

    status: callStatusEnum("status").notNull().default("RINGING"),

    initiatedBy: uuid("initiated_by")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    startedAt: timestamp("started_at"),

    endedAt: timestamp("ended_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("calls_organization_idx").on(table.organizationId),
    index("calls_status_idx").on(table.status),
    index("calls_initiated_by_idx").on(table.initiatedBy),
  ],
);

export const callParticipants = pgTable(
  "call_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    callId: uuid("call_id")
      .notNull()
      .references(() => calls.id, {
        onDelete: "cascade",
      }),

    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),

    identity: text("identity"),

    guestName: text("guest_name"),

    status: callParticipantStatusEnum("status").notNull().default("INVITED"),

    joinedAt: timestamp("joined_at"),

    leftAt: timestamp("left_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("call_participants_call_idx").on(table.callId),
    index("call_participants_user_idx").on(table.userId),
  ],
);

export const callsRelations = relations(calls, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [calls.organizationId],
    references: [organizations.id],
  }),

  initiator: one(users, {
    fields: [calls.initiatedBy],
    references: [users.id],
    relationName: "initiatedCalls",
  }),

  participants: many(callParticipants),
}));

export const callParticipantsRelations = relations(
  callParticipants,
  ({ one }) => ({
    call: one(calls, {
      fields: [callParticipants.callId],
      references: [calls.id],
    }),

    user: one(users, {
      fields: [callParticipants.userId],
      references: [users.id],
    }),
  }),
);
