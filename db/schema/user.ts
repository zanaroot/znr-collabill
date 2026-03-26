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
import { roleEnum } from "./enums";
import { organizations } from "./organization";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: roleEnum("role").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.role, t.organizationId] }),
    uniqueIndex("user_roles_organization_owner_idx")
      .on(t.organizationId)
      .where(sql`${t.role} = 'OWNER'`),
  ],
);

export const collaboratorRates = pgTable(
  "collaborator_rates",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }).notNull(),
    rateXs: numeric("rate_xs", { precision: 10, scale: 2 }).notNull(),
    rateS: numeric("rate_s", { precision: 10, scale: 2 }).notNull(),
    rateM: numeric("rate_m", { precision: 10, scale: 2 }).notNull(),
    rateL: numeric("rate_l", { precision: 10, scale: 2 }).notNull(),
    rateXl: numeric("rate_xl", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.organizationId] })],
);

export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
  collaboratorRates: many(collaboratorRates),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));

export const collaboratorRatesRelations = relations(
  collaboratorRates,
  ({ one }) => ({
    user: one(users, {
      fields: [collaboratorRates.userId],
      references: [users.id],
    }),
    organization: one(organizations, {
      fields: [collaboratorRates.organizationId],
      references: [organizations.id],
    }),
  }),
);
