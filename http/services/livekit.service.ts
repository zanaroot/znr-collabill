"server only";

import {
  AccessToken,
  type AccessTokenOptions,
  RoomServiceClient,
  TrackSource,
  type VideoGrant,
  WebhookReceiver,
} from "livekit-server-sdk";
import { PARTICIPANT_TOKEN_TTL_SECONDS } from "@/lib/call-utils";
import { serverEnv } from "@/packages/env/server";

export class LiveKitNotConfiguredError extends Error {
  constructor() {
    super("LiveKit is not configured");
    this.name = "LiveKitNotConfiguredError";
  }
}

const getCredentials = () => {
  const url = serverEnv.LIVEKIT_URL;
  const apiKey = serverEnv.LIVEKIT_API_KEY;
  const apiSecret = serverEnv.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    throw new LiveKitNotConfiguredError();
  }

  return { url, apiKey, apiSecret };
};

export const isLiveKitConfigured = (): boolean =>
  Boolean(
    serverEnv.LIVEKIT_URL &&
      serverEnv.LIVEKIT_API_KEY &&
      serverEnv.LIVEKIT_API_SECRET,
  );

const getRoomService = (): RoomServiceClient => {
  const { url, apiKey, apiSecret } = getCredentials();
  return new RoomServiceClient(url, apiKey, apiSecret);
};

export const deleteLiveKitRoom = async (roomName: string): Promise<void> => {
  if (!isLiveKitConfigured()) return;

  try {
    await getRoomService().deleteRoom(roomName);
  } catch {
    // Room may already be gone (auto-closed by empty/departure timeouts).
  }
};

export type ParticipantTokenInput = {
  roomName: string;
  identity: string;
  name: string;
  metadata?: Record<string, unknown>;
};

export const buildCallGrant = (roomName: string): VideoGrant => ({
  room: roomName,
  roomJoin: true,
  canPublish: true,
  canPublishData: true,
  canSubscribe: true,
  canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE],
});

export const buildMeetingGrant = (roomName: string): VideoGrant => ({
  room: roomName,
  roomJoin: true,
  canPublish: true,
  canPublishData: true,
  canSubscribe: true,
  canPublishSources: [
    TrackSource.CAMERA,
    TrackSource.MICROPHONE,
    TrackSource.SCREEN_SHARE,
    TrackSource.SCREEN_SHARE_AUDIO,
  ],
});

export const generateParticipantToken = async (
  input: ParticipantTokenInput,
  grant: VideoGrant,
): Promise<string> => {
  const { apiKey, apiSecret } = getCredentials();

  const options: AccessTokenOptions = {
    identity: input.identity,
    name: input.name,
    ttl: `${PARTICIPANT_TOKEN_TTL_SECONDS}s`,
  };

  if (input.metadata) {
    options.metadata = JSON.stringify(input.metadata);
  }

  const accessToken = new AccessToken(apiKey, apiSecret, options);
  accessToken.addGrant(grant);

  return accessToken.toJwt();
};

export const getWebhookReceiver = (): WebhookReceiver => {
  const { apiKey, apiSecret } = getCredentials();
  return new WebhookReceiver(apiKey, apiSecret);
};

export const getLiveKitServerUrl = (): string => getCredentials().url;
