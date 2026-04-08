import type { TaskSize, TaskStatus } from "@/http/models/task.model";

export type PriorityLabel =
  | "Urgent & Important"
  | "Urgent"
  | "Important"
  | "Low priority";

export const PRIORITY_LABELS: PriorityLabel[] = [
  "Urgent & Important",
  "Urgent",
  "Important",
  "Low priority",
];

export const PRIORITY_VALUE: Record<PriorityLabel, number> = {
  "Urgent & Important": 1,
  Urgent: 2,
  Important: 3,
  "Low priority": 4,
};

export const PRIORITY_LABEL_FROM_VALUE = (
  value?: number | null,
): PriorityLabel => {
  if (value === 1) return "Urgent & Important";
  if (value === 2) return "Urgent";
  if (value === 3) return "Important";
  return "Low priority";
};

export function getPriorityLabel(value?: number | null): PriorityLabel {
  return PRIORITY_LABEL_FROM_VALUE(value);
}

export function getPriorityValue(label: PriorityLabel): number {
  return PRIORITY_VALUE[label];
}

export function priorityTagColor(value?: number | null): string {
  const label = getPriorityLabel(value);

  if (label === "Urgent & Important") return "red";
  if (label === "Urgent") return "volcano";
  if (label === "Important") return "gold";
  return "default";
}

export function getPriorityTagColor(label: PriorityLabel): string {
  if (label === "Urgent & Important") return "red";
  if (label === "Urgent") return "volcano";
  if (label === "Important") return "gold";
  return "default";
}

export function getPriorityOptions() {
  return PRIORITY_LABELS.map((label) => ({
    label,
    value: label,
  }));
}

export type BoardView = "ACTIVE" | "INACTIVE" | "ALL";

export const BOARD_VIEW_STATUSES: Record<BoardView, TaskStatus[]> = {
  ACTIVE: ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "VALIDATED"],
  INACTIVE: ["TODO", "BLOCKED", "TRASH"],
  ALL: [
    "BACKLOG",
    "TODO",
    "IN_PROGRESS",
    "IN_REVIEW",
    "VALIDATED",
    "BLOCKED",
    "TRASH",
  ],
};

export interface TaskFormValues {
  title: string;
  description: string;
  size: TaskSize;
  priorityLabel: PriorityLabel;
  dueDate: string;
  status: TaskStatus;
  assigneeId: string | null;
  gitBranch: string;
}

export function defaultFormValues(status: TaskStatus): TaskFormValues {
  return {
    title: "",
    description: "",
    size: "M",
    priorityLabel: "Low priority",
    dueDate: "",
    status,
    assigneeId: null,
    gitBranch: "",
  };
}
