import { zValidator } from "@hono/zod-validator";
import { and, eq, ne } from "drizzle-orm";
import { createFactory } from "hono/factory";
import { z } from "zod";
import { db } from "@/db";
import { organizationMembers, users } from "@/db/schema";
import type { AuthEnv } from "@/http/models/auth.model";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";
import * as taskCommentRepository from "@/http/repositories/task-comment.repository";
import { sendEmail } from "@/packages/email";

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

    // Create the comment
    const comment = await taskCommentRepository.createTaskComment({
      taskId,
      userId: user.id,
      content,
    });

    // Notify other organization members
    await notifyOrganizationMembers(
      taskId,
      task.title,
      user.id,
      user.organizationId,
      user.name,
      content,
    );

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

async function notifyOrganizationMembers(
  taskId: string,
  taskTitle: string,
  commenterId: string,
  organizationId: string | null,
  commenterName: string,
  content: string,
) {
  if (!organizationId) return;

  // Get all organization members except the commenter
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        ne(organizationMembers.userId, commenterId),
      ),
    );

  if (members.length === 0) return;

  const emailSubject = `${commenterName} commented on task: ${taskTitle}`;
  const emailHtml = `
    <p>Hello,</p>
    <p><strong>${commenterName}</strong> added a comment to a task: <strong>${taskTitle}</strong></p>
    <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin-left: 0; color: #555;">
      ${content.replace(/\n/g, "<br>")}
    </blockquote>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tasks/${taskId}">View task</a></p>
  `;

  const emailText = `
Hello,

${commenterName} added a comment to a task: ${taskTitle}

> ${content}

View task: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tasks/${taskId}
  `;

  // Send emails to all members
  const emailPromises = members.map((member) =>
    sendEmail({
      to: member.email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    }).catch((error) => {
      console.error(`Failed to send email to ${member.email}:`, error);
    }),
  );

  await Promise.all(emailPromises);
}
