import { relations } from "drizzle-orm";
import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { iterationStatusEnum } from "./enums";
import { invoices } from "./invoice";
import { organizations } from "./organization";
import { tasks } from "./task";

export const iterations = pgTable("iterations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: iterationStatusEnum("status").default("OPEN"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const iterationsRelations = relations(iterations, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [iterations.organizationId],
    references: [organizations.id],
  }),
  tasks: many(tasks),
  invoices: many(invoices),
}));
