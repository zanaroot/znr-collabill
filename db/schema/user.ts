import { relations } from "drizzle-orm";
import {
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { roleEnum } from "./enums";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: roleEnum("role").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })],
);

export const collaboratorRates = pgTable("collaborator_rates", {
  userId: uuid("user_id")
    .notNull()
    .primaryKey()
    .references(() => users.id),
  dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }).notNull(),
  rateXs: numeric("rate_xs", { precision: 10, scale: 2 }).notNull(),
  rateS: numeric("rate_s", { precision: 10, scale: 2 }).notNull(),
  rateM: numeric("rate_m", { precision: 10, scale: 2 }).notNull(),
  rateL: numeric("rate_l", { precision: 10, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  roles: many(userRoles),
  collaboratorRate: one(collaboratorRates),
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
  }),
);
