import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  createMeetingSchema,
  type GuestLinkResponse,
  inviteMeetingMembersSchema,
} from "@/http/models/meeting.model";
import {
  createGuestInvitation,
  createMeeting,
  createMemberInvitations,
  expireMeetingIfDue,
  findExistingMemberInviteeIds,
  findInvitationById,
  findMeetingByIdWithDetails,
  findMeetingsByOrganization,
  revokeGuestInvitationsForMeeting,
  revokeInvitationById,
} from "@/http/repositories/meeting.repository";
import { createNotification } from "@/http/repositories/notification.repository";
import { getOrganizationMembers } from "@/http/repositories/organization.repository";
import {
  toMeetingDetailDto,
  toMeetingDto,
  toMeetingInvitationDto,
} from "@/http/services/meeting-dto";
import {
  generateGuestToken,
  generateMeetingRoomName,
  hashInviteToken,
} from "@/lib/call-utils";
import { getFutureDate } from "@/lib/date";
import { publicEnv } from "@/packages/env";

const factory = createFactory<AuthEnv>();

const MEETING_LIST_LIMIT = 100;
const GUEST_LINK_VALIDITY_DAYS = 7;

export const createMeetingHandler = factory.createHandlers(
  zValidator("json", createMeetingSchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const organizationId = user.organizationId;
    if (!organizationId) {
      return c.json({ error: "No organization found" }, 404);
    }

    const input = c.req.valid("json");

    const meeting = await createMeeting({
      organizationId,
      createdBy: user.id,
      roomName: generateMeetingRoomName(),
      title: input.title,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      guestAccess: input.guestAccess,
    });

    return c.json({ meeting: toMeetingDto(meeting) }, 201);
  },
);

export const getMeetings = factory.createHandlers(async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const organizationId = user.organizationId;
  if (!organizationId) {
    return c.json({ error: "No organization found" }, 404);
  }

  const meetings = await findMeetingsByOrganization(
    organizationId,
    MEETING_LIST_LIMIT,
  );

  return c.json(
    meetings.map((meeting) => ({
      ...toMeetingDto(meeting),
      participantCount: meeting.participants.length,
    })),
  );
});

export const getMeetingById = factory.createHandlers(async (c) => {
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

  const expired = await expireMeetingIfDue(meeting.id);
  const freshMeeting = expired
    ? await findMeetingByIdWithDetails(meeting.id)
    : meeting;

  if (!freshMeeting) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  return c.json(toMeetingDetailDto(freshMeeting));
});

export const inviteMeetingMembers = factory.createHandlers(
  zValidator("json", inviteMeetingMembersSchema),
  async (c) => {
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

    const { userIds } = c.req.valid("json");

    const members = await getOrganizationMembers(organizationId);
    const memberIds = new Set(members.map((member) => member.id));
    const invalid = userIds.filter((id) => !memberIds.has(id));

    if (invalid.length > 0) {
      return c.json(
        { error: "Some users are not members of your organization" },
        403,
      );
    }

    const existing = await findExistingMemberInviteeIds(meeting.id, userIds);
    const newUserIds = userIds.filter((id) => !existing.has(id));

    const created = await createMemberInvitations(meeting.id, newUserIds);

    await Promise.all(
      newUserIds.map((inviteeUserId) =>
        createNotification({
          userId: inviteeUserId,
          organizationId,
          actorId: user.id,
          type: "MEETING_INVITE",
          title: "Meeting invitation",
          message: `${user.name} invited you to "${meeting.title}"`,
          entityType: "MEETING",
          entityId: meeting.id,
        }),
      ),
    );

    const membersById = new Map(members.map((member) => [member.id, member]));

    return c.json(
      {
        created: created.map((invitation) => {
          const invitee = invitation.inviteeUserId
            ? membersById.get(invitation.inviteeUserId)
            : undefined;

          return {
            ...toMeetingInvitationDto(invitation),
            inviteeUser: invitee
              ? {
                  id: invitee.id,
                  name: invitee.name,
                  avatar: invitee.avatar,
                }
              : null,
          };
        }),
        skipped: [...existing],
      },
      201,
    );
  },
);

export const revokeMeetingInvitation = factory.createHandlers(async (c) => {
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

  const invitationId = c.req.param("invitationId");
  if (!invitationId) {
    return c.json({ error: "ID required" }, 400);
  }

  const invitation = await findInvitationById(invitationId);
  if (!invitation || invitation.meetingId !== meeting.id) {
    return c.json({ error: "Invitation not found" }, 404);
  }

  const revoked = await revokeInvitationById(invitation.id);
  if (!revoked) {
    return c.json({ error: "Invitation already revoked" }, 409);
  }

  return c.json({ invitation: toMeetingInvitationDto(revoked) });
});

export const createMeetingGuestLink = factory.createHandlers(async (c) => {
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
      { error: "Only the meeting creator or an admin can manage guest links" },
      403,
    );
  }

  if (!meeting.guestAccess) {
    return c.json({ error: "Guest access is disabled for this meeting" }, 403);
  }

  const token = generateGuestToken();
  const expiresAt = getFutureDate(GUEST_LINK_VALIDITY_DAYS);

  await revokeGuestInvitationsForMeeting(meeting.id);
  await createGuestInvitation({
    meetingId: meeting.id,
    tokenHash: hashInviteToken(token),
    expiresAt,
  });

  const response: GuestLinkResponse = {
    token,
    expiresAt: expiresAt.toISOString(),
    url: `${publicEnv.NEXT_PUBLIC_APP_URL}/meet/${token}`,
  };

  return c.json(response);
});
