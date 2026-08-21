import { relations, sql } from "drizzle-orm";
import {
  boolean,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { notifications } from "@/db/schema/notification";
import { attendanceStatusEnum, roleEnum, unusedLeavePolicyEnum } from "./enums";
import { users } from "./user";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  slackBotTokenEncrypted: text("slack_bot_token_encrypted"),
  slackDefaultChannel: text("slack_default_channel"),
  unusedLeavePolicy: unusedLeavePolicyEnum("unused_leave_policy")
    .default("CARRY_OVER")
    .notNull(),
  adminLeaveQuota: numeric("admin_leave_quota", { precision: 4, scale: 1 })
    .default("2.5")
    .notNull(),
  collaboratorLeaveQuota: numeric("collaborator_leave_quota", {
    precision: 4,
    scale: 1,
  })
    .default("2.0")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  presenceSelectionEnabled: boolean("presence_selection_enabled")
    .default(false)
    .notNull(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("COLLABORATOR"),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.userId] }),
    uniqueIndex("organization_owner_idx")
      .on(t.organizationId)
      .where(sql`${t.role} = 'OWNER'`),
  ],
);

export const organizationFinanceEmails = pgTable(
  "organization_finance_emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    email: text("email").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("organization_finance_email_unique").on(
      t.organizationId,
      t.email,
    ),
  ],
);

export const organizationAttendanceSettings = pgTable(
  "organization_attendance_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    type: attendanceStatusEnum("type").notNull(),

    enabled: boolean("enabled").default(true).notNull(),

    rate: numeric("rate", {
      precision: 5,
      scale: 2,
    })
      .default("100")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("organization_attendance_type_unique").on(
      t.organizationId,
      t.type,
    ),
  ],
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  financeEmails: many(organizationFinanceEmails),
  attendanceSettings: many(organizationAttendanceSettings),
  notifications: many(notifications),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  }),
);

export const organizationFinanceEmailsRelations = relations(
  organizationFinanceEmails,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationFinanceEmails.organizationId],
      references: [organizations.id],
    }),
  }),
);

export const organizationAttendanceSettingsRelations = relations(
  organizationAttendanceSettings,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationAttendanceSettings.organizationId],
      references: [organizations.id],
    }),
  }),
);
