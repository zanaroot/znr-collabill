import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import type { UpdateTaskSystemInput } from "@/http/models/task.model";
import { createTaskSchema, updateTaskSchema } from "@/http/models/task.model";
import * as invoiceRepository from "@/http/repositories/invoice.repository";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";
import * as userRepository from "@/http/repositories/user.repository";
import {
  canDeleteTaskByStatus,
  canTransitionTaskStatus,
} from "@/lib/task-workflow";

const factory = createFactory<AuthEnv>();

const ensureMembership = async (userId: string, projectId: string) => {
  const project = await projectRepository.findProjectById(projectId);
  if (!project) return false;

  const isProjectMember = await projectRepository.isProjectMember(
    projectId,
    userId,
  );
  if (isProjectMember) return true;

  const isOrgMember = await projectRepository.isOrganizationMember(
    project.organizationId,
    userId,
  );
  if (!isOrgMember) return false;

  const orgRole = await projectRepository.getOrganizationRole(
    userId,
    project.organizationId,
  );

  if (orgRole === "OWNER") return true;

  return false;
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

        const assignedTo =
          payload.assignedTo !== undefined
            ? payload.assignedTo
            : task.assignedTo;
        const taskSize = payload.size !== undefined ? payload.size : task.size;
        const taskTitle =
          payload.title !== undefined ? payload.title : task.title;


        if (assignedTo) {
          const rates =
            await userRepository.findCollaboratorRatesByUserId(assignedTo);
          if (rates) {
            const now = new Date();
            let invoice = await invoiceRepository.findDraftInvoice(
              assignedTo,
              now.getMonth() + 1,
              now.getFullYear(),
            );
            if (!invoice) {
              invoice = await invoiceRepository.createInvoice(
                assignedTo,
                now.getMonth() + 1,
                now.getFullYear(),
              );
            }

            let unitPrice = "0";
            switch (taskSize) {
              case "XS":
                unitPrice = rates.rateXs || "0";
                break;
              case "S":
                unitPrice = rates.rateS || "0";
                break;
              case "M":
                unitPrice = rates.rateM || "0";
                break;
              case "L":
                unitPrice = rates.rateL || "0";
                break;
              case "XL":
                unitPrice = rates.rateL || "0"; // XL uses L for now
                break;
            }

            await invoiceRepository.createInvoiceLine({
              invoiceId: invoice.id,
              type: "TASK",
              referenceId: task.id,
              label: taskTitle,
              quantity: 1,
              unitPrice: unitPrice,
            });
          }
        }
      } else if (task.status === "VALIDATED") {
        updates.validatedAt = null;
        updates.validatedBy = null;
        // Delete invoice line
        await invoiceRepository.deleteInvoiceLineByReference(task.id, "TASK");
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
