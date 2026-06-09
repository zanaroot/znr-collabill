import { getTaskUrl } from "@/app/_utils/get-task-by-url";
import { getOrgSlackCredentialsDecrypted } from "@/http/actions/integrations.action";
import { findInvoiceByIdWithOrganization } from "@/http/repositories/invitation.repository";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";
import { findUserById } from "@/http/repositories/user.repository";
import { sendEmail } from "@/packages/email";
import {
  buildTaskAssignedMessage,
  buildTaskCommentMessage,
  buildTaskReviewMessage,
  buildTaskValidatedMessage,
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

  const reviewer = task.reviewerId ? await findUserById(task.reviewerId) : null;

  const taskUrl = getTaskUrl(taskId, project.id);
  const { blocks, text } = buildTaskReviewMessage({
    taskId: task.id,
    taskTitle: task.title,
    assigneeName: task.assigneeName,
    reviewerName: reviewer?.name ?? null,
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

export const notifyInvoiceValidatedEmail = async (invoiceId: string) => {
  const invoice = await findInvoiceByIdWithOrganization(invoiceId);
  if (!invoice || !invoice.ownerEmail) return;

  const subject = `Invoice validated`;
  const html = `
    <p>Hello ${invoice.ownerName},</p>
    <p>Your invoice for <strong>${invoice.organizationName}</strong> has been validated.</p>
    ${invoice.organizationOwnerName ? `<p>Validated by: <strong>${invoice.organizationOwnerName}</strong></p>` : ""}
    <p><a href="${baseUrl}/invoices/${invoiceId}">View invoice</a></p>
  `;
  const text = `
Hello ${invoice.ownerName},

Your invoice for ${invoice.organizationName} has been validated.
${invoice.organizationOwnerName ? `Validated by: ${invoice.organizationOwnerName}` : ""}

View invoice: ${baseUrl}/invoices/${invoiceId}
  `;

  await sendEmail({ to: invoice.ownerEmail, subject, html, text });
};

export const notifyInvoicePaidEmail = async (invoiceId: string) => {
  const invoice = await findInvoiceByIdWithOrganization(invoiceId);
  if (!invoice || !invoice.ownerEmail) return;

  const subject = `Invoice marked as paid`;
  const html = `
    <p>Hello ${invoice.ownerName},</p>
    <p>Your invoice for <strong>${invoice.organizationName}</strong> has been marked as paid.</p>
    ${invoice.organizationOwnerName ? `<p>Marked by: <strong>${invoice.organizationOwnerName}</strong></p>` : ""}
    <p><a href="${baseUrl}/invoices/${invoiceId}">View invoice</a></p>
  `;
  const text = `
Hello ${invoice.ownerName},

Your invoice for ${invoice.organizationName} has been marked as paid.
${invoice.organizationOwnerName ? `Marked by: ${invoice.organizationOwnerName}` : ""}

View invoice: ${baseUrl}/invoices/${invoiceId}
  `;

  await sendEmail({ to: invoice.ownerEmail, subject, html, text });
};
