"use server";

import { revalidatePath } from "next/cache";
import type { tasks } from "@/db/schema/task";

type Task = typeof tasks.$inferSelect;

import type { ActionResponse } from "@/http/models/auth.model";
import type { UpdateTaskSystemInput } from "@/http/models/task.model";
import * as taskRepository from "@/http/repositories/task.repository";
import { getCurrentUser } from "./get-current-user.action";

type TaskActionResponse = ActionResponse & {
  data?: Task;
};

export const validateTaskAction = async (
  taskId: string,
): Promise<TaskActionResponse> => {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized", success: false };
  }

  try {
    const task = await taskRepository.findTaskById(taskId);
    if (!task) {
      return { error: "Task not found", success: false };
    }

    if (task.status !== "VALIDATED") {
      return {
        error: "Task must be validated before archiving",
        success: false,
      };
    }

    const updates: UpdateTaskSystemInput = {
      status: "ARCHIVED",
      archivedAt: new Date(),
    };

    const updated = await taskRepository.updateTask(taskId, updates);
    if (!updated) {
      return { error: "Failed to archive task", success: false };
    }

    revalidatePath("/task-board");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Validate task error:", error);
    return { error: "Failed to archive task", success: false };
  }
};

export const unvalidateTaskAction = async (
  taskId: string,
): Promise<TaskActionResponse> => {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized", success: false };
  }

  try {
    const task = await taskRepository.findTaskById(taskId);
    if (!task) {
      return { error: "Task not found", success: false };
    }

    if (task.status !== "ARCHIVED") {
      return {
        error: "Task must be archived before unvalidating",
        success: false,
      };
    }

    const updates: UpdateTaskSystemInput = {
      status: "VALIDATED",
      archivedAt: null,
    };

    const updated = await taskRepository.updateTask(taskId, updates);
    if (!updated) {
      return { error: "Failed to restore task", success: false };
    }

    revalidatePath("/task-board");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Unvalidate task error:", error);
    return { error: "Failed to restore task", success: false };
  }
};
