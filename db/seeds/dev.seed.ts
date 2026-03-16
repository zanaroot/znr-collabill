import { and, eq } from "drizzle-orm";
import {
  type CollaboratorRates,
  calculatePresenceUnitPrice,
  calculateTaskUnitPrice,
} from "../../lib/invoice-utils";
import { db } from "../index";
import {
  auditLogs,
  collaboratorRates,
  invitations,
  invoiceLines,
  invoices,
  passwordResetTokens,
  presences,
  projects,
  sessions,
  tasks,
} from "../schema";
import { seedCore } from "./core.seed";

function getExpiryDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function seedPasswordResetTokens(ownerId: string) {
  const token = "seed-reset-token-owner";
  const existing = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.token, token),
  });

  if (existing) {
    return;
  }

  await db.insert(passwordResetTokens).values({
    userId: ownerId,
    token,
    expiresAt: getExpiryDate(2),
  });
}

async function seedInvitations(organizationId: string) {
  const email = "new-collaborator@collabill.local";
  const existing = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.email, email),
      eq(invitations.organizationId, organizationId),
    ),
  });

  if (existing) {
    return;
  }

  await db.insert(invitations).values({
    organizationId,
    email,
    token: "seed-invitation-token",
    role: "COLLABORATOR",
    expiresAt: getExpiryDate(7),
  });
}

async function seedSessions(ownerId: string) {
  const token = "seed-session-token-owner";
  const existing = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
  });

  if (existing) {
    return;
  }

  await db.insert(sessions).values({
    userId: ownerId,
    token,
    expiresAt: getExpiryDate(30),
  });
}

async function seedPresences(collaboratorId: string) {
  const dates = ["2026-02-10", "2026-02-11", "2026-02-12"];

  await db
    .insert(presences)
    .values(dates.map((date) => ({ date, userId: collaboratorId })))
    .onConflictDoNothing();
}

async function seedInvoicesAndLines(input: {
  collaboratorId: string;
  projectId: string;
}) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, input.projectId),
  });

  const userRates = await db.query.collaboratorRates.findFirst({
    where: eq(collaboratorRates.userId, input.collaboratorId),
  });

  if (!project || !userRates) {
    throw new Error("Project or user rates not found for seeding invoices.");
  }

  let invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.userId, input.collaboratorId),
      eq(invoices.periodStart, "2026-02-01"),
      eq(invoices.periodEnd, "2026-02-28"),
    ),
  });

  if (!invoice) {
    const [created] = await db
      .insert(invoices)
      .values({
        userId: input.collaboratorId,
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        status: "DRAFT",
        totalAmount: "0", // Will be updated if needed or left as is for seed
        note: "Seed invoice for local development",
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create seed invoice.");
    }

    invoice = created;
  }

  const projectTask = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.projectId, input.projectId),
      eq(tasks.assignedTo, input.collaboratorId),
    ),
  });

  const existingPresenceLine = await db.query.invoiceLines.findFirst({
    where: and(
      eq(invoiceLines.invoiceId, invoice.id),
      eq(invoiceLines.label, "Presence days"),
    ),
  });

  if (!existingPresenceLine) {
    const unitPrice = calculatePresenceUnitPrice(
      input.collaboratorId,
      userRates as unknown as CollaboratorRates,
      project.rates,
    );
    const quantity = 3;
    await db.insert(invoiceLines).values({
      invoiceId: invoice.id,
      type: "PRESENCE",
      label: "Presence days",
      quantity,
      unitPrice: unitPrice.toString(),
      total: (unitPrice * quantity).toString(),
    });
  }

  if (!projectTask) {
    return;
  }

  const existingTaskLine = await db.query.invoiceLines.findFirst({
    where: and(
      eq(invoiceLines.invoiceId, invoice.id),
      eq(invoiceLines.label, "Validated task"),
    ),
  });

  if (existingTaskLine) {
    return;
  }

  const unitPrice = calculateTaskUnitPrice(
    input.collaboratorId,
    projectTask.size,
    userRates as unknown as CollaboratorRates,
    project.rates,
  );
  const quantity = 1;

  await db.insert(invoiceLines).values({
    invoiceId: invoice.id,
    type: "TASK",
    referenceId: projectTask.id,
    label: "Validated task",
    quantity,
    unitPrice: unitPrice.toString(),
    total: (unitPrice * quantity).toString(),
  });

  // Update total amount of invoice
  const lines = await db.query.invoiceLines.findMany({
    where: eq(invoiceLines.invoiceId, invoice.id),
  });
  const totalAmount = lines.reduce((acc, line) => acc + Number(line.total), 0);
  await db
    .update(invoices)
    .set({ totalAmount: totalAmount.toString() })
    .where(eq(invoices.id, invoice.id));
}

async function seedAuditLogs(ownerId: string, projectId: string) {
  const existing = await db.query.auditLogs.findFirst({
    where: and(
      eq(auditLogs.actorId, ownerId),
      eq(auditLogs.action, "PROJECT_SEEDED"),
      eq(auditLogs.entity, "project"),
      eq(auditLogs.entityId, projectId),
    ),
  });

  if (existing) {
    return;
  }

  await db.insert(auditLogs).values({
    actorId: ownerId,
    action: "PROJECT_SEEDED",
    entity: "project",
    entityId: projectId,
  });
}

export async function seedDev() {
  const core = await seedCore();

  await seedPasswordResetTokens(core.owner.id);
  await seedInvitations(core.organization.id);
  await seedSessions(core.owner.id);
  await seedPresences(core.collaborator.id);
  await seedInvoicesAndLines({
    collaboratorId: core.collaborator.id,
    projectId: core.project.id,
  });
  await seedAuditLogs(core.owner.id, core.project.id);

  return core;
}
