import type {
  meetingInvitations,
  meetingParticipants,
  meetings,
  users,
} from "@/db/schema";
import type {
  MeetingDto,
  MeetingInvitationDto,
  MeetingParticipantDto,
} from "@/http/models/meeting.model";
import type { findMeetingByIdWithDetails } from "@/http/repositories/meeting.repository";

type MeetingRow = typeof meetings.$inferSelect;
type UserRow = typeof users.$inferSelect;
type InvitationRow = typeof meetingInvitations.$inferSelect;
type ParticipantRow = typeof meetingParticipants.$inferSelect;

export type MeetingWithDetails = NonNullable<
  Awaited<ReturnType<typeof findMeetingByIdWithDetails>>
>;

const toUserDto = (user: UserRow | null | undefined) =>
  user ? { id: user.id, name: user.name, avatar: user.avatar } : null;

export const toMeetingDto = (
  meeting: MeetingRow & { creator?: UserRow | null },
): MeetingDto => ({
  id: meeting.id,
  organizationId: meeting.organizationId,
  createdBy: meeting.createdBy,
  roomName: meeting.roomName,
  title: meeting.title,
  scheduledAt: meeting.scheduledAt?.toISOString() ?? null,
  expiresAt: meeting.expiresAt?.toISOString() ?? null,
  guestAccess: meeting.guestAccess,
  status: meeting.status,
  startedAt: meeting.startedAt?.toISOString() ?? null,
  endedAt: meeting.endedAt?.toISOString() ?? null,
  createdAt: meeting.createdAt.toISOString(),
  creator: toUserDto(meeting.creator),
});

export const toMeetingInvitationDto = (
  invitation: InvitationRow & { inviteeUser?: UserRow | null },
): MeetingInvitationDto => ({
  id: invitation.id,
  meetingId: invitation.meetingId,
  inviteeUserId: invitation.inviteeUserId,
  email: invitation.email,
  type: invitation.type,
  expiresAt: invitation.expiresAt?.toISOString() ?? null,
  revokedAt: invitation.revokedAt?.toISOString() ?? null,
  createdAt: invitation.createdAt.toISOString(),
  inviteeUser: toUserDto(invitation.inviteeUser),
});

const toMeetingParticipantDto = (
  participant: ParticipantRow & { user?: UserRow | null },
): MeetingParticipantDto => ({
  id: participant.id,
  meetingId: participant.meetingId,
  userId: participant.userId,
  guestName: participant.guestName,
  joinedAt: participant.joinedAt.toISOString(),
  leftAt: participant.leftAt?.toISOString() ?? null,
  user: toUserDto(participant.user),
});

export const toMeetingDetailDto = (
  meeting: MeetingWithDetails,
): MeetingDto => ({
  ...toMeetingDto(meeting),
  invitations: meeting.invitations.map(toMeetingInvitationDto),
  participants: meeting.participants.map(toMeetingParticipantDto),
});
