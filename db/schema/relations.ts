import { relations } from "drizzle-orm";
import {
  users,
  userRoles,
  collaboratorRates,
  projects,
  projectMembers,
  tasks,
  presences,
  invoices,
  invoiceLines,
  auditLogs,
} from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  roles: many(userRoles),
  collaboratorRate: one(collaboratorRates),

  projectsCreated: many(projects),

  projectMemberships: many(projectMembers),

  tasksAssigned: many(tasks, {
    relationName: "assignedTasks",
  }),

  tasksValidated: many(tasks, {
    relationName: "validatedTasks",
  }),

  presences: many(presences),
  invoices: many(invoices),
  auditLogs: many(auditLogs),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));

export const collaboratorRatesRelations = relations(
  collaboratorRates,
  ({ one }) => ({
    user: one(users, {
      fields: [collaboratorRates.userId],
      references: [users.id],
    }),
  })
);

export const projectsRelations = relations(projects, ({ many, one }) => ({
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),

  members: many(projectMembers),
  tasks: many(tasks),
}));

export const projectMembersRelations = relations(
  projectMembers,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectMembers.projectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [projectMembers.userId],
      references: [users.id],
    }),
  })
);

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),

  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "assignedTasks",
  }),

  validator: one(users, {
    fields: [tasks.validatedBy],
    references: [users.id],
    relationName: "validatedTasks",
  }),
}));

export const presencesRelations = relations(presences, ({ one }) => ({
  user: one(users, {
    fields: [presences.userId],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ many, one }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),

  lines: many(invoiceLines),
}));

export const invoiceLinesRelations = relations(
  invoiceLines,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLines.invoiceId],
      references: [invoices.id],
    }),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));
