import { zValidator } from "@hono/zod-validator";
import { and, eq, ne } from "drizzle-orm";
import { createFactory } from "hono/factory";
import { z } from "zod";
import { db } from "@/db";
import { organizationMembers, users } from "@/db/schema";
import type { AuthEnv } from "@/http/models/auth.model";
import * as invoiceRepository from "@/http/repositories/invoice.repository";
import * as invoiceCommentRepository from "@/http/repositories/invoice-comment.repository";
import { notifyInvoiceCommentSlack } from "@/lib/notifications";
import { sendEmail } from "@/packages/email";

const factory = createFactory<AuthEnv>();

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const getCommentsByInvoice = factory.createHandlers(async (c) => {
  const invoiceId = c.req.param("invoiceId");
  const user = c.get("user");

  if (!invoiceId) {
    return c.json({ error: "Invoice ID is required" }, 400);
  }

  // Verify user has access to this invoice's organization
  const invoice = await invoiceRepository.findInvoiceById(invoiceId);
  if (!invoice) {
    return c.json({ error: "Invoice not found" }, 404);
  }

  if (invoice.organizationId !== user.organizationId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const comments =
    await invoiceCommentRepository.findCommentsByInvoiceId(invoiceId);
  return c.json(comments);
});

export const createComment = factory.createHandlers(
  zValidator("json", createCommentSchema),
  async (c) => {
    const invoiceId = c.req.param("invoiceId");
    const user = c.get("user");
    const { content } = c.req.valid("json");

    if (!invoiceId) {
      return c.json({ error: "Invoice ID is required" }, 400);
    }

    // Verify user has access to this invoice's organization
    const invoice = await invoiceRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      return c.json({ error: "Invoice not found" }, 404);
    }

    if (invoice.organizationId !== user.organizationId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    // Create the comment
    const comment = await invoiceCommentRepository.createComment({
      invoiceId,
      userId: user.id,
      content,
    });

    // Notify other organization members
    await notifyOrganizationMembers(
      invoiceId,
      user.id,
      user.organizationId,
      user.name,
      content,
    );

    return c.json(comment, 201);
  },
);

async function notifyOrganizationMembers(
  invoiceId: string,
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

  const emailSubject = `${commenterName} commented on an invoice`;
  const emailHtml = `
    <p>Hello,</p>
    <p><strong>${commenterName}</strong> added a comment to an invoice:</p>
    <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin-left: 0; color: #555;">
      ${content.replace(/\n/g, "<br>")}
    </blockquote>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invoices/${invoiceId}">View invoice</a></p>
  `;

  const emailText = `
Hello,

${commenterName} added a comment to an invoice:

> ${content}

View invoice: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invoices/${invoiceId}
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

  // Send Slack notification
  notifyInvoiceCommentSlack(invoiceId, commenterName, content).catch((err) => {
    console.error("[Notification] Failed to send Slack notification:", err);
  });

  await Promise.all(emailPromises);
}
