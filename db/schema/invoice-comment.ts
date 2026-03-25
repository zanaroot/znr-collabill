import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { invoices } from "./invoice";
import { users } from "./user";

export const invoiceComments = pgTable("invoice_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoiceCommentsRelations = relations(
  invoiceComments,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceComments.invoiceId],
      references: [invoices.id],
    }),
    user: one(users, {
      fields: [invoiceComments.userId],
      references: [users.id],
    }),
  }),
);
