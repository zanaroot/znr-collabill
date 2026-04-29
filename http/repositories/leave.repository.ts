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
      // Sync with presence
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

      // Update balances (simplified logic: should ideally be per month)
      // For now, let's just mark it as used.
      // In a real app, this would be more complex (handling cross-month requests)
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
        eq(leaveRequests.status, "APPROVED"),
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
