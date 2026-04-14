import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { taskNotifications } from "@/db/schema";
import * as organizationRepository from "@/http/repositories/organization.repository";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";
import {
  buildTaskReviewMessage,
  getTaskUrl,
  sendSlackMessageWithToken,
} from "@/packages/slack";

const NOTIFICATION_TYPE_IN_REVIEW = "in_review";

export const notifyTaskInReview = async (taskId: string): Promise<void> => {
  const task = await taskRepository.findTaskWithAssigneeById(taskId);
  if (!task) {
    console.warn(`[TaskNotification] Task not found: ${taskId}`);
    return;
  }

  const project = await projectRepository.findProjectById(task.projectId);
  if (!project) {
    console.warn(`[TaskNotification] Project not found: ${task.projectId}`);
    return;
  }

  if (project.slackNotificationsEnabled === false) {
    console.log(
      `[TaskNotification] Slack notifications disabled for project: ${project.name}`,
    );
    return;
  }

  const organization = await organizationRepository.getOrganizationById(
    project.organizationId,
  );
  if (!organization) {
    console.warn(
      `[TaskNotification] Organization not found: ${project.organizationId}`,
    );
    return;
  }

  if (!organization.slackBotTokenEncrypted) {
    console.log(
      `[TaskNotification] No slack bot token configured for organization: ${organization.name}`,
    );
    return;
  }

  const channel = project.slackChannel ?? organization.slackDefaultChannel;
  if (!channel) {
    console.log(
      `[TaskNotification] No slack channel configured for project: ${project.name}`,
    );
    return;
  }

  const alreadyNotified = await db
    .select({ taskId: taskNotifications.taskId })
    .from(taskNotifications)
    .where(
      and(
        eq(taskNotifications.taskId, taskId),
        eq(taskNotifications.type, NOTIFICATION_TYPE_IN_REVIEW),
      ),
    )
    .limit(1);

  if (alreadyNotified.length > 0) {
    console.log(
      `[TaskNotification] Already sent notification for task: ${taskId}`,
    );
    return;
  }

  await db.insert(taskNotifications).values({
    taskId,
    type: NOTIFICATION_TYPE_IN_REVIEW,
  });

  const taskUrl = getTaskUrl(taskId);
  const { blocks, text } = buildTaskReviewMessage({
    taskId: task.id,
    taskTitle: task.title,
    assigneeName: task.assigneeName,
    taskUrl,
  });

  await sendSlackMessageWithToken(
    organization.slackBotTokenEncrypted,
    channel,
    text,
    blocks,
  );
};
