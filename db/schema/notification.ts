import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { notificationEntityTypeEnum, notificationTypeEnum } from "./enums";
import { organizations } from "./organization";
import { users } from "./user";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, {
      onDelete: "cascade",
    }),
  actorId: uuid("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),

  type: notificationTypeEnum("type").notNull(),

  title: text("title").notNull(),

  message: text("message").notNull(),

  entityType: notificationEntityTypeEnum("entity_type").notNull(),

  entityId: uuid("entity_id"),

  isRead: boolean("is_read").notNull().default(false),

  readAt: timestamp("read_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "receivedNotifications",
  }),

  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),

  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: "createdNotifications",
  }),
}));
