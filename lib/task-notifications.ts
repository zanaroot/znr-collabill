import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { taskNotifications } from "@/db/schema";
import { getOrgSlackCredentialsDecrypted } from "@/http/actions/integrations.action";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";
import {
  buildTaskReviewMessage,
  getTaskUrl,
  sendSlackMessageWithCredentials,
} from "@/packages/slack";

const NOTIFICATION_TYPE_IN_REVIEW = "in_review";

export const notifyTaskInReview = async (taskId: string): Promise<void> => {
  console.log(`[TaskNotification] Processing task: ${taskId}`);

  const task = await taskRepository.findTaskWithAssigneeById(taskId);
  if (!task) {
    console.warn(`[TaskNotification] Task not found: ${taskId}`);
    return;
  }
  console.log(
    `[TaskNotification] Task title: ${task.title}, projectId: ${task.projectId}`,
  );

  const project = await projectRepository.findProjectById(task.projectId);
  if (!project) {
    console.warn(`[TaskNotification] Project not found: ${task.projectId}`);
    return;
  }
  console.log(
    `[TaskNotification] Project: ${project.name}, slackNotificationsEnabled: ${project.slackNotificationsEnabled}, slackChannel: ${project.slackChannel}`,
  );

  if (project.slackNotificationsEnabled === false) {
    console.log(
      `[TaskNotification] Slack notifications disabled for project: ${project.name}`,
    );
    return;
  }

  const slackCreds = await getOrgSlackCredentialsDecrypted(
    project.organizationId,
  );
  if (!slackCreds) {
    console.log(
      `[TaskNotification] No Slack integration configured for organization: ${project.organizationId}`,
    );
    return;
  }

  const channel = project.slackChannel ?? slackCreds.defaultChannel;
  if (!channel) {
    console.log(
      `[TaskNotification] No slack channel configured for project: ${project.name}`,
    );
    return;
  }
  console.log(`[TaskNotification] Using channel: ${channel}`);

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

  const taskUrl = getTaskUrl(taskId, project.id);
  const { blocks, text } = buildTaskReviewMessage({
    taskId: task.id,
    taskTitle: task.title,
    assigneeName: task.assigneeName,
    projectName: project.name,
    taskUrl,
  });

  console.log(`[TaskNotification] Sending message to ${channel}...`);
  await sendSlackMessageWithCredentials(slackCreds, channel, text, blocks);
  console.log(`[TaskNotification] Message sent successfully`);
};
