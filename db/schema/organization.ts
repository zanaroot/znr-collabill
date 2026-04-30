import { relations, sql } from "drizzle-orm";
import {
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { roleEnum, unusedLeavePolicyEnum } from "./enums";
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

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
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
