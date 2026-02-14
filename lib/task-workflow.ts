import type { TaskStatus } from "@/lib/task-status";

type TaskWorkflowContext = {
  from: TaskStatus;
  to: TaskStatus;
  isProjectOwner: boolean;
};

const COMMON_TRANSITIONS: Record<
  Exclude<TaskStatus, "IN_REVIEW">,
  readonly TaskStatus[]
> = {
  TODO: ["IN_PROGRESS", "BLOCKED", "TRASH"],
  IN_PROGRESS: ["BLOCKED", "TRASH", "TODO", "IN_REVIEW"],
  VALIDATED: [],
  BLOCKED: ["TODO", "TRASH"],
  TRASH: [],
};

export const canTransitionTaskStatus = ({
  from,
  to,
  isProjectOwner,
}: TaskWorkflowContext) => {
  if (from === to) return true;

  if (from === "IN_REVIEW") {
    if (!isProjectOwner) return false;
    return to === "TRASH" || to === "IN_PROGRESS" || to === "VALIDATED";
  }

  return COMMON_TRANSITIONS[from].includes(to);
};

export const getAllowedTaskTransitions = ({
  from,
  isProjectOwner,
}: Omit<TaskWorkflowContext, "to">): TaskStatus[] => {
  if (from === "IN_REVIEW") {
    return isProjectOwner ? ["TRASH", "IN_PROGRESS", "VALIDATED"] : [];
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
