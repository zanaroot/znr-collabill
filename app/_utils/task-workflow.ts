import type { TaskStatus } from "@/http/models/task.model";
import type { Role } from "@/http/models/user.model";

type TaskWorkflowContext = {
  from: TaskStatus;
  to: TaskStatus;
  userRole?: Role;
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

  if (from === "BACKLOG" || to === "BACKLOG") {
    const canAccessBacklog = userRole === "OWNER" || userRole === "ADMIN";
    if (!canAccessBacklog) return false;

    if (from === "BACKLOG") {
      return to === "TODO" || to === "TRASH";
    }

    if (to === "BACKLOG") {
      return from === "TODO" || from === "IN_PROGRESS" || from === "BLOCKED";
    }
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

  const canAccessBacklog = userRole === "OWNER" || userRole === "ADMIN";
  const allowedToBacklog =
    canAccessBacklog && ["TODO", "IN_PROGRESS", "BLOCKED"].includes(from)
      ? ["BACKLOG"]
      : [];

  if (from === "IN_REVIEW") {
    return userRole && userRole !== "COLLABORATOR"
      ? ([
          "TRASH",
          "IN_PROGRESS",
          "VALIDATED",
          ...allowedToBacklog,
        ] as TaskStatus[])
      : [];
  }

  return [...COMMON_TRANSITIONS[from], ...allowedToBacklog] as TaskStatus[];
};

export const canDeleteTaskByStatus = (status: TaskStatus) => {
  return (
    status === "TODO" ||
    status === "IN_PROGRESS" ||
    status === "BLOCKED" ||
    status === "TRASH"
  );
};
