"server only";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
import type { AuthUser } from "@/http/models/auth.model";
import { findValidSessionByToken } from "@/http/repositories/session.repository";

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) return null;

  const result = await findValidSessionByToken(token);
  if (!result) return null;

  let organizationRole: "OWNER" | "ADMIN" | "COLLABORATOR" | null = null;
  if (result.session.organizationId) {
    const members = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, result.session.organizationId),
          eq(organizationMembers.userId, result.user.id),
        ),
      )
      .limit(1);
    organizationRole = members[0]?.role ?? null;
  }

  return {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    organizationId: result.organization?.id ?? null,
    organizationName: result.organization?.name ?? null,
    organizationRole,
  };
};
