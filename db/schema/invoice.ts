import { relations } from "drizzle-orm";
import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { invoiceStatusEnum } from "./enums";
import { users } from "./user";

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  status: invoiceStatusEnum("status").default("DRAFT"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  validatedAt: timestamp("validated_at"),
  paidAt: timestamp("paid_at"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoiceLines = pgTable("invoice_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id),
  type: text("type").notNull(), // PRESENCE | TASK
  referenceId: uuid("reference_id"),
  label: text("label").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
  total: numeric("total", { precision: 12, scale: 2 }),
});

export const invoicesRelations = relations(invoices, ({ many, one }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  lines: many(invoiceLines),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLines.invoiceId],
    references: [invoices.id],
  }),
}));
