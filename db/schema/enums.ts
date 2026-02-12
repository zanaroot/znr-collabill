import { pgEnum } from "drizzle-orm/pg-core";

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
