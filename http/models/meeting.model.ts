import { z } from "zod";

const meetingStatusEnum = z.enum([
  "SCHEDULED",
  "ACTIVE",
  "ENDED",
  "EXPIRED",
  "CANCELLED",
]);
export type MeetingStatus = z.infer<typeof meetingStatusEnum>;

const meetingInvitationTypeEnum = z.enum(["MEMBER", "GUEST"]);

export const createMeetingSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    scheduledAt: z.iso.datetime({ offset: true }).optional(),
    expiresAt: z.iso.datetime({ offset: true }).optional(),
    guestAccess: z.boolean().default(false),
  })
  .refine(
    (data) =>
      !data.scheduledAt || !data.expiresAt
        ? true
        : new Date(data.expiresAt).getTime() >
          new Date(data.scheduledAt).getTime(),
    {
      message: "expiresAt must be after scheduledAt",
      path: ["expiresAt"],
    },
  );
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export const createInstantMeetingSchema = z.object({
  title: z.string().trim().min(1).max(200).default("Instant Meeting"),
});
export type CreateInstantMeetingInput = z.input<
  typeof createInstantMeetingSchema
>;

export const inviteMeetingMembersSchema = z.object({
  userIds: z.array(z.uuid()).min(1).max(50),
});

export const guestJoinSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

type MeetingUserDto = {
  id: string;
  name: string;
  avatar: string | null;
};

export type MeetingInvitationDto = {
  id: string;
  meetingId: string;
  inviteeUserId: string | null;
  email: string | null;
  type: z.infer<typeof meetingInvitationTypeEnum>;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  inviteeUser: MeetingUserDto | null;
};

export type MeetingParticipantDto = {
  id: string;
  meetingId: string;
  userId: string | null;
  guestName: string | null;
  joinedAt: string;
  leftAt: string | null;
  user: MeetingUserDto | null;
};

export type MeetingDto = {
  id: string;
  organizationId: string | null;
  createdBy: string | null;
  roomName: string;
  title: string;
  scheduledAt: string | null;
  expiresAt: string | null;
  guestAccess: boolean;
  status: MeetingStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  creator: MeetingUserDto | null;
  invitations?: MeetingInvitationDto[];
  participants?: MeetingParticipantDto[];
};

export type MeetingTokenResponse = {
  serverUrl: string;
  token: string;
  meeting: MeetingDto;
};

export type PublicMeetingInfo = {
  id: string;
  title: string;
  status: MeetingStatus;
  expiresAt: string | null;
};

export type GuestLinkResponse = {
  token: string;
  expiresAt: string | null;
  url: string;
};

export type InstantMeetingResponse = {
  token: string;
  url: string;
};
