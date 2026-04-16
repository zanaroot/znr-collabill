import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import { z } from "zod";
import type { AuthEnv } from "@/http/models/auth.model";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";
import * as taskCommentRepository from "@/http/repositories/task-comment.repository";
import { notifyTaskCommentSlack } from "@/lib/notifications";

const factory = createFactory<AuthEnv>();

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const ensureMembership = async (
  userId: string,
  organizationId: string | null,
  projectId: string,
) => {
  const project = await projectRepository.findProjectById(projectId);
  if (!project) return false;

  if (project.organizationId !== organizationId) return false;

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

export const getCommentsByTask = factory.createHandlers(async (c) => {
  const taskId = c.req.param("taskId");
  const user = c.get("user");

  if (!taskId) {
    return c.json({ error: "Task ID is required" }, 400);
  }

  const task = await taskRepository.findTaskById(taskId);
  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }

  const isMember = await ensureMembership(
    user.id,
    user.organizationId,
    task.projectId,
  );
  if (!isMember) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const comments = await taskCommentRepository.findCommentsByTaskId(taskId);
  return c.json(comments);
});

export const createComment = factory.createHandlers(
  zValidator("json", createCommentSchema),
  async (c) => {
    const taskId = c.req.param("taskId");
    const user = c.get("user");
    const { content } = c.req.valid("json");

    if (!taskId) {
      return c.json({ error: "Task ID is required" }, 400);
    }

    const task = await taskRepository.findTaskById(taskId);
    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    const isMember = await ensureMembership(
      user.id,
      user.organizationId,
      task.projectId,
    );
    if (!isMember) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const comment = await taskCommentRepository.createTaskComment({
      taskId,
      userId: user.id,
      content,
    });

    notifyTaskCommentSlack(taskId).catch((err) => {
      console.error("[Notification] Failed to send Slack notification:", err);
    });

    return c.json(comment, 201);
  },
);

export const updateComment = factory.createHandlers(
  zValidator("json", updateCommentSchema),
  async (c) => {
    const commentId = c.req.param("commentId");
    const user = c.get("user");
    const { content } = c.req.valid("json");

    if (!commentId) {
      return c.json({ error: "Comment ID is required" }, 400);
    }

    const comment = await taskCommentRepository.findCommentById(commentId);
    if (!comment) {
      return c.json({ error: "Comment not found" }, 404);
    }

    if (comment.userId !== user.id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const updatedComment = await taskCommentRepository.updateTaskComment(
      commentId,
      content,
    );

    return c.json(updatedComment);
  },
);
