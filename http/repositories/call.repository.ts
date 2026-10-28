"server only";

import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  type callParticipantStatusEnum,
  callParticipants,
  type callStatusEnum,
  calls,
  type callTypeEnum,
} from "@/db/schema";
import { getRingCutoff } from "@/lib/call-utils";

type CallStatusValue = (typeof callStatusEnum.enumValues)[number];
type CallTypeValue = (typeof callTypeEnum.enumValues)[number];
type CallParticipantStatusValue =
  (typeof callParticipantStatusEnum.enumValues)[number];

const OPEN_CALL_STATUSES: CallStatusValue[] = ["RINGING", "ACTIVE"];

export const createCallWithParticipants = async (data: {
  organizationId: string;
  roomName: string;
  type: CallTypeValue;
  initiatedBy: string;
  calleeUserId: string;
}) => {
  return db.transaction(async (tx) => {
    const [call] = await tx
      .insert(calls)
      .values({
        organizationId: data.organizationId,
        roomName: data.roomName,
        type: data.type,
        initiatedBy: data.initiatedBy,
      })
      .returning();

    await tx.insert(callParticipants).values([
      { callId: call.id, userId: data.initiatedBy },
      { callId: call.id, userId: data.calleeUserId },
    ]);

    return call;
  });
};

export const findCallByIdWithParticipants = async (callId: string) => {
  const call = await db.query.calls.findFirst({
    where: eq(calls.id, callId),
    with: {
      initiator: true,
      participants: {
        with: { user: true },
      },
    },
  });
  return call ?? null;
};

export const findCallByRoomName = async (roomName: string) => {
  const [call] = await db
    .select()
    .from(calls)
    .where(eq(calls.roomName, roomName));
  return call ?? null;
};

export const findOpenCallsForUser = async (
  userId: string,
  organizationId: string,
) => {
  return db.query.calls.findMany({
    where: and(
      eq(calls.organizationId, organizationId),
      inArray(calls.status, OPEN_CALL_STATUSES),
      inArray(
        calls.id,
        db
          .select({ id: callParticipants.callId })
          .from(callParticipants)
          .where(eq(callParticipants.userId, userId)),
      ),
    ),
    with: {
      initiator: true,
      participants: {
        with: { user: true },
      },
    },
    orderBy: desc(calls.createdAt),
  });
};

export const findCallHistoryForUser = async (
  userId: string,
  organizationId: string,
  limit: number,
) => {
  return db.query.calls.findMany({
    where: and(
      eq(calls.organizationId, organizationId),
      inArray(
        calls.id,
        db
          .select({ id: callParticipants.callId })
          .from(callParticipants)
          .where(eq(callParticipants.userId, userId)),
      ),
    ),
    with: {
      initiator: true,
      participants: {
        with: { user: true },
      },
    },
    orderBy: desc(calls.createdAt),
    limit,
  });
};

export const hasOpenCallForUser = async (userId: string): Promise<boolean> => {
  const rows = await db
    .select({ id: calls.id })
    .from(calls)
    .innerJoin(callParticipants, eq(callParticipants.callId, calls.id))
    .where(
      and(
        eq(callParticipants.userId, userId),
        inArray(calls.status, OPEN_CALL_STATUSES),
      ),
    )
    .limit(1);

  return rows.length > 0;
};

export const updateCallStatusIf = async (
  callId: string,
  fromStatuses: CallStatusValue[],
  toStatus: CallStatusValue,
  extra: { startedAt?: Date; endedAt?: Date } = {},
) => {
  const [call] = await db
    .update(calls)
    .set({ status: toStatus, ...extra })
    .where(and(eq(calls.id, callId), inArray(calls.status, fromStatuses)))
    .returning();

  return call ?? null;
};

export const updateCallParticipant = async (
  callId: string,
  userId: string,
  data: {
    status?: CallParticipantStatusValue;
    joinedAt?: Date;
    leftAt?: Date;
    identity?: string;
  },
) => {
  const [participant] = await db
    .update(callParticipants)
    .set(data)
    .where(
      and(
        eq(callParticipants.callId, callId),
        eq(callParticipants.userId, userId),
      ),
    )
    .returning();

  return participant ?? null;
};

export const countOpenCallParticipants = async (
  callId: string,
): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(callParticipants)
    .where(
      and(
        eq(callParticipants.callId, callId),
        eq(callParticipants.status, "JOINED"),
        sql`${callParticipants.leftAt} IS NULL`,
      ),
    );

  return rows[0]?.count ?? 0;
};

export const expireStaleRingingCallsForUser = async (userId: string) => {
  const cutoff = getRingCutoff();

  const staleCalls = await db
    .select({ id: calls.id })
    .from(calls)
    .innerJoin(callParticipants, eq(callParticipants.callId, calls.id))
    .where(
      and(
        eq(calls.status, "RINGING"),
        lte(calls.createdAt, cutoff),
        eq(callParticipants.userId, userId),
      ),
    );

  if (staleCalls.length === 0) return;

  const staleIds = staleCalls.map((row) => row.id);
  const now = new Date();

  await db
    .update(calls)
    .set({ status: "MISSED", endedAt: now })
    .where(and(inArray(calls.id, staleIds), eq(calls.status, "RINGING")));

  await db
    .update(callParticipants)
    .set({ status: "MISSED" })
    .where(
      and(
        inArray(callParticipants.callId, staleIds),
        eq(callParticipants.status, "INVITED"),
      ),
    );
};

export const markCallParticipantLeftByIdentity = async (
  callId: string,
  identity: string,
  leftAt: Date,
) => {
  const [participant] = await db
    .update(callParticipants)
    .set({ status: "LEFT", leftAt })
    .where(
      and(
        eq(callParticipants.callId, callId),
        eq(callParticipants.identity, identity),
        sql`${callParticipants.leftAt} IS NULL`,
      ),
    )
    .returning();

  return participant ?? null;
};
