import { relations } from "drizzle-orm";
import { date, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { attendanceStatusEnum } from "./enums";
import { organizations } from "./organization";
import { users } from "./user";

export const presences = pgTable(
  "presences",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    date: date("date").notNull(),

    status: attendanceStatusEnum("status").default("OFFICE").notNull(),

    checkInAt: timestamp("check_in_at"),

    checkOutAt: timestamp("check_out_at"),

    createdBy: uuid("created_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow(),

    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.userId, t.date, t.organizationId)],
);

export const presencesRelations = relations(presences, ({ one }) => ({
  user: one(users, {
    fields: [presences.userId],
    references: [users.id],
  }),

  organization: one(organizations, {
    fields: [presences.organizationId],
    references: [organizations.id],
  }),

  creator: one(users, {
    fields: [presences.createdBy],
    references: [users.id],
  }),
}));
