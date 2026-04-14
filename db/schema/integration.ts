import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { integrationTypeEnum } from "./enums";
import { organizations } from "./organization";

export const organizationIntegrations = pgTable("organization_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  type: integrationTypeEnum("type").notNull(),
  credentialsEncrypted: text("credentials_encrypted").notNull(),
  config: text("config"),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizationIntegrationRelations = relations(
  organizationIntegrations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationIntegrations.organizationId],
      references: [organizations.id],
    }),
  }),
);
