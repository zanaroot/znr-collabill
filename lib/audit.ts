"server only";

import {
  type AuditAction,
  type AuditEntity,
  createAuditLog,
} from "@/http/repositories/audit.repository";

export const logAudit = async (data: {
  organizationId: string;
  actorId?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    await createAuditLog(data);
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};
