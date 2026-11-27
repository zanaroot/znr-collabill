"server only";

import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  callParticipants,
  calls,
  invoiceComments,
  invoices,
  leaveRequests,
  meetingInvitations,
  meetingParticipants,
  meetings,
  organizationMembers,
  organizations,
  presences,
  projectFiles,
  projectMembers,
  projects,
  taskComments,
  tasks,
  users,
} from "@/db/schema";
import {
  subscriptionAdminNotes,
  subscriptionEvents,
  subscriptionPayments,
  subscriptions,
} from "@/db/schema/subscription";
import type { ListUsersQuery } from "@/http/models/back-office.model";

type UserDeletionBlocker =
  | "organization_ownership"
  | "invoices"
  | "comments"
  | "project_files"
  | "attendance"
  | "leave_requests"
  | "calls";

type UserDeletionResult =
  | { status: "not_found" }
  | { status: "blocked"; blockers: UserDeletionBlocker[] }
  | { status: "deleted"; avatarUrl: string | null };

type OrganizationDeletionBlocker =
  | "financial_records"
  | "project_files"
  | "attendance"
  | "leave_history"
  | "calls";

type OrganizationDeletionResult =
  | { status: "not_found" }
  | { status: "blocked"; blockers: OrganizationDeletionBlocker[] }
  | { status: "deleted" };

export const listUsersForAdmin = async (filters: ListUsersQuery) => {
  const search = filters.search
    ? or(
        ilike(users.name, `%${filters.search}%`),
        ilike(users.email, `%${filters.search}%`),
      )
    : undefined;

  const [totalRow] = await db
    .select({ value: count() })
    .from(users)
    .where(search);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      platformRole: users.platformRole,
      createdAt: users.createdAt,
      organizationCount: count(organizationMembers.organizationId),
    })
    .from(users)
    .leftJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .where(search)
    .groupBy(
      users.id,
      users.name,
      users.email,
      users.platformRole,
      users.createdAt,
    )
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(filters.pageSize)
    .offset((filters.page - 1) * filters.pageSize);

  return { rows, total: Number(totalRow?.value ?? 0) };
};

export const deleteUserForAdmin = async (
  userId: string,
  actorId: string,
): Promise<UserDeletionResult> =>
  db.transaction(async (tx) => {
    const [user] = await tx
      .select({ id: users.id, avatar: users.avatar })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");

    if (!user) return { status: "not_found" };

    const blockers: UserDeletionBlocker[] = [];
    const ownership = await tx
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.role, "OWNER"),
        ),
      )
      .limit(1);
    if (ownership.length > 0) blockers.push("organization_ownership");

    const userInvoices = await tx
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .limit(1);
    if (userInvoices.length > 0) blockers.push("invoices");

    const userTaskComments = await tx
      .select({ id: taskComments.id })
      .from(taskComments)
      .where(eq(taskComments.userId, userId))
      .limit(1);
    const userInvoiceComments = await tx
      .select({ id: invoiceComments.id })
      .from(invoiceComments)
      .where(eq(invoiceComments.userId, userId))
      .limit(1);
    if (userTaskComments.length > 0 || userInvoiceComments.length > 0) {
      blockers.push("comments");
    }

    const userProjectFiles = await tx
      .select({ id: projectFiles.id })
      .from(projectFiles)
      .where(eq(projectFiles.uploadedBy, userId))
      .limit(1);
    if (userProjectFiles.length > 0) blockers.push("project_files");

    const userAttendance = await tx
      .select({ id: presences.id })
      .from(presences)
      .where(eq(presences.userId, userId))
      .limit(1);
    if (userAttendance.length > 0) blockers.push("attendance");

    const userLeaveRequests = await tx
      .select({ id: leaveRequests.id })
      .from(leaveRequests)
      .where(eq(leaveRequests.userId, userId))
      .limit(1);
    if (userLeaveRequests.length > 0) blockers.push("leave_requests");

    const initiatedCalls = await tx
      .select({ id: calls.id })
      .from(calls)
      .where(eq(calls.initiatedBy, userId))
      .limit(1);
    if (initiatedCalls.length > 0) blockers.push("calls");

    if (blockers.length > 0) return { status: "blocked", blockers };

    await tx.delete(projectMembers).where(eq(projectMembers.userId, userId));
    await tx
      .update(tasks)
      .set({ assignedTo: null })
      .where(eq(tasks.assignedTo, userId));
    await tx
      .update(tasks)
      .set({ validatedBy: null })
      .where(eq(tasks.validatedBy, userId));
    await tx
      .update(tasks)
      .set({ reviewerId: null })
      .where(eq(tasks.reviewerId, userId));
    await tx
      .update(projects)
      .set({ createdBy: null })
      .where(eq(projects.createdBy, userId));
    await tx
      .update(auditLogs)
      .set({ actorId: null })
      .where(eq(auditLogs.actorId, userId));
    await tx
      .update(presences)
      .set({ createdBy: null })
      .where(eq(presences.createdBy, userId));
    await tx
      .update(leaveRequests)
      .set({ approvedBy: null })
      .where(eq(leaveRequests.approvedBy, userId));
    await tx
      .update(meetings)
      .set({ createdBy: null })
      .where(eq(meetings.createdBy, userId));
    await tx
      .update(meetingInvitations)
      .set({ inviteeUserId: null })
      .where(eq(meetingInvitations.inviteeUserId, userId));
    await tx
      .update(meetingParticipants)
      .set({ userId: null })
      .where(eq(meetingParticipants.userId, userId));
    await tx
      .update(callParticipants)
      .set({ userId: null })
      .where(eq(callParticipants.userId, userId));

    await tx.insert(auditLogs).values({
      organizationId: null,
      actorId,
      action: "DELETE",
      entity: "USER",
      entityId: userId,
    });

    await tx.delete(users).where(eq(users.id, userId));
    return { status: "deleted", avatarUrl: user.avatar };
  });

