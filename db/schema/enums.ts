import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["OWNER", "ADMIN", "COLLABORATOR"]);

export const taskStatusEnum = pgEnum("task_status", [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "APPROVED",
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
  "ON_LEAVE",
]);

export const leaveRequestStatusEnum = pgEnum("leave_request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const unusedLeavePolicyEnum = pgEnum("unused_leave_policy", [
  "CARRY_OVER",
  "PAID_AS_WORKED",
]);

export const leaveTypeEnum = pgEnum("leave_type", [
  "FULL_DAY",
  "HALF_DAY_AM",
  "HALF_DAY_PM",
]);

export const integrationTypeEnum = pgEnum("integration_type", [
  "GITHUB",
  "BREVO",
  "SLACK",
]);
