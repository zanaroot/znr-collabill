import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["OWNER", "ADMIN", "COLLABORATOR"]);

export const projectRoleEnum = pgEnum("project_role", [
  "MEMBER",
  "PRODUCT_OWNER",
]);

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

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "OFFICE",
  "REMOTE",
  "ON_SITE",
  "SICK",
  "VACATION",
  "ON_LEAVE",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "TASK_ASSIGNED",
  "TASK_REVIEWER_ASSIGNED",
  "TASK_UPDATED",
  "TASK_COMMENTED",

  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "PROJECT_MEMBER_ADDED",
  "PROJECT_MEMBER_REMOVED",

  "RATE_CREATED",
  "RATE_UPDATED",

  "INVOICE_CREATED",
  "INVOICE_UPDATED",
  "INVOICE_VALIDATED",
  "INVOICE_PAID",

  "LEAVE_REQUESTED",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",

  "PRESENCE_UPDATED",

  "MEMBER_ADDED",
  "MEMBER_REMOVED",
]);

export const notificationEntityTypeEnum = pgEnum("notification_entity_type", [
  "TASK",
  "PROJECT",
  "RATE",
  "INVOICE",
  "LEAVE",
  "PRESENCE",
  "MEMBER",
  "ORGANIZATION",
]);
