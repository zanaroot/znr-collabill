import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import type { UpdateTaskSystemInput } from "@/http/models/task.model";
import { createTaskSchema, updateTaskSchema } from "@/http/models/task.model";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";
import {
  canDeleteTaskByStatus,
  canTransitionTaskStatus,
} from "@/lib/task-workflow";

const factory = createFactory<AuthEnv>();

const ensureMembership = async (userId: string, projectId: string) => {
  return await projectRepository.isProjectMember(projectId, userId);
};

export const getTasksByProject = factory.createHandlers(async (c) => {
  const projectId = c.req.param("projectId");
  const user = c.get("user");

  if (!projectId) {
    return c.json({ error: "Project ID is required" }, 400);
  }

  const isMember = await ensureMembership(user.id, projectId);
  if (!isMember) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const tasks = await taskRepository.findTasksByProjectId(projectId);
  return c.json(tasks);
});

export const createTask = factory.createHandlers(
  zValidator("json", createTaskSchema),
  async (c) => {
    const user = c.get("user");
    const payload = c.req.valid("json");

    const isMember = await ensureMembership(user.id, payload.projectId);
    if (!isMember) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const task = await taskRepository.createTask(payload);
    return c.json(task, 201);
  },
);

export const updateTask = factory.createHandlers(
  zValidator("json", updateTaskSchema),
  async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const payload = c.req.valid("json");

    if (!id) {
      return c.json({ error: "Task ID is required" }, 400);
    }

    const task = await taskRepository.findTaskById(id);
    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    const isMember = await ensureMembership(user.id, task.projectId);
    if (!isMember) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    if (!task.status) {
      return c.json({ error: "Task status is missing" }, 500);
    }

    const project = await projectRepository.findProjectById(task.projectId);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const isProjectOwner = project.createdBy === user.id;

    const updates: UpdateTaskSystemInput = { ...payload };

    if (payload.status && payload.status !== task.status) {
      const canTransition = canTransitionTaskStatus({
        from: task.status,
        to: payload.status,
        isProjectOwner,
      });

      if (!canTransition) {
        return c.json(
          {
            error:
              "This task cannot be moved to the selected column with your current permissions",
          },
          403,
        );
      }

      updates.status = payload.status;

      if (payload.status === "VALIDATED") {
        updates.validatedAt = new Date();
        updates.validatedBy = user.id;
      } else if (task.validatedAt) {
        updates.validatedAt = null;
        updates.validatedBy = null;
      }
    }

    const updated = await taskRepository.updateTask(id, updates);
    if (!updated) {
      return c.json({ error: "Failed to update task" }, 500);
    }

    return c.json(updated);
  },
);

export const deleteTask = factory.createHandlers(async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  if (!id) {
    return c.json({ error: "Task ID is required" }, 400);
  }

  const task = await taskRepository.findTaskById(id);
  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }

  const isMember = await ensureMembership(user.id, task.projectId);
  if (!isMember) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  if (!task.status) {
    return c.json({ error: "Task status is missing" }, 500);
  }

  if (!canDeleteTaskByStatus(task.status)) {
    return c.json(
      {
        error: "This task cannot be deleted in its current status",
      },
      403,
    );
  }

  await taskRepository.deleteTask(id);
  return c.json({ message: "Task deleted" });
});
