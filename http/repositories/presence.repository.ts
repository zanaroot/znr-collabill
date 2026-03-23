"server only";

import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  collaboratorRates,
  organizationMembers,
  presences,
  users,
} from "@/db/schema";
import type { PresenceStatusValue } from "@/http/models/presence.model";
import { getISODate } from "@/lib/date";

export const findPresenceByUserIdAndDate = async (
  userId: string,
  date: string,
) => {
  const [presence] = await db
    .select()
    .from(presences)
    .where(and(eq(presences.userId, userId), eq(presences.date, date)))
    .limit(1);

  return presence ?? null;
};

export const markPresence = async (
  userId: string,
  status: PresenceStatusValue = "OFFICE",
  date: string = getISODate(),
) => {
  const [presence] = await db
    .insert(presences)
    .values({
      userId,
      date,
      status,
      checkInAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [presences.userId, presences.date],
      set: {
        status,
        updatedAt: new Date(),
      },
    })
    .returning();

  return presence;
};

export const checkOut = async (userId: string, date: string = getISODate()) => {
  const [presence] = await db
    .update(presences)
    .set({
      checkOutAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(presences.userId, userId), eq(presences.date, date)))
    .returning();

  return presence ?? null;
};

export const findRecentPresences = async (userId: string, limit = 5) => {
  return await db.query.presences.findMany({
    where: eq(presences.userId, userId),
    orderBy: (presences, { desc }) => [desc(presences.date)],
    limit,
  });
};

export const getPresenceSummaryByOrganization = async (
  userId: string,
  organizationId: string,
  targetUserId?: string,
) =>
  await db
    .select({
      userId: users.id,
      userName: users.name,
      dailyRate: collaboratorRates.dailyRate,
      presenceCount: count(presences.id),
    })
    .from(users)
    .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .leftJoin(collaboratorRates, eq(users.id, collaboratorRates.userId))
    .leftJoin(presences, eq(users.id, presences.userId))
    .where(
      and(
        eq(organizationMembers.userId, targetUserId ?? userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .groupBy(users.id, collaboratorRates.dailyRate);
