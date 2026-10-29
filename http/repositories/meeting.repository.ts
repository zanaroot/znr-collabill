"server only";

import { and, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  livekitWebhookEvents,
  meetingInvitations,
  meetingParticipants,
  type meetingStatusEnum,
  meetings,
} from "@/db/schema";

type MeetingStatusValue = (typeof meetingStatusEnum.enumValues)[number];

export const createMeeting = async (data: {
  organizationId?: string;
  createdBy?: string;
  roomName: string;
  title: string;
  scheduledAt?: Date;
  expiresAt?: Date;
  guestAccess: boolean;
}) => {
  const [meeting] = await db.insert(meetings).values(data).returning();
  return meeting;
};

export const findMeetingByIdWithDetails = async (meetingId: string) => {
  const meeting = await db.query.meetings.findFirst({
    where: eq(meetings.id, meetingId),
    with: {
      creator: true,
      invitations: {
        with: { inviteeUser: true },
        orderBy: desc(meetingInvitations.createdAt),
      },
      participants: {
        with: { user: true },
        orderBy: desc(meetingParticipants.joinedAt),
      },
    },
  });
  return meeting ?? null;
};

export const findMeetingByRoomName = async (roomName: string) => {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.roomName, roomName));
  return meeting ?? null;
};

export const findMeetingsByOrganization = async (
  organizationId: string,
  limit: number,
) => {
  return db.query.meetings.findMany({
    where: eq(meetings.organizationId, organizationId),
    with: {
      creator: true,
      participants: {
        columns: { id: true },
      },
    },
    orderBy: desc(meetings.createdAt),
    limit,
  });
};

export const updateMeetingStatusIf = async (
  meetingId: string,
  fromStatuses: MeetingStatusValue[],
  toStatus: MeetingStatusValue,
  extra: { startedAt?: Date; endedAt?: Date } = {},
) => {
  const [meeting] = await db
    .update(meetings)
    .set({ status: toStatus, ...extra })
    .where(
      and(eq(meetings.id, meetingId), inArray(meetings.status, fromStatuses)),
    )
    .returning();

  return meeting ?? null;
};

export const expireMeetingIfDue = async (meetingId: string) => {
  const [meeting] = await db
    .update(meetings)
    .set({ status: "EXPIRED", endedAt: new Date() })
    .where(
      and(
        eq(meetings.id, meetingId),
        inArray(meetings.status, ["SCHEDULED", "ACTIVE"]),
        lte(meetings.expiresAt, new Date()),
      ),
    )
    .returning();

  return meeting ?? null;
};

export const findExistingMemberInviteeIds = async (
  meetingId: string,
  userIds: string[],
) => {
  const rows = await db
    .select({ userId: meetingInvitations.inviteeUserId })
    .from(meetingInvitations)
    .where(
      and(
        eq(meetingInvitations.meetingId, meetingId),
        eq(meetingInvitations.type, "MEMBER"),
        inArray(meetingInvitations.inviteeUserId, userIds),
      ),
    );

  return new Set(
    rows.map((row) => row.userId).filter((id): id is string => id !== null),
  );
};

export const createMemberInvitations = async (
  meetingId: string,
  userIds: string[],
) => {
  if (userIds.length === 0) return [];

  return db
    .insert(meetingInvitations)
    .values(
      userIds.map((userId) => ({
        meetingId,
        inviteeUserId: userId,
        type: "MEMBER" as const,
      })),
    )
    .returning();
};

export const findInvitationById = async (invitationId: string) => {
  const [invitation] = await db
    .select()
    .from(meetingInvitations)
    .where(eq(meetingInvitations.id, invitationId))
    .limit(1);

  return invitation ?? null;
};

export const revokeInvitationById = async (invitationId: string) => {
  const [invitation] = await db
    .update(meetingInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(meetingInvitations.id, invitationId),
        isNull(meetingInvitations.revokedAt),
      ),
    )
    .returning();

  return invitation ?? null;
};

export const revokeGuestInvitationsForMeeting = async (meetingId: string) => {
  await db
    .update(meetingInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(meetingInvitations.meetingId, meetingId),
        eq(meetingInvitations.type, "GUEST"),
        isNull(meetingInvitations.revokedAt),
      ),
    );
};

export const createGuestInvitation = async (data: {
  meetingId: string;
  tokenHash: string;
  expiresAt?: Date;
}) => {
  const [invitation] = await db
    .insert(meetingInvitations)
    .values({ ...data, type: "GUEST" })
    .returning();

  return invitation;
};

export const findValidGuestInvitationByTokenHash = async (
  tokenHash: string,
  now: Date = new Date(),
) => {
  const [invitation] = await db
    .select()
    .from(meetingInvitations)
    .where(
      and(
        eq(meetingInvitations.tokenHash, tokenHash),
        eq(meetingInvitations.type, "GUEST"),
        isNull(meetingInvitations.revokedAt),
        sql`(${meetingInvitations.expiresAt} IS NULL OR ${meetingInvitations.expiresAt} > ${now.toISOString()})`,
      ),
    )
    .limit(1);

  return invitation ?? null;
};

export const upsertMeetingParticipantOnJoin = async (data: {
  meetingId: string;
  userId?: string;
  guestName?: string;
  identity: string;
}) => {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, data.meetingId),
          eq(meetingParticipants.identity, data.identity),
          isNull(meetingParticipants.leftAt),
        ),
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const [participant] = await tx
      .insert(meetingParticipants)
      .values({
        meetingId: data.meetingId,
        userId: data.userId,
        guestName: data.guestName,
        identity: data.identity,
      })
      .returning();

    return participant;
  });
};

export const closeMeetingParticipantByIdentity = async (
  meetingId: string,
  identity: string,
  leftAt: Date = new Date(),
) => {
  const [participant] = await db
    .update(meetingParticipants)
    .set({ leftAt })
    .where(
      and(
        eq(meetingParticipants.meetingId, meetingId),
        eq(meetingParticipants.identity, identity),
        isNull(meetingParticipants.leftAt),
      ),
    )
    .returning();

  return participant ?? null;
};

export const closeAllOpenMeetingParticipants = async (
  meetingId: string,
  leftAt: Date = new Date(),
) => {
  await db
    .update(meetingParticipants)
    .set({ leftAt })
    .where(
      and(
        eq(meetingParticipants.meetingId, meetingId),
        isNull(meetingParticipants.leftAt),
      ),
    );
};

export const insertWebhookEventIfNew = async (data: {
  id: string;
  eventType: string;
  roomName?: string | null;
}): Promise<boolean> => {
  const rows = await db
    .insert(livekitWebhookEvents)
    .values({
      id: data.id,
      eventType: data.eventType,
      roomName: data.roomName ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: livekitWebhookEvents.id });

  return rows.length > 0;
};
