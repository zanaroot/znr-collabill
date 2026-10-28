import { z } from "zod";

const callTypeEnum = z.enum(["AUDIO", "VIDEO"]);
export type CallType = z.infer<typeof callTypeEnum>;

const callStatusEnum = z.enum([
  "RINGING",
  "ACTIVE",
  "ENDED",
  "MISSED",
  "REJECTED",
  "CANCELLED",
]);

const callParticipantStatusEnum = z.enum([
  "INVITED",
  "JOINED",
  "LEFT",
  "REJECTED",
  "MISSED",
]);

export const createCallSchema = z.object({
  type: callTypeEnum,
  calleeId: z.uuid(),
});

type CallStatus = z.infer<typeof callStatusEnum>;
type CallParticipantStatus = z.infer<typeof callParticipantStatusEnum>;

type CallUserDto = {
  id: string;
  name: string;
  avatar: string | null;
};

type CallParticipantDto = {
  id: string;
  callId: string;
  userId: string | null;
  guestName: string | null;
  status: CallParticipantStatus;
  joinedAt: string | null;
  leftAt: string | null;
  user: CallUserDto | null;
};

export type CallDto = {
  id: string;
  organizationId: string;
  roomName: string;
  type: CallType;
  status: CallStatus;
  initiatedBy: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  initiator: CallUserDto | null;
  participants: CallParticipantDto[];
};

export type CallTokenResponse = {
  serverUrl: string;
  token: string;
  call: CallDto;
};
