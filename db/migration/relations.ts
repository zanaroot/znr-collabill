import { relations } from "drizzle-orm/relations";
import { users, passwordResetTokens, sessions, organizations, invoices, invoiceComments, presences, invoiceLines, projects, tasks, auditLogs, invitations, projectMembers, userRoles, organizationMembers, collaboratorRates } from "./schema";

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	passwordResetTokens: many(passwordResetTokens),
	sessions: many(sessions),
	invoices: many(invoices),
	invoiceComments: many(invoiceComments),
	presences: many(presences),
	tasks_assignedTo: many(tasks, {
		relationName: "tasks_assignedTo_users_id"
	}),
	tasks_validatedBy: many(tasks, {
		relationName: "tasks_validatedBy_users_id"
	}),
	projects: many(projects),
	auditLogs: many(auditLogs),
	projectMembers: many(projectMembers),
	userRoles: many(userRoles),
	organizationMembers: many(organizationMembers),
	collaboratorRates: many(collaboratorRates),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [sessions.organizationId],
		references: [organizations.id]
	}),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	sessions: many(sessions),
	invoices: many(invoices),
	presences: many(presences),
	projects: many(projects),
	invitations: many(invitations),
	userRoles: many(userRoles),
	organizationMembers: many(organizationMembers),
	collaboratorRates: many(collaboratorRates),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
	user: one(users, {
		fields: [invoices.userId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [invoices.organizationId],
		references: [organizations.id]
	}),
	invoiceComments: many(invoiceComments),
	invoiceLines: many(invoiceLines),
}));

export const invoiceCommentsRelations = relations(invoiceComments, ({one}) => ({
	invoice: one(invoices, {
		fields: [invoiceComments.invoiceId],
		references: [invoices.id]
	}),
	user: one(users, {
		fields: [invoiceComments.userId],
		references: [users.id]
	}),
}));

export const presencesRelations = relations(presences, ({one}) => ({
	user: one(users, {
		fields: [presences.userId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [presences.organizationId],
		references: [organizations.id]
	}),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({one}) => ({
	invoice: one(invoices, {
		fields: [invoiceLines.invoiceId],
		references: [invoices.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	}),
	user_assignedTo: one(users, {
		fields: [tasks.assignedTo],
		references: [users.id],
		relationName: "tasks_assignedTo_users_id"
	}),
	user_validatedBy: one(users, {
		fields: [tasks.validatedBy],
		references: [users.id],
		relationName: "tasks_validatedBy_users_id"
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	tasks: many(tasks),
	organization: one(organizations, {
		fields: [projects.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [projects.createdBy],
		references: [users.id]
	}),
	projectMembers: many(projectMembers),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.actorId],
		references: [users.id]
	}),
}));

export const invitationsRelations = relations(invitations, ({one}) => ({
	organization: one(organizations, {
		fields: [invitations.organizationId],
		references: [organizations.id]
	}),
}));

export const projectMembersRelations = relations(projectMembers, ({one}) => ({
	project: one(projects, {
		fields: [projectMembers.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectMembers.userId],
		references: [users.id]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [userRoles.organizationId],
		references: [organizations.id]
	}),
}));

export const organizationMembersRelations = relations(organizationMembers, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationMembers.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [organizationMembers.userId],
		references: [users.id]
	}),
}));

export const collaboratorRatesRelations = relations(collaboratorRates, ({one}) => ({
	user: one(users, {
		fields: [collaboratorRates.userId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [collaboratorRates.organizationId],
		references: [organizations.id]
	}),
}));