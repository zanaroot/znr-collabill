export const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "VALIDATED",
  "BLOCKED",
  "TRASH",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
