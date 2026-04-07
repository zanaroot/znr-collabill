"server only";

import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "LOGIN"
  | "LOGOUT"
  | "REMOVE_ACCESS";

export type AuditEntity =
  | "USER"
  | "ORGANIZATION"
  | "PROJECT"
  | "TASK"
  | "INVOICE"
  | "INVITATION"
  | "SESSION"
  | "SETTINGS";

export const createAuditLog = async (data: {
  organizationId: string;
  actorId?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) => {
  const [log] = await db
    .insert(auditLogs)
    .values({
      organizationId: data.organizationId,
      actorId: data.actorId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    })
    .returning();
  return log;
};

export const getAuditLogs = async (
  organizationId: string,
  options?: {
    action?: AuditAction;
    entity?: AuditEntity;
    actorId?: string;
    entityId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
) => {
  const conditions = [eq(auditLogs.organizationId, organizationId)];

  if (options?.action) {
    conditions.push(eq(auditLogs.action, options.action));
  }
  if (options?.entity) {
    conditions.push(eq(auditLogs.entity, options.entity));
  }
  if (options?.actorId) {
    conditions.push(eq(auditLogs.actorId, options.actorId));
  }
  if (options?.entityId) {
    conditions.push(eq(auditLogs.entityId, options.entityId));
  }
  if (options?.search) {
    conditions.push(ilike(auditLogs.entity, `%${options.search}%`));
  }

  const query = db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt));

  if (options?.limit) {
    query.limit(options.limit);
  }
  if (options?.offset) {
    query.offset(options.offset);
  }

  return query;
};

export const countAuditLogs = async (
  organizationId: string,
  options?: {
    action?: AuditAction;
    entity?: AuditEntity;
    actorId?: string;
  },
) => {
  const conditions = [eq(auditLogs.organizationId, organizationId)];

  if (options?.action) {
    conditions.push(eq(auditLogs.action, options.action));
  }
  if (options?.entity) {
    conditions.push(eq(auditLogs.entity, options.entity));
  }
  if (options?.actorId) {
    conditions.push(eq(auditLogs.actorId, options.actorId));
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(and(...conditions));

  return result?.count ?? 0;
};

export const getAuditLogById = async (id: string, organizationId: string) => {
  const [log] = await db
    .select()
    .from(auditLogs)
    .where(
      and(eq(auditLogs.id, id), eq(auditLogs.organizationId, organizationId)),
    )
    .limit(1);

  return log ?? null;
};

export const deleteAuditLogsByOrganizationId = async (
  organizationId: string,
) => {
  await db
    .delete(auditLogs)
    .where(eq(auditLogs.organizationId, organizationId));
};
