import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  leaveBalances,
  leaveRequests,
  organizations,
  presences,
} from "@/db/schema";
import type {
  CreateLeaveRequest,
  LeaveRequestStatus,
} from "../models/leave.model";

export const findLeaveRequestsByUserId = async (
  userId: string,
  organizationId: string,
) => {
  return db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.organizationId, organizationId),
      ),
    )
    .orderBy(sql`${leaveRequests.startDate} DESC`);
};

export const findLeaveRequestsByOrganizationId = async (
  organizationId: string,
) => {
  return db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.organizationId, organizationId))
    .orderBy(sql`${leaveRequests.startDate} DESC`);
};

export const createLeaveRequest = async (
  userId: string,
  organizationId: string,
  data: CreateLeaveRequest,
) => {
  const [request] = await db
    .insert(leaveRequests)
    .values({
      userId,
      organizationId,
      ...data,
    })
    .returning();
  return request;
};

export const findLeaveRequestById = async (id: string) => {
  const [request] = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.id, id));
  return request;
};

export const updateLeaveRequestStatus = async (
  id: string,
  status: LeaveRequestStatus,
  approvedBy: string,
) => {
  return await db.transaction(async (tx) => {
    const [request] = await tx
      .update(leaveRequests)
      .set({
        status,
        approvedBy: status === "APPROVED" ? approvedBy : null,
        approvedAt: status === "APPROVED" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(leaveRequests.id, id))
      .returning();

    if (status === "APPROVED") {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d).toISOString().split("T")[0]);
      }

      for (const date of days) {
        await tx
          .insert(presences)
          .values({
            userId: request.userId,
            organizationId: request.organizationId,
            date,
            status: "ON_LEAVE",
          })
          .onConflictDoUpdate({
            target: [
              presences.userId,
              presences.date,
              presences.organizationId,
            ],
            set: { status: "ON_LEAVE" },
          });
      }

      await updateLeaveBalanceOnApproval(
        request.userId,
        request.organizationId,
        request.startDate,
        request.endDate,
        request.type,
      );
    }

    return request;
  });
};

export const findLeaveBalance = async (
  userId: string,
  organizationId: string,
  month: number,
  year: number,
) => {
  const [balance] = await db
    .select()
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.organizationId, organizationId),
        eq(leaveBalances.month, month),
        eq(leaveBalances.year, year),
      ),
    );
  return balance;
};

export const updateOrganizationLeaveSettings = async (
  organizationId: string,
  data: {
    unusedLeavePolicy: "CARRY_OVER" | "PAID_AS_WORKED";
    adminLeaveQuota: string;
    collaboratorLeaveQuota: string;
  },
) => {
  const [org] = await db
    .update(organizations)
    .set({
      ...data,
    })
    .where(eq(organizations.id, organizationId))
    .returning();
  return org;
};

export const checkOverlappingRequests = async (
  userId: string,
  organizationId: string,
  startDate: string,
  endDate: string,
) => {
  const overlapping = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.organizationId, organizationId),
        or(
          eq(leaveRequests.status, "APPROVED"),
          eq(leaveRequests.status, "PENDING"),
        ),
        or(
          and(
            gte(leaveRequests.startDate, startDate),
            lte(leaveRequests.startDate, endDate),
          ),
          and(
            gte(leaveRequests.endDate, startDate),
            lte(leaveRequests.endDate, endDate),
          ),
        ),
      ),
    );
  return overlapping.length > 0;
};

export const calculateLeaveDays = (
  startDate: string,
  endDate: string,
  type: "FULL_DAY" | "HALF_DAY_AM" | "HALF_DAY_PM",
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (type === "FULL_DAY") {
    return totalDays;
  }
  return totalDays * 0.5;
};

export const getUserQuota = async (
  userId: string,
  organizationId: string,
): Promise<{ quota: number; role: string } | null> => {
  const orgRepo = await import("@/http/repositories/organization.repository");
  const org = await orgRepo.getOrganizationById(organizationId);

  if (!org) return null;

  const memberRepo = await import("@/http/repositories/user.repository");
  const member = await memberRepo.findOrganizationMember(
    organizationId,
    userId,
  );

  if (!member) return null;

  const quota =
    member.role === "ADMIN" || member.role === "OWNER"
      ? parseFloat(org.adminLeaveQuota)
      : parseFloat(org.collaboratorLeaveQuota);

  return { quota, role: member.role };
};

