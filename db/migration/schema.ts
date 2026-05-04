import { pgTable, unique, uuid, text, timestamp, index, foreignKey, date, numeric, integer, boolean, primaryKey, uniqueIndex, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const integrationType = pgEnum("integration_type", ['GITHUB', 'BREVO', 'SLACK'])
export const invoiceStatus = pgEnum("invoice_status", ['DRAFT', 'VALIDATED', 'PAID'])
export const presenceStatus = pgEnum("presence_status", ['OFFICE', 'REMOTE', 'ON_SITE', 'SICK', 'VACATION'])
export const role = pgEnum("role", ['OWNER', 'ADMIN', 'COLLABORATOR'])
export const taskSize = pgEnum("task_size", ['XS', 'S', 'M', 'L', 'XL'])
export const taskStatus = pgEnum("task_status", ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'VALIDATED', 'BLOCKED', 'TRASH', 'ARCHIVED'])


export const organizations = pgTable("organizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	slackBotTokenEncrypted: text("slack_bot_token_encrypted"),
	slackDefaultChannel: text("slack_default_channel"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	unique("organizations_slug_unique").on(table.slug),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	actorId: uuid("actor_id"),
	action: text().notNull(),
	entity: text().notNull(),
	entityId: uuid("entity_id"),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("audit_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("audit_logs_organization_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "audit_logs_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.actorId],
			foreignColumns: [users.id],
			name: "audit_logs_actor_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	name: text().notNull(),
	avatar: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const invitations = pgTable("invitations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	email: text().notNull(),
	token: text().notNull(),
	role: role().default('COLLABORATOR').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "invitations_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	unique("invitations_email_organization_id_unique").on(table.organizationId, table.email),
	unique("invitations_token_unique").on(table.token),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("password_reset_tokens_token_unique").on(table.token),
]);

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id"),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	lastAccessedAt: timestamp("last_accessed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "sessions_organization_id_organizations_id_fk"
		}).onDelete("set null"),
	unique("sessions_token_unique").on(table.token),
]);

export const organizationIntegrations = pgTable("organization_integrations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	type: integrationType().notNull(),
	credentialsEncrypted: text("credentials_encrypted").notNull(),
	config: text(),
	isActive: text("is_active").default('true').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_integrations_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const invoices = pgTable("invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	status: invoiceStatus().default('DRAFT'),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }),
	validatedAt: timestamp("validated_at", { mode: 'string' }),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	note: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "invoices_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "invoices_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const invoiceLines = pgTable("invoice_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	type: text().notNull(),
	referenceId: uuid("reference_id"),
	label: text().notNull(),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }),
	total: numeric({ precision: 12, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_lines_invoice_id_invoices_id_fk"
		}),
]);

export const invoiceComments = pgTable("invoice_comments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	userId: uuid("user_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_comments_invoice_id_invoices_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "invoice_comments_user_id_users_id_fk"
		}),
]);

export const presences = pgTable("presences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	date: date().notNull(),
	checkInAt: timestamp("check_in_at", { mode: 'string' }).defaultNow().notNull(),
	checkOutAt: timestamp("check_out_at", { mode: 'string' }),
	status: presenceStatus().default('OFFICE').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "presences_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "presences_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	unique("presences_user_id_date_organization_id_unique").on(table.userId, table.organizationId, table.date),
]);

export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	gitRepo: text("git_repo"),
	baseRate: numeric("base_rate", { precision: 10, scale:  2 }).default('1'),
	organizationId: uuid("organization_id").notNull(),
	slackChannel: text("slack_channel"),
	slackNotificationsEnabled: boolean("slack_notifications_enabled").default(true),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "projects_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "projects_created_by_users_id_fk"
		}),
]);

export const tasks = pgTable("tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	title: text().notNull(),
	description: text(),
	size: taskSize().notNull(),
	priority: integer(),
	dueDate: date("due_date"),
	assignedTo: uuid("assigned_to"),
	status: taskStatus().default('BACKLOG'),
	validatedAt: timestamp("validated_at", { mode: 'string' }),
	validatedBy: uuid("validated_by"),
	archivedAt: timestamp("archived_at", { mode: 'string' }),
	gitRepo: text("git_repo"),
	gitBranch: text("git_branch"),
	gitPullRequest: text("git_pull_request"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "tasks_project_id_projects_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "tasks_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.validatedBy],
			foreignColumns: [users.id],
			name: "tasks_validated_by_users_id_fk"
		}),
]);

export const taskComments = pgTable("task_comments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	userId: uuid("user_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_comments_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "task_comments_user_id_users_id_fk"
		}),
]);

export const projectMembers = pgTable("project_members", {
	projectId: uuid("project_id").notNull(),
	userId: uuid("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_members_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_members_user_id_users_id_fk"
		}),
	primaryKey({ columns: [table.projectId, table.userId], name: "project_members_project_id_user_id_pk"}),
]);

export const userRoles = pgTable("user_roles", {
	userId: uuid("user_id").notNull(),
	role: role().notNull(),
	organizationId: uuid("organization_id").notNull(),
}, (table) => [
	uniqueIndex("user_roles_organization_owner_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")).where(sql`(role = 'OWNER'::role)`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "user_roles_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.role, table.organizationId], name: "user_roles_user_id_role_organization_id_pk"}),
]);

export const organizationMembers = pgTable("organization_members", {
	organizationId: uuid("organization_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: role().default('COLLABORATOR').notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("organization_owner_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")).where(sql`(role = 'OWNER'::role)`),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_members_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "organization_members_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.organizationId, table.userId], name: "organization_members_organization_id_user_id_pk"}),
]);

export const collaboratorRates = pgTable("collaborator_rates", {
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	dailyRate: numeric("daily_rate", { precision: 10, scale:  2 }).notNull(),
	rateXs: numeric("rate_xs", { precision: 10, scale:  2 }).notNull(),
	rateS: numeric("rate_s", { precision: 10, scale:  2 }).notNull(),
	rateM: numeric("rate_m", { precision: 10, scale:  2 }).notNull(),
	rateL: numeric("rate_l", { precision: 10, scale:  2 }).notNull(),
	rateXl: numeric("rate_xl", { precision: 10, scale:  2 }).default('0').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "collaborator_rates_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "collaborator_rates_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.organizationId], name: "collaborator_rates_user_id_organization_id_pk"}),
]);
