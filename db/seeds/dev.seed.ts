import { and, eq } from "drizzle-orm";
import { db } from "../index";
import {
  auditLogs,
  invitations,
  invoiceComments,
  invoiceLines,
  invoices,
  leaveRequests,
  passwordResetTokens,
  presences,
  sessions,
  taskComments,
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

async function seedSessions(ownerId: string, organizationId: string) {
  const token = "seed-session-token-owner";
  const existing = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
  });

  if (existing) {
    return;
  }

  await db.insert(sessions).values({
    userId: ownerId,
    organizationId,
    token,
    expiresAt: getExpiryDate(30),
  });
}

async function seedPresences(collaboratorId: string, organizationId: string) {
  const presenceData = [
    {
      date: "2026-02-10",
      status: "OFFICE" as const,
      checkIn: "08:55",
      checkOut: "17:30",
    },
    {
      date: "2026-02-11",
      status: "REMOTE" as const,
      checkIn: "09:00",
      checkOut: "17:15",
    },
    {
      date: "2026-02-12",
      status: "HALF_DAY" as const,
      checkIn: "08:30",
      checkOut: "18:00",
    },
    {
      date: "2026-03-03",
      status: "OFFICE" as const,
      checkIn: "09:00",
      checkOut: "17:00",
    },
    {
      date: "2026-03-04",
      status: "OFFICE" as const,
      checkIn: "08:50",
      checkOut: "17:20",
    },
    {
      date: "2026-03-05",
      status: "REMOTE" as const,
      checkIn: "09:10",
      checkOut: "17:00",
    },
    {
      date: "2026-03-06",
      status: "OFFICE" as const,
      checkIn: "09:00",
      checkOut: "17:45",
    },
    {
      date: "2026-03-07",
      status: "REMOTE" as const,
      checkIn: "08:45",
      checkOut: "17:30",
    },
  ];

  for (const p of presenceData) {
    const existing = await db.query.presences.findFirst({
      where: and(
        eq(presences.userId, collaboratorId),
        eq(presences.date, p.date),
        eq(presences.organizationId, organizationId),
      ),
    });

    if (!existing) {
      const checkInDate = new Date(`${p.date}T${p.checkIn}:00`);
      const checkOutDate = new Date(`${p.date}T${p.checkOut}:00`);

      await db.insert(presences).values({
        userId: collaboratorId,
        organizationId,
        date: p.date,
        status: p.status,
        checkInAt: checkInDate,
        checkOutAt: checkOutDate,
      });
    }
  }
}

async function seedLeaveRequests(
  collaboratorId: string,
  adminId: string,
  organizationId: string,
) {
  const existingCount = await db.$count(
    leaveRequests,
    eq(leaveRequests.userId, collaboratorId),
  );

  if (existingCount > 0) {
    return;
  }

  await db.insert(leaveRequests).values([
    {
      userId: collaboratorId,
      organizationId,
      startDate: "2026-02-17",
      endDate: "2026-02-18",
      type: "FULL_DAY",
      status: "APPROVED",
      reason: "Medical appointment",
      approvedBy: adminId,
      approvedAt: new Date("2026-02-10"),
    },
    {
      userId: collaboratorId,
      organizationId,
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      type: "FULL_DAY",
      status: "PENDING",
      reason: "Personal days",
    },
  ]);
}

async function seedTaskComments(input: {
  collaboratorId: string;
  adminId: string;
  projectId: string;
}) {
  const existingCount = await db.$count(
    taskComments,
    eq(taskComments.userId, input.collaboratorId),
  );

  if (existingCount > 0) {
    return;
  }

  const projectTasks = await db.query.tasks.findMany({
    where: eq(tasks.projectId, input.projectId),
  });

  for (const task of projectTasks) {
    const commentData: Array<{
      taskId: string;
      userId: string;
      content: string;
    }> = [];

    if (task.status === "TODO") {
      commentData.push({
        taskId: task.id,
        userId: input.collaboratorId,
        content: "I'll start working on this next sprint.",
      });
    }

    if (task.status === "IN_PROGRESS") {
      commentData.push(
        {
          taskId: task.id,
          userId: input.collaboratorId,
          content: "Progress is going well. About 60% done.",
        },
        {
          taskId: task.id,
          userId: input.adminId,
          content: "Looks good. Keep me posted on blockers.",
        },
      );
    }

    if (task.status === "VALIDATED") {
      commentData.push(
        {
          taskId: task.id,
          userId: input.adminId,
          content: "Reviewed and approved. Great work!",
        },
        {
          taskId: task.id,
          userId: input.collaboratorId,
          content: "Thanks for the review!",
        },
      );
    }

    if (commentData.length > 0) {
      await db.insert(taskComments).values(commentData);
    }
  }
}

