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
import { leaveRequestStatusEnum, leaveTypeEnum } from "./enums";
import { organizations } from "./organization";
import { users } from "./user";

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  type: leaveTypeEnum("type").default("FULL_DAY").notNull(),
  status: leaveRequestStatusEnum("status").default("PENDING").notNull(),
  reason: text("reason"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaveBalances = pgTable("leave_balances", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  balance: numeric("balance", { precision: 5, scale: 2 })
    .default("0.00")
    .notNull(),
  used: numeric("used", { precision: 5, scale: 2 }).default("0.00").notNull(),
  remaining: numeric("remaining", { precision: 5, scale: 2 })
    .default("0.00")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, {
    fields: [leaveRequests.userId],
    references: [users.id],
    relationName: "leave_request_user",
  }),
  organization: one(organizations, {
    fields: [leaveRequests.organizationId],
    references: [organizations.id],
  }),
  approver: one(users, {
    fields: [leaveRequests.approvedBy],
    references: [users.id],
    relationName: "leave_request_approver",
  }),
}));

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
  user: one(users, {
    fields: [leaveBalances.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [leaveBalances.organizationId],
    references: [organizations.id],
  }),
}));
