import { endOfDay, parse, startOfDay } from "date-fns";
import { and, eq } from "drizzle-orm";
import { createFactory } from "hono/factory";

import { db } from "@/db";
import { userRoles } from "@/db/schema/user";
import type { AuthEnv } from "@/http/models/auth.model";
import { findInvoiceByPeriodAndUser } from "@/http/repositories/invoice.repository";
import { getPresenceSummaryByOrganization } from "@/http/repositories/presence.repository";
import {
  getValidatedTaskSummaryByOrganization,
  getValidatedTaskSummaryByReviewer,
} from "@/http/repositories/task.repository";
import { calculateEstimatedInvoice } from "@/lib/incoices/invoice-calculation";
import { getCurrentPeriod } from "@/lib/periods";
import { dashboardRepository } from "../repositories/dashboard-repository";

const factory = createFactory<AuthEnv>();

export const getDashboardStatistics = factory.createHandlers(async (c) => {
  const user = c.get("user");
  const { userId } = c.req.query();

  if (!user.organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  let targetUserId = user.id;

  if (user.organizationRole === "OWNER" && userId) {
    const member = await db
      .select({
        userId: userRoles.userId,
      })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.organizationId, user.organizationId),
        ),
      )
      .limit(1);

    if (!member.length) {
      return c.json(
        {
          error: "User does not belong to your organization",
        },
        403,
      );
    }

    targetUserId = userId;
  }

  const currentPeriod = getCurrentPeriod();
  const periodStart = startOfDay(
    parse(currentPeriod.startDate, "yyyy-MM-dd", new Date()),
  );
  const periodEnd = endOfDay(
    parse(currentPeriod.endDate, "yyyy-MM-dd", new Date()),
  );

  const statistics = await dashboardRepository.getStatistics(
    user.organizationId,
    targetUserId,
    periodStart,
    periodEnd,
  );

  return c.json(statistics);
});

export const getDashboardNewTickets = factory.createHandlers(async (c) => {
  const user = c.get("user");
  const { userId } = c.req.query();

  if (!user.organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  let targetUserId = user.id;

  if (user.organizationRole === "OWNER" && userId) {
    const member = await db
      .select({
        userId: userRoles.userId,
      })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.organizationId, user.organizationId),
        ),
      )
      .limit(1);

    if (!member.length) {
      return c.json(
        {
          error: "User does not belong to your organization",
        },
        403,
      );
    }

    targetUserId = userId;
  }

  const result = await dashboardRepository.getNewTickets(
    user.organizationId,
    targetUserId,
  );

  return c.json(result);
});

export const getDashboardImportantTickets = factory.createHandlers(
  async (c) => {
    const user = c.get("user");
    const { userId } = c.req.query();

    if (!user.organizationId) {
      return c.json({ error: "No organization found" }, 404);
    }

    let targetUserId = user.id;

    if (user.organizationRole === "OWNER" && userId) {
      const member = await db
        .select({
          userId: userRoles.userId,
        })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.organizationId, user.organizationId),
          ),
        )
        .limit(1);

      if (!member.length) {
        return c.json(
          {
            error: "User does not belong to your organization",
          },
          403,
        );
      }

      targetUserId = userId;
    }

    const result = await dashboardRepository.getImportantTickets(
      user.organizationId,
      targetUserId,
    );

    return c.json(result);
  },
);

export const getDashboardInvoiceEstimate = factory.createHandlers(async (c) => {
  const user = c.get("user");

  if (!user || !user.organizationId) {
    return c.json(
      {
        error: "Unauthorized",
      },
      401,
    );
  }

  const requestedUserId = c.req.query("userId");

  const isOwner = user.organizationRole === "OWNER";

  const targetUserId = isOwner && requestedUserId ? requestedUserId : user.id;

  const currentPeriod = getCurrentPeriod();

  const [presenceSummary, taskSummary, reviewerTaskSummary, existingInvoice] =
    await Promise.all([
      getPresenceSummaryByOrganization(
        user.id,
        user.organizationId,
        targetUserId,
        currentPeriod.startDate,
        currentPeriod.endDate,
      ),

      getValidatedTaskSummaryByOrganization(
        user.id,
        user.organizationId,
        targetUserId,
        currentPeriod.startDate ? new Date(currentPeriod.startDate) : undefined,
        currentPeriod.endDate ? new Date(currentPeriod.endDate) : undefined,
      ),

      getValidatedTaskSummaryByReviewer(
        targetUserId,
        user.organizationId,
        currentPeriod.startDate ? new Date(currentPeriod.startDate) : undefined,
        currentPeriod.endDate ? new Date(currentPeriod.endDate) : undefined,
      ),

      findInvoiceByPeriodAndUser(
        currentPeriod.startDate,
        currentPeriod.endDate,
        targetUserId,
        user.organizationId,
      ),
    ]);

  console.log("DASHBOARD INVOICE", {
    targetUserId,
    periodStart: currentPeriod.startDate,
    periodEnd: currentPeriod.endDate,
    existingInvoice: existingInvoice
      ? {
          id: existingInvoice.id,
          totalAmount: existingInvoice.totalAmount,
          status: existingInvoice.status,
        }
      : null,
  });

  if (existingInvoice) {
    return c.json({
      amount: Number(existingInvoice.totalAmount ?? 0),
      status: existingInvoice.status ?? "DRAFT",
      periodStart: currentPeriod.startDate,
      periodEnd: currentPeriod.endDate,
      source: "invoice",
    });
  }

  const filteredPresenceSummary = presenceSummary.filter(
    (presence) => presence.userId === targetUserId,
  );

  const estimate = calculateEstimatedInvoice({
    targetUserId,
    presenceData: filteredPresenceSummary,
    taskData: taskSummary,
    reviewerTaskData: reviewerTaskSummary,
  });

  return c.json({
    amount: estimate.totalAmount,
    status: "ESTIMATED",
    periodStart: currentPeriod.startDate,
    periodEnd: currentPeriod.endDate,
    source: "calculation",
  });
});
