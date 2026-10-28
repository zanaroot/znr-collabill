import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  guestJoinSchema,
  type MeetingTokenResponse,
  type PublicMeetingInfo,
} from "@/http/models/meeting.model";
import {
  closeAllOpenMeetingParticipants,
  closeMeetingParticipantByIdentity,
  expireMeetingIfDue,
  findMeetingByIdWithDetails,
  findValidGuestInvitationByTokenHash,
  updateMeetingStatusIf,
  upsertMeetingParticipantOnJoin,
} from "@/http/repositories/meeting.repository";
import {
  buildMeetingGrant,
  deleteLiveKitRoom,
  generateParticipantToken,
  getLiveKitServerUrl,
  isLiveKitConfigured,
  LiveKitNotConfiguredError,
} from "@/http/services/livekit.service";
import { toMeetingDetailDto, toMeetingDto } from "@/http/services/meeting-dto";
import {
  buildGuestIdentity,
  buildMemberIdentity,
  hashInviteToken,
} from "@/lib/call-utils";

const factory = createFactory<AuthEnv>();

const joinableStatuses = ["SCHEDULED", "ACTIVE"] as const;

const issueMeetingToken = async (
  meeting: { id: string; roomName: string; title: string },
  participant: {
    identity: string;
    name: string;
    metadata: Record<string, unknown>;
  },
): Promise<{ serverUrl: string; token: string }> => {
  const token = await generateParticipantToken(
    {
      roomName: meeting.roomName,
      identity: participant.identity,
      name: participant.name,
      metadata: participant.metadata,
    },
    buildMeetingGrant(meeting.roomName),
  );

  return { serverUrl: getLiveKitServerUrl(), token };
};

export const joinMeeting = factory.createHandlers(async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const organizationId = user.organizationId;
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  const meetingId = c.req.param("id");
  if (!meetingId) {
    return c.json({ error: "ID required" }, 400);
  }

  const meeting = await findMeetingByIdWithDetails(meetingId);
  if (!meeting || meeting.organizationId !== organizationId) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  await expireMeetingIfDue(meeting.id);
  const current = await findMeetingByIdWithDetails(meeting.id);
  if (!current) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  if (
    current.status === "ENDED" ||
    current.status === "EXPIRED" ||
    current.status === "CANCELLED"
  ) {
    return c.json({ error: "This meeting has ended" }, 410);
  }

  if (!isLiveKitConfigured()) {
    return c.json({ error: "LiveKit is not configured" }, 503);
  }

  const identity = buildMemberIdentity(user.id);

  await upsertMeetingParticipantOnJoin({
    meetingId: current.id,
    userId: user.id,
    identity,
  });

  const activated = await updateMeetingStatusIf(
    current.id,
    [...joinableStatuses],
    "ACTIVE",
    { startedAt: current.startedAt ?? new Date() },
  );

  const meetingDto = toMeetingDto(activated ?? current);

  try {
    const { serverUrl, token } = await issueMeetingToken(current, {
      identity,
      name: user.name,
      metadata: { avatar: user.avatar, isGuest: false },
    });

    const response: MeetingTokenResponse = {
      serverUrl,
      token,
      meeting: meetingDto,
    };
    return c.json(response);
  } catch (error) {
    if (error instanceof LiveKitNotConfiguredError) {
      return c.json({ error: "LiveKit is not configured" }, 503);
    }
    throw error;
  }
});

export const getPublicMeetingInfo = factory.createHandlers(async (c) => {
  if (!isLiveKitConfigured()) {
    return c.json({ error: "LiveKit is not configured" }, 503);
  }

  const token = c.req.param("token");
  if (!token) {
    return c.json({ error: "Meeting link is required" }, 400);
  }

  const invitation = await findValidGuestInvitationByTokenHash(
    hashInviteToken(token),
  );

  if (!invitation) {
    return c.json(
      { error: "This meeting link is invalid or has been revoked" },
      404,
    );
  }

  const meeting = await findMeetingByIdWithDetails(invitation.meetingId);
  if (!meeting || !meeting.guestAccess) {
    return c.json(
      { error: "This meeting link is invalid or has been revoked" },
      404,
    );
  }

  await expireMeetingIfDue(meeting.id);
  const current = await findMeetingByIdWithDetails(meeting.id);
  if (!current) {
    return c.json(
      { error: "This meeting link is invalid or has been revoked" },
      404,
    );
  }

  if (
    current.status === "ENDED" ||
    current.status === "EXPIRED" ||
    current.status === "CANCELLED"
  ) {
    return c.json({ error: "This meeting has ended" }, 410);
  }

  const info: PublicMeetingInfo = {
    id: current.id,
    title: current.title,
    status: current.status,
    expiresAt: current.expiresAt?.toISOString() ?? null,
  };

  return c.json(info);
});

