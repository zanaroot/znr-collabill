import type { TaskStatus } from "@/http/models/task.model";

export const statusTagColor = (status: TaskStatus) => {
  switch (status) {
    case "TODO":
      return "default";
    case "IN_PROGRESS":
      return "blue";
    case "IN_REVIEW":
      return "purple";
    case "VALIDATED":
      return "green";
    case "BLOCKED":
      return "orange";
    case "TRASH":
      return "red";
    case "BACKLOG":
      return "volcano";
    default:
      return "default";
  }
};

export const formatStatus = (status: TaskStatus) => {
  switch (status) {
    case "TODO":
      return "Todo";
    case "IN_PROGRESS":
      return "In progress";
    case "IN_REVIEW":
      return "In review";
    case "VALIDATED":
      return "Validated";
    case "BLOCKED":
      return "Blocked";
    case "TRASH":
      return "Trash";
    case "ARCHIVED":
      return "Archived";
    case "BACKLOG":
      return "Backlog";
    default:
      return status;
  }
};
