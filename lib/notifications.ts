import { eq } from "drizzle-orm";
import { getTaskUrl } from "@/app/_utils/get-task-by-url";
import { db } from "@/db";
import { invoices, organizationMembers, users } from "@/db/schema";
import { getOrgSlackCredentialsDecrypted } from "@/http/actions/integrations.action";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";
import { sendEmail } from "@/packages/email";
import {
  buildTaskReviewMessage,
  sendSlackMessageWithCredentials,
} from "@/packages/slack";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const notifyTaskCommentSlack = async (taskId: string) => {
  const task = await taskRepository.findTaskWithAssigneeById(taskId);
  if (!task) return;

  const project = await projectRepository.findProjectById(task.projectId);
  if (!project) return;

  if (project.slackNotificationsEnabled === false) return;

  const slackCreds = await getOrgSlackCredentialsDecrypted(
    project.organizationId,
  );
  if (!slackCreds) return;

  const channel = project.slackChannel ?? slackCreds.defaultChannel;
  if (!channel) return;

  const taskUrl = getTaskUrl(taskId, project.id);
  const { blocks, text } = buildTaskCommentMessage({
    taskId: task.id,
    taskTitle: task.title,
    assigneeName: task.assigneeName,
    projectName: project.name,
    taskUrl,
  });

  await sendSlackMessageWithCredentials(slackCreds, channel, text, blocks);
};

const buildTaskCommentMessage = (params: {
  taskId: string;
  taskTitle: string;
  projectName: string;
  assigneeName: string | null;
  taskUrl: string;
}) => {
  const { taskId, taskTitle, projectName, assigneeName, taskUrl } = params;

  const fields = [];
  if (assigneeName) {
    fields.push({ type: "mrkdwn", text: `*Assignee:*\n${assigneeName}` });
  }
  fields.push({ type: "mrkdwn", text: `*Project:*\n${projectName}` });

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "💬 New Comment on Task",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*New comment added*`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Task",
          emoji: true,
        },
        url: taskUrl,
        action_id: "view_task",
      },
    },
    {
      type: "section",
      fields: fields,
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Task:* ${taskTitle}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `ID: ${taskId}`,
        },
      ],
    },
  ];

  const fallbackText = `[${taskId}] New comment on "${taskTitle}" (Project: ${projectName})`;

  return { blocks, text: fallbackText };
};

export const notifyTaskInReviewSlack = async (taskId: string) => {
  const task = await taskRepository.findTaskWithAssigneeById(taskId);
  if (!task) return;

  const project = await projectRepository.findProjectById(task.projectId);
  if (!project) return;

  if (project.slackNotificationsEnabled === false) return;

  const slackCreds = await getOrgSlackCredentialsDecrypted(
    project.organizationId,
  );
  if (!slackCreds) return;

  const channel = project.slackChannel ?? slackCreds.defaultChannel;
  if (!channel) return;

  const taskUrl = getTaskUrl(taskId, project.id);
  const { blocks, text } = buildTaskReviewMessage({
    taskId: task.id,
    taskTitle: task.title,
    assigneeName: task.assigneeName,
    projectName: project.name,
    taskUrl,
  });

  await sendSlackMessageWithCredentials(slackCreds, channel, text, blocks);
};

export const notifyTaskValidatedSlack = async (taskId: string) => {
  const task = await taskRepository.findTaskWithAssigneeById(taskId);
  if (!task) return;

  const project = await projectRepository.findProjectById(task.projectId);
  if (!project) return;

  if (project.slackNotificationsEnabled === false) return;

  const slackCreds = await getOrgSlackCredentialsDecrypted(
    project.organizationId,
  );
  if (!slackCreds) return;

  const channel = project.slackChannel ?? slackCreds.defaultChannel;
  if (!channel) return;

  const taskUrl = getTaskUrl(taskId, project.id);
  const { blocks, text } = buildTaskValidatedMessage({
    taskId: task.id,
    taskTitle: task.title,
    assigneeName: task.assigneeName,
    projectName: project.name,
    taskUrl,
  });

  await sendSlackMessageWithCredentials(slackCreds, channel, text, blocks);
};

const buildTaskValidatedMessage = (params: {
  taskId: string;
  taskTitle: string;
  projectName: string;
  assigneeName: string | null;
  taskUrl: string;
}) => {
  const { taskId, taskTitle, projectName, assigneeName, taskUrl } = params;

  const fields = [];
  if (assigneeName) {
    fields.push({ type: "mrkdwn", text: `*Assignee:*\n${assigneeName}` });
  }
  fields.push({ type: "mrkdwn", text: `*Status:*\nValidated` });
  fields.push({ type: "mrkdwn", text: `*Project:*\n${projectName}` });

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Task Validated",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Task has been validated*`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Task",
          emoji: true,
        },
        url: taskUrl,
        action_id: "view_task",
      },
    },
    {
      type: "section",
      fields: fields,
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Task:* ${taskTitle}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `ID: ${taskId}`,
        },
      ],
    },
  ];

  const fallbackText = `[${taskId}] Task "${taskTitle}" has been validated (Project: ${projectName})`;

  return { blocks, text: fallbackText };
};

