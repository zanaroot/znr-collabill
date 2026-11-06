import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  providerReferenceEntityTypeEnum,
  subscriptionIntervalEnum,
  subscriptionPaymentStatusEnum,
  subscriptionStatusEnum,
} from "./enums";
import { organizations } from "./organization";
import { users } from "./user";

export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  amountMinor: integer("amount_minor").notNull().default(0),
  amountMinorYearly: integer("amount_minor_yearly"),
  currency: text("currency").notNull().default("USD"),
  supportedCurrencies: text("supported_currencies")
    .array()
    .notNull()
    .default([]),
  interval: subscriptionIntervalEnum("interval"),
  maxMembers: integer("max_members"),
  maxProjects: integer("max_projects"),
  features: text("features").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    status: subscriptionStatusEnum("status").notNull().default("TRIALING"),
    interval: subscriptionIntervalEnum("interval"),
    amountMinor: integer("amount_minor").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    provider: text("provider").notNull().default("internal"),
    providerSubscriptionId: text("provider_subscription_id").unique(),
    trialEndsAt: timestamp("trial_ends_at"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("subscription_live_unique_idx")
      .on(t.organizationId)
      .where(sql`${t.status} in ('TRIALING', 'ACTIVE', 'PAST_DUE')`),
    index("subscriptions_organization_id_idx").on(t.organizationId),
    index("subscriptions_plan_id_idx").on(t.planId),
  ],
);

export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    provider: text("provider").notNull().default("internal"),
    providerEventId: text("provider_event_id").unique(),
    payload: text("payload").notNull().default("{}"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("subscription_events_organization_id_idx").on(t.organizationId),
    index("subscription_events_subscription_id_idx").on(t.subscriptionId),
  ],
);

export const subscriptionPayments = pgTable(
  "subscription_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),
    status: subscriptionPaymentStatusEnum("status")
      .notNull()
      .default("PENDING"),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("USD"),
    provider: text("provider").notNull().default("internal"),
    providerPaymentId: text("provider_payment_id").unique(),
    paidAt: timestamp("paid_at"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("subscription_payments_organization_id_idx").on(t.organizationId),
    index("subscription_payments_subscription_id_idx").on(t.subscriptionId),
  ],
);

export const subscriptionAdminNotes = pgTable(
  "subscription_admin_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("subscription_admin_notes_organization_id_idx").on(t.organizationId),
  ],
);

export const paymentProviderReferences = pgTable(
  "payment_provider_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: providerReferenceEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    provider: text("provider").notNull().default("stripe"),
    providerObjectId: text("provider_object_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("provider_reference_entity_unique").on(
      t.entityType,
      t.entityId,
      t.provider,
    ),
    uniqueIndex("provider_reference_object_unique").on(
      t.provider,
      t.providerObjectId,
    ),
  ],
);

export const subscriptionPlansRelations = relations(
  subscriptionPlans,
  ({ many }) => ({
    subscriptions: many(subscriptions),
  }),
);

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [subscriptions.organizationId],
      references: [organizations.id],
    }),
    plan: one(subscriptionPlans, {
      fields: [subscriptions.planId],
      references: [subscriptionPlans.id],
    }),
    events: many(subscriptionEvents),
    payments: many(subscriptionPayments),
    adminNotes: many(subscriptionAdminNotes),
  }),
);

export const subscriptionAdminNotesRelations = relations(
  subscriptionAdminNotes,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [subscriptionAdminNotes.organizationId],
      references: [organizations.id],
    }),
    subscription: one(subscriptions, {
      fields: [subscriptionAdminNotes.subscriptionId],
      references: [subscriptions.id],
    }),
    author: one(users, {
      fields: [subscriptionAdminNotes.authorId],
      references: [users.id],
    }),
  }),
);

export const subscriptionEventsRelations = relations(
  subscriptionEvents,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [subscriptionEvents.organizationId],
      references: [organizations.id],
    }),
    subscription: one(subscriptions, {
      fields: [subscriptionEvents.subscriptionId],
      references: [subscriptions.id],
    }),
  }),
);

export const subscriptionPaymentsRelations = relations(
  subscriptionPayments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [subscriptionPayments.organizationId],
      references: [organizations.id],
    }),
    subscription: one(subscriptions, {
      fields: [subscriptionPayments.subscriptionId],
      references: [subscriptions.id],
    }),
  }),
);
