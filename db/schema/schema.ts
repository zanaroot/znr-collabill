import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  date,
  pgEnum,
  primaryKey,
  unique
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["OWNER", "COLLABORATOR"]);
export const taskStatusEnum = pgEnum("task_status", [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "VALIDATED",
]);
export const taskSizeEnum = pgEnum("task_size", ["XS", "S", "M", "L"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "VALIDATED",
  "PAID",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").references(() => users.id),
  role: roleEnum("role").notNull(),
}, (t) => ([
  primaryKey({ columns: [t.userId, t.role] }),
]));

export const collaboratorRates = pgTable("collaborator_rates", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }).notNull(),
  rateXs: numeric("rate_xs", { precision: 10, scale: 2 }).notNull(),
  rateS: numeric("rate_s", { precision: 10, scale: 2 }).notNull(),
  rateM: numeric("rate_m", { precision: 10, scale: 2 }).notNull(),
  rateL: numeric("rate_l", { precision: 10, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  projectId: uuid("project_id").references(() => projects.id),
  userId: uuid("user_id").references(() => users.id),
}, (t) => ([
  primaryKey({ columns: [t.projectId, t.userId] }),
]));

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const presences = pgTable("presences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  unique().on(t.userId, t.date),
]));

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
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
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  type: text("type").notNull(), // PRESENCE | TASK
  referenceId: uuid("reference_id"),
  label: text("label").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
  total: numeric("total", { precision: 12, scale: 2 }),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
