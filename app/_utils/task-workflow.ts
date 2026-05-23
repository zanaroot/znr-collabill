import type { TaskStatus } from "@/http/models/task.model";
import type { Role } from "@/http/models/user.model";

type TaskWorkflowContext = {
  from: TaskStatus;
  to: TaskStatus;
  userRole?: Role;
  reviewerId?: string | null;
  userId?: string;
};

const COMMON_TRANSITIONS: Record<
  Exclude<TaskStatus, "IN_REVIEW" | "BACKLOG" | "APPROVED">,
  readonly TaskStatus[]
> = {
  TODO: ["IN_PROGRESS", "BLOCKED", "TRASH"],
  IN_PROGRESS: ["BLOCKED", "TRASH", "TODO", "IN_REVIEW"],
  VALIDATED: ["ARCHIVED"],
  BLOCKED: ["TODO", "TRASH"],
  TRASH: [],
  ARCHIVED: ["VALIDATED"],
};

export const canTransitionTaskStatus = ({
  from,
  to,
  userRole,
  reviewerId,
  userId,
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
    const isReviewer = reviewerId && userId && reviewerId === userId;
    if (isReviewer) {
      return to === "TRASH" || to === "IN_PROGRESS" || to === "APPROVED";
    }
    if (!userRole || userRole === "COLLABORATOR") return false;
    return to === "TRASH" || to === "IN_PROGRESS" || to === "APPROVED";
  }

  if (from === "APPROVED") {
    if (to === "IN_REVIEW") {
      const isReviewer = reviewerId && userId && reviewerId === userId;
      if (isReviewer) return true;
      if (!userRole || userRole === "COLLABORATOR") return false;
      return true;
    }
    if (to === "VALIDATED") {
      if (!userRole || userRole === "COLLABORATOR") return false;
      return true;
    }
    return false;
  }

  if (from === "VALIDATED" && to === "APPROVED") {
    if (!userRole || userRole === "COLLABORATOR") return false;
    return true;
  }

  return COMMON_TRANSITIONS[from].includes(to);
};

export const getAllowedTaskTransitions = ({
  from,
  userRole,
  reviewerId,
  userId,
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
    const isReviewer = reviewerId && userId && reviewerId === userId;
    if (isReviewer) {
      return [
        "TRASH",
        "IN_PROGRESS",
        "APPROVED",
        ...allowedToBacklog,
      ] as TaskStatus[];
    }
    return userRole && userRole !== "COLLABORATOR"
      ? ([
          "TRASH",
          "IN_PROGRESS",
          "APPROVED",
          ...allowedToBacklog,
        ] as TaskStatus[])
      : [];
  }

  if (from === "APPROVED") {
    const isReviewer = reviewerId && userId && reviewerId === userId;
    const allowed: TaskStatus[] = [];

    if (isReviewer || (userRole && userRole !== "COLLABORATOR")) {
      allowed.push("IN_REVIEW");
    }

    if (userRole && userRole !== "COLLABORATOR") {
      allowed.push("VALIDATED");
      allowed.push(...(allowedToBacklog as TaskStatus[]));
    }

    return allowed;
  }

  if (from === "VALIDATED") {
    const allowed: TaskStatus[] = [...COMMON_TRANSITIONS.VALIDATED];
    if (userRole && userRole !== "COLLABORATOR") {
      allowed.push("APPROVED");
    }
    return allowed;
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
