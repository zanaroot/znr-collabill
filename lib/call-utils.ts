import { createHash, randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";

const CALL_RING_TIMEOUT_MS = 45_000;
export const CALL_HISTORY_LIMIT = 50;
export const PARTICIPANT_TOKEN_TTL_SECONDS = 900;

export const generateCallRoomName = () => `call_${uuidv4()}`;

export const generateMeetingRoomName = () => `meet_${uuidv4()}`;

export const generateGuestToken = () => randomBytes(32).toString("base64url");

export const hashInviteToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const buildMemberIdentity = (userId: string): string => `user_${userId}`;

export const buildGuestIdentity = (): string => `guest_${uuidv4()}`;

export const getRingCutoff = (now: Date = new Date()): Date =>
  new Date(now.getTime() - CALL_RING_TIMEOUT_MS);
