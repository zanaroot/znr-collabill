import { relations } from "drizzle-orm";
import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { taskSizeEnum, taskStatusEnum } from "./enums";
import { projects } from "./project";
import { users } from "./user";

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  size: taskSizeEnum("size").notNull(),
  priority: integer("priority"),
  dueDate: date("due_date"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  status: taskStatusEnum("status").default("TODO"),
  validatedAt: timestamp("validated_at"),
  validatedBy: uuid("validated_by").references(() => users.id),
  gitRepo: text("git_repo"),
  gitBranch: text("git_branch"),
  gitPullRequest: text("git_pull_request"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
