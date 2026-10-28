"server only";

import type { WebhookEvent } from "livekit-server-sdk";
import {
  countOpenCallParticipants,
  findCallByRoomName,
  markCallParticipantLeftByIdentity,
  updateCallStatusIf,
} from "@/http/repositories/call.repository";
import {
  closeAllOpenMeetingParticipants,
  closeMeetingParticipantByIdentity,
  findMeetingByRoomName,
  updateMeetingStatusIf,
} from "@/http/repositories/meeting.repository";

const endCallByRoom = async (roomName: string) => {
  const call = await findCallByRoomName(roomName);
  if (!call) return;

  await updateCallStatusIf(call.id, ["RINGING", "ACTIVE"], "ENDED", {
    endedAt: new Date(),
  });
};

const endMeetingByRoom = async (roomName: string) => {
  const meeting = await findMeetingByRoomName(roomName);
  if (!meeting) return;

  await updateMeetingStatusIf(meeting.id, ["SCHEDULED", "ACTIVE"], "ENDED", {
    endedAt: new Date(),
  });
  await closeAllOpenMeetingParticipants(meeting.id);
};

export const processLiveKitWebhookEvent = async (
  event: WebhookEvent,
): Promise<void> => {
  const roomName = event.room?.name;
  if (!roomName) return;

  if (event.event === "room_finished") {
    await endCallByRoom(roomName);
    await endMeetingByRoom(roomName);
    return;
  }

  const identity = event.participant?.identity;
  if (!identity) return;

  if (event.event === "participant_left") {
    const leftAt = event.createdAt
      ? new Date(Number(event.createdAt) * 1000)
      : new Date();

    const call = await findCallByRoomName(roomName);
    if (call) {
      await markCallParticipantLeftByIdentity(call.id, identity, leftAt);

      const openCount = await countOpenCallParticipants(call.id);
      if (openCount === 0) {
        await updateCallStatusIf(call.id, ["ACTIVE", "RINGING"], "ENDED", {
          endedAt: new Date(),
        });
      }
    }

    const meeting = await findMeetingByRoomName(roomName);
    if (meeting) {
      await closeMeetingParticipantByIdentity(meeting.id, identity);
    }
  }
};
