export const TASK_STATUSES = [
    "TODO",
    "IN_PROGRESS",
    "IN_REVIEW",
    "VALIDATED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];