export const deleteOrganizationForAdmin = async (
  organizationId: string,
  actorId: string,
): Promise<OrganizationDeletionResult> =>
  db.transaction(async (tx) => {
    const [organization] = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .for("update");

    if (!organization) return { status: "not_found" };

    const blockers: OrganizationDeletionBlocker[] = [];
    const [orgInvoices, orgSubscriptions, orgEvents, orgPayments, orgNotes] =
      await Promise.all([
        tx
          .select({ id: invoices.id })
          .from(invoices)
          .where(eq(invoices.organizationId, organizationId))
          .limit(1),
        tx
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(eq(subscriptions.organizationId, organizationId))
          .limit(1),
        tx
          .select({ id: subscriptionEvents.id })
          .from(subscriptionEvents)
          .where(eq(subscriptionEvents.organizationId, organizationId))
          .limit(1),
        tx
          .select({ id: subscriptionPayments.id })
          .from(subscriptionPayments)
          .where(eq(subscriptionPayments.organizationId, organizationId))
          .limit(1),
        tx
          .select({ id: subscriptionAdminNotes.id })
          .from(subscriptionAdminNotes)
          .where(eq(subscriptionAdminNotes.organizationId, organizationId))
          .limit(1),
      ]);
    if (
      orgInvoices.length > 0 ||
      orgSubscriptions.length > 0 ||
      orgEvents.length > 0 ||
      orgPayments.length > 0 ||
      orgNotes.length > 0
    ) {
      blockers.push("financial_records");
    }

    const orgProjects = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, organizationId))
      .for("update");
    const projectIds = orgProjects.map((project) => project.id);

    if (projectIds.length > 0) {
      const files = await tx
        .select({ id: projectFiles.id })
        .from(projectFiles)
        .where(inArray(projectFiles.projectId, projectIds))
        .limit(1);
      if (files.length > 0) blockers.push("project_files");
    }

    const [orgAttendance, orgLeave, orgCalls] = await Promise.all([
      tx
        .select({ id: presences.id })
        .from(presences)
        .where(eq(presences.organizationId, organizationId))
        .limit(1),
      tx
        .select({ id: leaveRequests.id })
        .from(leaveRequests)
        .where(eq(leaveRequests.organizationId, organizationId))
        .limit(1),
      tx
        .select({ id: calls.id })
        .from(calls)
        .where(eq(calls.organizationId, organizationId))
        .limit(1),
    ]);
    if (orgAttendance.length > 0) blockers.push("attendance");
    if (orgLeave.length > 0) blockers.push("leave_history");
    if (orgCalls.length > 0) blockers.push("calls");

    if (blockers.length > 0) return { status: "blocked", blockers };

    await tx
      .update(auditLogs)
      .set({ organizationId: null })
      .where(eq(auditLogs.organizationId, organizationId));
    await tx
      .update(meetings)
      .set({ organizationId: null })
      .where(eq(meetings.organizationId, organizationId));

    if (projectIds.length > 0) {
      await tx
        .delete(projectMembers)
        .where(inArray(projectMembers.projectId, projectIds));
    }

    await tx.insert(auditLogs).values({
      organizationId: null,
      actorId,
      action: "DELETE",
      entity: "ORGANIZATION",
      entityId: organizationId,
    });

    await tx.delete(organizations).where(eq(organizations.id, organizationId));
    return { status: "deleted" };
  });
