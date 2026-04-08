import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["OWNER", "ADMIN", "COLLABORATOR"]);

export const taskStatusEnum = pgEnum("task_status", [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "VALIDATED",
  "BLOCKED",
  "TRASH",
  "ARCHIVED",
]);

export const taskSizeEnum = pgEnum("task_size", ["XS", "S", "M", "L", "XL"]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "VALIDATED",
  "PAID",
]);

export const presenceStatusEnum = pgEnum("presence_status", [
  "OFFICE",
  "REMOTE",
  "ON_SITE",
  "SICK",
  "VACATION",
]);
