import { eq } from "drizzle-orm";
import { getTaskUrl } from "@/app/_utils/get-task-by-url";
import { db } from "@/db";
import { invoices, organizationMembers, users } from "@/db/schema";
import { getOrgSlackCredentialsDecrypted } from "@/http/actions/integrations.action";
import * as projectRepository from "@/http/repositories/project.repository";
import * as taskRepository from "@/http/repositories/task.repository";
import { sendEmail } from "@/packages/email";
import {
  buildInvoiceCommentMessage,
  buildInvoicePaidMessage,
  buildInvoiceValidatedMessage,
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

export const notifyInvoiceValidatedSlack = async (invoiceId: string) => {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      organization: true,
    },
  });

  if (!invoice) return;

  const slackCreds = await getOrgSlackCredentialsDecrypted(
    invoice.organizationId,
  );
  if (!slackCreds) return;

  const channel = slackCreds.defaultChannel;
  if (!channel) return;

  const invoiceUrl = `${baseUrl}/invoices/${invoiceId}`;
  const { blocks, text } = buildInvoiceValidatedMessage({
    invoiceId: invoice.id,
    organizationName: invoice.organization.name,
    totalAmount: invoice.totalAmount,
    invoiceUrl,
  });

  await sendSlackMessageWithCredentials(slackCreds, channel, text, blocks);
};

export const notifyInvoicePaidSlack = async (invoiceId: string) => {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      organization: true,
    },
  });

  if (!invoice) return;

  const slackCreds = await getOrgSlackCredentialsDecrypted(
    invoice.organizationId,
  );
  if (!slackCreds) return;

  const channel = slackCreds.defaultChannel;
  if (!channel) return;

  const invoiceUrl = `${baseUrl}/invoices/${invoiceId}`;
  const { blocks, text } = buildInvoicePaidMessage({
    invoiceId: invoice.id,
    organizationName: invoice.organization.name,
    totalAmount: invoice.totalAmount,
    invoiceUrl,
  });

  await sendSlackMessageWithCredentials(slackCreds, channel, text, blocks);
};

export const notifyInvoiceCommentSlack = async (
  invoiceId: string,
  commenterName: string,
  content: string,
) => {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      organization: true,
    },
  });

  if (!invoice) return;

  const slackCreds = await getOrgSlackCredentialsDecrypted(
    invoice.organizationId,
  );
  if (!slackCreds) return;

  const channel = slackCreds.defaultChannel;
  if (!channel) return;

  const invoiceUrl = `${baseUrl}/invoices/${invoiceId}`;
  const { blocks, text } = buildInvoiceCommentMessage({
    invoiceId: invoice.id,
    organizationName: invoice.organization.name,
    commenterName,
    content,
    invoiceUrl,
  });

  await sendSlackMessageWithCredentials(slackCreds, channel, text, blocks);
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