export const notifyTaskAssignedSlack = async (taskId: string) => {
  const task = await taskRepository.findTaskWithAssigneeById(taskId);
  if (!task) return;

  const project = await projectRepository.findProjectById(task.projectId);
  if (!project) return;

  if (project.slackNotificationsEnabled === false) return;

  const slackCreds = await getOrgSlackCredentialsDecrypted(
    project.organizationId,
  );
  if (!slackCreds) return;

  const channel = project.slackChannel ?? slackCreds.defaultChannel;
  if (!channel) return;

  const taskUrl = getTaskUrl(taskId, project.id);
  const { blocks, text } = buildTaskAssignedMessage({
    taskId: task.id,
    taskTitle: task.title,
    assigneeName: task.assigneeName,
    projectName: project.name,
    taskUrl,
  });

  await sendSlackMessageWithCredentials(slackCreds, channel, text, blocks);
};

const buildTaskAssignedMessage = (params: {
  taskId: string;
  taskTitle: string;
  projectName: string;
  assigneeName: string | null;
  taskUrl: string;
}) => {
  const { taskId, taskTitle, projectName, assigneeName, taskUrl } = params;

  const fields = [];
  if (assigneeName) {
    fields.push({ type: "mrkdwn", text: `*Assignee:*\n${assigneeName}` });
  }
  fields.push({ type: "mrkdwn", text: `*Status:*\nBacklog` });
  fields.push({ type: "mrkdwn", text: `*Project:*\n${projectName}` });

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "👤 Task Assigned",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Task assigned to ${assigneeName || "Unknown"}*`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Task",
          emoji: true,
        },
        url: taskUrl,
        action_id: "view_task",
      },
    },
    {
      type: "section",
      fields: fields,
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Task:* ${taskTitle}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `ID: ${taskId}`,
        },
      ],
    },
  ];

  const fallbackText = `[${taskId}] Task "${taskTitle}" assigned to ${assigneeName || "Unknown"} (Project: ${projectName})`;

  return { blocks, text: fallbackText };
};

export const notifyInvoiceValidatedEmail = async (invoiceId: string) => {
  const invoice = await findInvoiceByIdWithOrganization(invoiceId);
  if (!invoice) return;

  const members = await getOrganizationMembers(invoice.organizationId);
  if (members.length === 0) return;

  const subject = `Invoice validated`;
  const html = `
    <p>Hello,</p>
    <p>An invoice has been validated.</p>
    <p><a href="${baseUrl}/invoices/${invoiceId}">View invoice</a></p>
  `;
  const text = `
Hello,

Invoice validated.

View invoice: ${baseUrl}/invoices/${invoiceId}
  `;

  await sendBulkEmail(members, subject, html, text);
};

export const notifyInvoicePaidEmail = async (invoiceId: string) => {
  const invoice = await findInvoiceByIdWithOrganization(invoiceId);
  if (!invoice) return;

  const members = await getOrganizationMembers(invoice.organizationId);
  if (members.length === 0) return;

  const subject = `Invoice marked as paid`;
  const html = `
    <p>Hello,</p>
    <p>An invoice has been marked as paid.</p>
    <p><a href="${baseUrl}/invoices/${invoiceId}">View invoice</a></p>
  `;
  const text = `
Hello,

Invoice marked as paid.

View invoice: ${baseUrl}/invoices/${invoiceId}
  `;

  await sendBulkEmail(members, subject, html, text);
};

async function findInvoiceByIdWithOrganization(invoiceId: string) {
  const result = await db
    .select({
      id: invoices.id,
      organizationId: invoices.organizationId,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  return result[0] || null;
}

async function getOrganizationMembers(organizationId: string) {
  const members = await db
    .select({
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId));

  return members;
}

async function sendBulkEmail(
  members: { email: string }[],
  subject: string,
  html: string,
  text: string,
) {
  const promises = members.map((member) =>
    sendEmail({
      to: member.email,
      subject,
      html,
      text,
    }).catch((error) => {
      console.error(`Failed to send email to ${member.email}:`, error);
    }),
  );

  await Promise.all(promises);
}