async function seedInvoicesAndLines(input: {
  collaboratorId: string;
  ownerId: string;
  adminId: string;
  projectId: string;
  organizationId: string;
}) {
  const collaboratorRate = "400";

  const febInvoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.userId, input.collaboratorId),
      eq(invoices.periodStart, "2026-02-01"),
      eq(invoices.periodEnd, "2026-02-28"),
    ),
  });

  let febTotal = 0;
  if (!febInvoice) {
    const presenceTotal = 3 * parseInt(collaboratorRate, 10);
    const taskTotal = 1 * parseInt(collaboratorRate, 10);
    febTotal = presenceTotal + taskTotal;

    const [created] = await db
      .insert(invoices)
      .values({
        organizationId: input.organizationId,
        userId: input.collaboratorId,
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        status: "PAID",
        totalAmount: febTotal.toString(),
        validatedAt: new Date("2026-03-05"),
        paidAt: new Date("2026-03-10"),
        note: "February 2026 invoice - 3 presence days + 1 validated task",
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create seed invoice.");
    }

    await db.insert(invoiceLines).values([
      {
        invoiceId: created.id,
        type: "PRESENCE",
        label: "Presence days (Feb 10-12)",
        quantity: 3,
        unitPrice: collaboratorRate,
        total: presenceTotal.toString(),
      },
      {
        invoiceId: created.id,
        type: "TASK",
        label: "Validated task: Implement first feature",
        quantity: 1,
        unitPrice: collaboratorRate,
        total: taskTotal.toString(),
      },
    ]);

    await db.insert(invoiceComments).values([
      {
        invoiceId: created.id,
        userId: input.ownerId,
        content: "Invoice received. Reviewing line items.",
        createdAt: new Date("2026-03-01"),
      },
      {
        invoiceId: created.id,
        userId: input.adminId,
        content: "All presence days and task validated. Approved for payment.",
        createdAt: new Date("2026-03-05"),
      },
    ]);
  }

  const janInvoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.userId, input.collaboratorId),
      eq(invoices.periodStart, "2026-01-01"),
      eq(invoices.periodEnd, "2026-01-31"),
    ),
  });

  if (!janInvoice) {
    const janTotal = 2 * parseInt(collaboratorRate, 10);

    const [created] = await db
      .insert(invoices)
      .values({
        organizationId: input.organizationId,
        userId: input.collaboratorId,
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        status: "VALIDATED",
        totalAmount: janTotal.toString(),
        validatedAt: new Date("2026-02-05"),
        note: "January 2026 invoice - 2 presence days",
      })
      .returning();

    if (created) {
      await db.insert(invoiceLines).values({
        invoiceId: created.id,
        type: "PRESENCE",
        label: "Presence days (Jan 15-16)",
        quantity: 2,
        unitPrice: collaboratorRate,
        total: janTotal.toString(),
      });

      await db.insert(invoiceComments).values({
        invoiceId: created.id,
        userId: input.ownerId,
        content: "Invoice validated. Payment scheduled for next week.",
        createdAt: new Date("2026-02-05"),
      });
    }
  }

  const marInvoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.userId, input.collaboratorId),
      eq(invoices.periodStart, "2026-03-01"),
      eq(invoices.periodEnd, "2026-03-31"),
    ),
  });

  if (!marInvoice) {
    const [created] = await db
      .insert(invoices)
      .values({
        organizationId: input.organizationId,
        userId: input.collaboratorId,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        status: "DRAFT",
        totalAmount: "0",
        note: "March 2026 invoice - work in progress",
      })
      .returning();

    if (created) {
      await db.insert(invoiceLines).values({
        invoiceId: created.id,
        type: "PRESENCE",
        label: "Presence days (Mar 3-7)",
        quantity: 5,
        unitPrice: collaboratorRate,
        total: "2000",
      });
    }
  }
}

async function seedAuditLogs(
  ownerId: string,
  adminId: string,
  collaboratorId: string,
  projectId: string,
  organizationId: string,
) {
  const logEntries = [
    {
      organizationId,
      actorId: ownerId,
      action: "ORGANIZATION_CREATED",
      entity: "organization",
      entityId: organizationId,
    },
    {
      organizationId,
      actorId: ownerId,
      action: "PROJECT_CREATED",
      entity: "project",
      entityId: projectId,
    },
    {
      organizationId,
      actorId: adminId,
      action: "MEMBER_INVITED",
      entity: "organization",
      entityId: organizationId,
      metadata: JSON.stringify({ invitedUser: collaboratorId }),
    },
  ];

  for (const entry of logEntries) {
    const existing = await db.query.auditLogs.findFirst({
      where: and(
        eq(auditLogs.actorId, entry.actorId),
        eq(auditLogs.action, entry.action),
        eq(auditLogs.entity, entry.entity),
        eq(auditLogs.entityId, entry.entityId),
      ),
    });

    if (!existing) {
      await db.insert(auditLogs).values(entry);
    }
  }
}

export const seedDev = async () => {
  const core = await seedCore();

  await seedPasswordResetTokens(core.owner.id);
  await seedInvitations(core.organization.id);
  await seedSessions(core.owner.id, core.organization.id);
  await seedPresences(core.collaborator.id, core.organization.id);
  await seedLeaveRequests(
    core.collaborator.id,
    core.admin.id,
    core.organization.id,
  );
  await seedInvoicesAndLines({
    collaboratorId: core.collaborator.id,
    ownerId: core.owner.id,
    adminId: core.admin.id,
    projectId: core.project.id,
    organizationId: core.organization.id,
  });
  await seedTaskComments({
    collaboratorId: core.collaborator.id,
    adminId: core.admin.id,
    projectId: core.project.id,
  });
  await seedAuditLogs(
    core.owner.id,
    core.admin.id,
    core.collaborator.id,
    core.project.id,
    core.organization.id,
  );

  return core;
};
