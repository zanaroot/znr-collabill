import { relations } from "drizzle-orm";
import { date, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { presenceStatusEnum } from "./enums";
import { users } from "./user";

export const presences = pgTable(
  "presences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    date: date("date").notNull(),
    checkInAt: timestamp("check_in_at").defaultNow().notNull(),
    checkOutAt: timestamp("check_out_at"),
    status: presenceStatusEnum("status").default("OFFICE").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.userId, t.date)],
);

export const presencesRelations = relations(presences, ({ one }) => ({
  user: one(users, {
    fields: [presences.userId],
    references: [users.id],
  }),
}));