export const guestJoinMeeting = factory.createHandlers(
  zValidator("json", guestJoinSchema),
  async (c) => {
    if (!isLiveKitConfigured()) {
      return c.json({ error: "LiveKit is not configured" }, 503);
    }

    const token = c.req.param("token");
    if (!token) {
      return c.json({ error: "Meeting link is required" }, 400);
    }

    const { name } = c.req.valid("json");

    const invitation = await findValidGuestInvitationByTokenHash(
      hashInviteToken(token),
    );

    if (!invitation) {
      return c.json(
        { error: "This meeting link is invalid or has been revoked" },
        404,
      );
    }

    let meeting = await findMeetingByIdWithDetails(invitation.meetingId);
    if (!meeting || !meeting.guestAccess) {
      return c.json(
        { error: "This meeting link is invalid or has been revoked" },
        404,
      );
    }

    await expireMeetingIfDue(meeting.id);
    meeting = await findMeetingByIdWithDetails(meeting.id);
    if (!meeting) {
      return c.json(
        { error: "This meeting link is invalid or has been revoked" },
        404,
      );
    }

    if (
      meeting.status === "ENDED" ||
      meeting.status === "EXPIRED" ||
      meeting.status === "CANCELLED"
    ) {
      return c.json({ error: "This meeting has ended" }, 410);
    }

    const identity = buildGuestIdentity();

    await upsertMeetingParticipantOnJoin({
      meetingId: meeting.id,
      guestName: name,
      identity,
    });

    const activated = await updateMeetingStatusIf(
      meeting.id,
      [...joinableStatuses],
      "ACTIVE",
      { startedAt: meeting.startedAt ?? new Date() },
    );

    try {
      const { serverUrl, token: participantToken } = await issueMeetingToken(
        meeting,
        {
          identity,
          name,
          metadata: { isGuest: true, guestName: name },
        },
      );

      const response: MeetingTokenResponse = {
        serverUrl,
        token: participantToken,
        meeting: toMeetingDto(activated ?? meeting),
      };
      return c.json(response);
    } catch (error) {
      if (error instanceof LiveKitNotConfiguredError) {
        return c.json({ error: "LiveKit is not configured" }, 503);
      }
      throw error;
    }
  },
);

export const leaveMeeting = factory.createHandlers(async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const organizationId = user.organizationId;
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  const meetingId = c.req.param("id");
  if (!meetingId) {
    return c.json({ error: "ID required" }, 400);
  }

  const meeting = await findMeetingByIdWithDetails(meetingId);
  if (!meeting || meeting.organizationId !== organizationId) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  const identity = buildMemberIdentity(user.id);
  await closeMeetingParticipantByIdentity(meeting.id, identity);

  return c.json({ success: true });
});

export const endMeeting = factory.createHandlers(async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const organizationId = user.organizationId;
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  const meetingId = c.req.param("id");
  if (!meetingId) {
    return c.json({ error: "ID required" }, 400);
  }

  const meeting = await findMeetingByIdWithDetails(meetingId);
  if (!meeting || meeting.organizationId !== organizationId) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  const isManager =
    meeting.createdBy === user.id ||
    user.organizationRole === "OWNER" ||
    user.organizationRole === "ADMIN";

  if (!isManager) {
    return c.json(
      { error: "Only the meeting creator or an admin can end this meeting" },
      403,
    );
  }

  const ended = await updateMeetingStatusIf(
    meeting.id,
    ["SCHEDULED", "ACTIVE"],
    "ENDED",
    { endedAt: new Date() },
  );

  if (!ended) {
    return c.json({ error: "Meeting has already ended" }, 409);
  }

  await closeAllOpenMeetingParticipants(meeting.id);
  deleteLiveKitRoom(meeting.roomName).catch(() => undefined);

  const freshMeeting = await findMeetingByIdWithDetails(meeting.id);
  if (!freshMeeting) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  return c.json({ meeting: toMeetingDetailDto(freshMeeting) });
});
