import type { TaskStatus } from "@/http/models/task.model";

type TaskWorkflowContext = {
  from: TaskStatus;
  to: TaskStatus;
  userRole?: "OWNER" | "ADMIN" | "COLLABORATOR";
};

const COMMON_TRANSITIONS: Record<
  Exclude<TaskStatus, "IN_REVIEW" | "BACKLOG">,
  readonly TaskStatus[]
> = {
  TODO: ["IN_PROGRESS", "BLOCKED", "TRASH"],
  IN_PROGRESS: ["BLOCKED", "TRASH", "TODO", "IN_REVIEW"],
  VALIDATED: [],
  BLOCKED: ["TODO", "TRASH"],
  TRASH: [],
  ARCHIVED: [],
};

export const canTransitionTaskStatus = ({
  from,
  to,
  userRole,
}: TaskWorkflowContext) => {
  if (from === to) return true;

  if (from === "BACKLOG") {
    const canMoveFromBacklog = userRole === "OWNER" || userRole === "ADMIN";
    if (!canMoveFromBacklog) return false;
    return to === "TODO" || to === "TRASH";
  }

  if (from === "IN_REVIEW") {
    if (!userRole || userRole === "COLLABORATOR") return false;
    return to === "TRASH" || to === "IN_PROGRESS" || to === "VALIDATED";
  }

  return COMMON_TRANSITIONS[from].includes(to);
};

export const getAllowedTaskTransitions = ({
  from,
  userRole,
}: Omit<TaskWorkflowContext, "to">): TaskStatus[] => {
  if (from === "BACKLOG") {
    return userRole === "OWNER" || userRole === "ADMIN"
      ? ["TODO", "TRASH"]
      : [];
  }

  if (from === "IN_REVIEW") {
    return userRole && userRole !== "COLLABORATOR"
      ? ["TRASH", "IN_PROGRESS", "VALIDATED"]
      : [];
  }

  return [...COMMON_TRANSITIONS[from]];
};

export const canDeleteTaskByStatus = (status: TaskStatus) => {
  return (
    status === "TODO" ||
    status === "IN_PROGRESS" ||
    status === "BLOCKED" ||
    status === "TRASH"
  );
};
