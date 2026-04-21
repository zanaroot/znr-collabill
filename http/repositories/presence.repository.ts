"server only";

import { and, count, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  collaboratorRates,
  organizationMembers,
  presences,
  users,
} from "@/db/schema";
import type { PresenceStatusValue } from "@/http/models/presence.model";
import { getISODate } from "@/lib/date";
import { wrapRepositoryWithSentry } from "../utils/wrap-with-sentry/wrap-repository-with-sentry";

export const findPresenceByUserIdAndDate = async (
  userId: string,
  organizationId: string,
  date: string,
) => {
  const [presence] = await db
    .select()
    .from(presences)
    .where(
      and(
        eq(presences.userId, userId),
        eq(presences.organizationId, organizationId),
        eq(presences.date, date),
      ),
    )
    .limit(1);

  return presence ?? null;
};

export const markPresence = async (
  userId: string,
  organizationId: string,
  status: PresenceStatusValue = "OFFICE",
  date: string = getISODate(),
) => {
  const [presence] = await db
    .insert(presences)
    .values({
      userId,
      organizationId,
      date,
      status,
      checkInAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [presences.userId, presences.date, presences.organizationId],
      set: {
        status,
        updatedAt: new Date(),
      },
    })
    .returning();

  return presence;
};

export const checkOut = async (
  userId: string,
  organizationId: string,
  date: string = getISODate(),
) => {
  const [presence] = await db
    .update(presences)
    .set({
      checkOutAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(presences.userId, userId),
        eq(presences.organizationId, organizationId),
        eq(presences.date, date),
      ),
    )
    .returning();

  return presence ?? null;
};

export const findRecentPresences = async (
  userId: string,
  organizationId: string,
  limit = 5,
) => {
  return await db.query.presences.findMany({
    where: and(
      eq(presences.userId, userId),
      eq(presences.organizationId, organizationId),
    ),
    orderBy: (presences, { desc }) => [desc(presences.date)],
    limit,
  });
};

export const getPresenceSummaryByOrganization = async (
  userId: string,
  organizationId: string,
  targetUserId?: string,
  startDate?: string,
  endDate?: string,
) => {
  const presenceFilters = [
    eq(users.id, presences.userId),
    eq(presences.organizationId, organizationId),
  ];

  if (startDate) {
    presenceFilters.push(gte(presences.date, startDate));
  }

  if (endDate) {
    presenceFilters.push(lte(presences.date, endDate));
  }

  return await db
    .select({
      userId: users.id,
      userName: users.name,
      dailyRate: collaboratorRates.dailyRate,
      presenceCount: count(presences.id),
    })
    .from(users)
    .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .leftJoin(
      collaboratorRates,
      and(
        eq(users.id, collaboratorRates.userId),
        eq(collaboratorRates.organizationId, organizationId),
      ),
    )
    .leftJoin(presences, and(...presenceFilters))
    .where(
      and(
        eq(organizationMembers.userId, targetUserId ?? userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .groupBy(users.id, collaboratorRates.dailyRate);
};

export const presenceRepository = {
  findPresenceByUserIdAndDate,
  markPresence,
  checkOut,
  findRecentPresences,
  getPresenceSummaryByOrganization,
};

export const presenceRepositoryWithSentry = wrapRepositoryWithSentry(
  presenceRepository as Record<
    string,
    (...args: unknown[]) => Promise<unknown>
  >,
  "presence-repository",
) as typeof presenceRepository;