export const validateLeaveBalance = async (
  userId: string,
  organizationId: string,
  startDate: string,
  endDate: string,
  type: "FULL_DAY" | "HALF_DAY_AM" | "HALF_DAY_PM",
): Promise<{ valid: boolean; error?: string; remaining?: number }> => {
  const quotaInfo = await getUserQuota(userId, organizationId);
  if (!quotaInfo) {
    return { valid: false, error: "Organization not found" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const startMonth = start.getMonth() + 1;
  const startYear = start.getFullYear();
  const endMonth = end.getMonth() + 1;
  const endYear = end.getFullYear();

  const requestedDays = calculateLeaveDays(startDate, endDate, type);

  if (startYear === endYear && startMonth === endMonth) {
    const balance = await findLeaveBalance(
      userId,
      organizationId,
      startMonth,
      startYear,
    );

    const remaining = balance ? parseFloat(balance.remaining) : quotaInfo.quota;

    if (requestedDays > remaining) {
      return {
        valid: false,
        error: `Insufficient leave balance. You have ${remaining} days remaining but requested ${requestedDays} days.`,
        remaining,
      };
    }
  } else {
    let totalRemaining = 0;
    const months: { month: number; year: number; days: number }[] = [];

    const current = new Date(start);
    while (current <= end) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();

      let daysInRequest = 0;
      if (months.length === 0) {
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        daysInRequest = lastDayOfMonth - start.getDate() + 1;
      } else if (current.getTime() === end.getTime()) {
        daysInRequest = end.getDate();
      } else {
        daysInRequest = new Date(year, month, 0).getDate();
      }

      months.push({ month, year, daysInRequest });
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }

    for (let i = 0; i < months.length; i++) {
      const { month, year, daysInRequest } = months[i];
      const balance = await findLeaveBalance(
        userId,
        organizationId,
        month,
        year,
      );

      let monthQuota: number;
      if (balance) {
        monthQuota = parseFloat(balance.remaining);
      } else {
        monthQuota = quotaInfo.quota;
      }

      const requestDaysForMonth =
        i === 0 || i === months.length - 1
          ? daysInRequest * (type === "FULL_DAY" ? 1 : 0.5)
          : type === "FULL_DAY"
            ? daysInRequest
            : daysInRequest * 0.5;

      totalRemaining += monthQuota;

      if (monthQuota < requestDaysForMonth) {
        return {
          valid: false,
          error: `Insufficient leave balance for ${year}-${String(month).padStart(2, "0")}. You have ${monthQuota} days remaining but need ${requestDaysForMonth} days.`,
          remaining: totalRemaining,
        };
      }
    }
  }

  return { valid: true };
};

export const initializeMonthlyBalance = async (
  userId: string,
  organizationId: string,
  month: number,
  year: number,
): Promise<void> => {
  const quotaInfo = await getUserQuota(userId, organizationId);
  if (!quotaInfo) return;

  const existing = await findLeaveBalance(userId, organizationId, month, year);
  if (existing) return;

  await db.insert(leaveBalances).values({
    userId,
    organizationId,
    month,
    year,
    balance: quotaInfo.quota.toString(),
    used: "0",
    remaining: quotaInfo.quota.toString(),
  });
};

export const initializeOrGetBalance = async (
  userId: string,
  organizationId: string,
  month: number,
  year: number,
) => {
  let balance = await findLeaveBalance(userId, organizationId, month, year);

  if (!balance) {
    await initializeMonthlyBalance(userId, organizationId, month, year);
    balance = await findLeaveBalance(userId, organizationId, month, year);
  }

  return balance;
};

export const updateLeaveBalanceOnApproval = async (
  userId: string,
  organizationId: string,
  startDate: string,
  endDate: string,
  type: "FULL_DAY" | "HALF_DAY_AM" | "HALF_DAY_PM",
): Promise<void> => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = calculateLeaveDays(startDate, endDate, type);

  const startMonth = start.getMonth() + 1;
  const startYear = start.getFullYear();
  const endMonth = end.getMonth() + 1;
  const endYear = end.getFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    const balance = await initializeOrGetBalance(
      userId,
      organizationId,
      startMonth,
      startYear,
    );
    if (balance) {
      const newUsed = (parseFloat(balance.used) + days).toString();
      const newRemaining = (
        parseFloat(balance.balance) - parseFloat(newUsed)
      ).toString();

      await db
        .update(leaveBalances)
        .set({
          used: newUsed,
          remaining: newRemaining,
          updatedAt: new Date(),
        })
        .where(eq(leaveBalances.id, balance.id));
    }
  } else {
    const months: { month: number; year: number }[] = [];
    const current = new Date(start);
    while (current <= end) {
      months.push({
        month: current.getMonth() + 1,
        year: current.getFullYear(),
      });
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }

    for (let i = 0; i < months.length; i++) {
      const { month, year } = months[i];
      const balance = await initializeOrGetBalance(
        userId,
        organizationId,
        month,
        year,
      );

      if (!balance) continue;

      let daysInMonth = 0;
      if (months.length === 1) {
        daysInMonth = days;
      } else if (i === 0) {
        const lastDay = new Date(year, month, 0).getDate();
        daysInMonth = lastDay - start.getDate() + 1;
        if (type !== "FULL_DAY") daysInMonth *= 0.5;
      } else if (i === months.length - 1) {
        daysInMonth = end.getDate();
        if (type !== "FULL_DAY") daysInMonth *= 0.5;
      } else {
        daysInMonth = new Date(year, month, 0).getDate();
        if (type !== "FULL_DAY") daysInMonth *= 0.5;
      }

      const newUsed = (parseFloat(balance.used) + daysInMonth).toString();
      const newRemaining = (
        parseFloat(balance.balance) - parseFloat(newUsed)
      ).toString();

      await db
        .update(leaveBalances)
        .set({
          used: newUsed,
          remaining: newRemaining,
          updatedAt: new Date(),
        })
        .where(eq(leaveBalances.id, balance.id));
    }
  }
};

export const getUnusedLeaveForPeriod = async (
  organizationId: string,
  userId: string,
  year: number,
): Promise<number> => {
  const balances = await db
    .select()
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.organizationId, organizationId),
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.year, year),
      ),
    );

  let totalUnused = 0;
  for (const balance of balances) {
    totalUnused += parseFloat(balance.remaining);
  }

  return totalUnused;
};
