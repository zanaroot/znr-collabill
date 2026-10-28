import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import { type CallDto, createCallSchema } from "@/http/models/call.model";
import {
  countOpenCallParticipants,
  createCallWithParticipants,
  expireStaleRingingCallsForUser,
  findCallByIdWithParticipants,
  findCallHistoryForUser,
  findOpenCallsForUser,
  hasOpenCallForUser,
  updateCallParticipant,
  updateCallStatusIf,
} from "@/http/repositories/call.repository";
import { createNotification } from "@/http/repositories/notification.repository";
import { isUserInOrganization } from "@/http/repositories/organization.repository";
import {
  buildCallGrant,
  deleteLiveKitRoom,
  generateParticipantToken,
  getLiveKitServerUrl,
  isLiveKitConfigured,
  LiveKitNotConfiguredError,
} from "@/http/services/livekit.service";
import {
  buildMemberIdentity,
  CALL_HISTORY_LIMIT,
  generateCallRoomName,
} from "@/lib/call-utils";
import { logError } from "@/lib/sentry";

const factory = createFactory<AuthEnv>();

type CallRecord = NonNullable<
  Awaited<ReturnType<typeof findCallByIdWithParticipants>>
>;

const toCallDto = (call: CallRecord): CallDto => ({
  id: call.id,
  organizationId: call.organizationId,
  roomName: call.roomName,
  type: call.type,
  status: call.status,
  initiatedBy: call.initiatedBy,
  startedAt: call.startedAt?.toISOString() ?? null,
  endedAt: call.endedAt?.toISOString() ?? null,
  createdAt: call.createdAt.toISOString(),
  initiator: call.initiator
    ? {
        id: call.initiator.id,
        name: call.initiator.name,
        avatar: call.initiator.avatar,
      }
    : null,
  participants: call.participants.map((participant) => ({
    id: participant.id,
    callId: participant.callId,
    userId: participant.userId,
    guestName: participant.guestName,
    status: participant.status,
    joinedAt: participant.joinedAt?.toISOString() ?? null,
    leftAt: participant.leftAt?.toISOString() ?? null,
    user: participant.user
      ? {
          id: participant.user.id,
          name: participant.user.name,
          avatar: participant.user.avatar,
        }
      : null,
  })),
});

type OrgAuth =
  | {
      user: {
        id: string;
        name: string;
        avatar: string | null;
        organizationId: string;
      };
      error?: never;
    }
  | { user?: never; error: Response };

const requireOrgUser = (c: Context<AuthEnv>): OrgAuth => {
  const user = c.get("user");
  if (!user?.organizationId) {
    if (!user) {
      return { error: c.json({ error: "Unauthorized" }, 401) };
    }
    return { error: c.json({ error: "No organization found" }, 404) };
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      organizationId: user.organizationId,
    },
  };
};

const issueCallToken = async (
  call: CallRecord,
  user: { id: string; name: string; avatar: string | null },
) => {
  const token = await generateParticipantToken(
    {
      roomName: call.roomName,
      identity: buildMemberIdentity(user.id),
      name: user.name,
      metadata: { avatar: user.avatar, isGuest: false },
    },
    buildCallGrant(call.roomName),
  );

  return { serverUrl: getLiveKitServerUrl(), token };
};

export const createCall = factory.createHandlers(
  zValidator("json", createCallSchema),
  async (c) => {
    const auth = requireOrgUser(c);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const { type, calleeId } = c.req.valid("json");

    if (calleeId === user.id) {
      return c.json({ error: "You cannot call yourself" }, 400);
    }

    if (!(await isUserInOrganization(user.organizationId, calleeId))) {
      return c.json(
        { error: "User is not a member of your organization" },
        403,
      );
    }

    if (!isLiveKitConfigured()) {
      return c.json({ error: "LiveKit is not configured" }, 503);
    }

    if (await hasOpenCallForUser(user.id)) {
      return c.json({ error: "You are already in a call" }, 409);
    }

    if (await hasOpenCallForUser(calleeId)) {
      return c.json({ error: "The user is already in a call" }, 409);
    }

    const call = await createCallWithParticipants({
      organizationId: user.organizationId,
      roomName: generateCallRoomName(),
      type,
      initiatedBy: user.id,
      calleeUserId: calleeId,
    });

    await createNotification({
      userId: calleeId,
      organizationId: user.organizationId,
      actorId: user.id,
      type: "CALL_INVITE",
      title: type === "VIDEO" ? "Incoming video call" : "Incoming audio call",
      message: `${user.name} is calling you`,
      entityType: "CALL",
      entityId: call.id,
    });

    const callWithParticipants = await findCallByIdWithParticipants(call.id);
    if (!callWithParticipants) {
      return c.json({ error: "Failed to create call" }, 500);
    }

    return c.json({ call: toCallDto(callWithParticipants) }, 201);
  },
);

export const getCalls = factory.createHandlers(async (c) => {
  const auth = requireOrgUser(c);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const history = await findCallHistoryForUser(
    user.id,
    user.organizationId,
    CALL_HISTORY_LIMIT,
  );

  return c.json(history.map(toCallDto));
});

export const getActiveCalls = factory.createHandlers(async (c) => {
  const auth = requireOrgUser(c);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  await expireStaleRingingCallsForUser(user.id);

  const activeCalls = await findOpenCallsForUser(user.id, user.organizationId);
  return c.json(activeCalls.map(toCallDto));
});

export const getCallById = factory.createHandlers(async (c) => {
  const auth = requireOrgUser(c);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const callId = c.req.param("id");
  if (!callId) {
    return c.json({ error: "ID required" }, 400);
  }

  const call = await findCallByIdWithParticipants(callId);

  if (!call || call.organizationId !== user.organizationId) {
    return c.json({ error: "Call not found" }, 404);
  }

  return c.json(toCallDto(call));
});

export const acceptCall = factory.createHandlers(async (c) => {
  const auth = requireOrgUser(c);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const callId = c.req.param("id");
  if (!callId) {
    return c.json({ error: "ID required" }, 400);
  }

  const call = await findCallByIdWithParticipants(callId);

  if (!call || call.organizationId !== user.organizationId) {
    return c.json({ error: "Call not found" }, 404);
  }

  const isParticipant = call.participants.some((p) => p.userId === user.id);
  if (!isParticipant) {
    return c.json({ error: "You are not a participant of this call" }, 403);
  }

  if (call.status !== "RINGING") {
    return c.json({ error: "Call is no longer ringing" }, 409);
  }

  if (!isLiveKitConfigured()) {
    return c.json({ error: "LiveKit is not configured" }, 503);
  }

  const updated = await updateCallStatusIf(call.id, ["RINGING"], "ACTIVE", {
    startedAt: new Date(),
  });

  if (!updated) {
    return c.json({ error: "Call is no longer ringing" }, 409);
  }

  await updateCallParticipant(call.id, user.id, {
    status: "JOINED",
    joinedAt: new Date(),
  });

  try {
    const { serverUrl, token } = await issueCallToken(call, user);
    const freshCall = await findCallByIdWithParticipants(call.id);
    if (!freshCall) {
      return c.json({ error: "Call not found" }, 404);
    }
    return c.json({ serverUrl, token, call: toCallDto(freshCall) });
  } catch (error) {
    if (error instanceof LiveKitNotConfiguredError) {
      return c.json({ error: "LiveKit is not configured" }, 503);
    }
    throw error;
  }
});

export const rejectCall = factory.createHandlers(async (c) => {
  const auth = requireOrgUser(c);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const callId = c.req.param("id");
  if (!callId) {
    return c.json({ error: "ID required" }, 400);
  }

  const call = await findCallByIdWithParticipants(callId);

  if (!call || call.organizationId !== user.organizationId) {
    return c.json({ error: "Call not found" }, 404);
  }

  const isCallee = call.participants.some(
    (p) => p.userId === user.id && p.status === "INVITED",
  );
  if (!isCallee) {
    return c.json({ error: "Only the callee can reject this call" }, 403);
  }

  const updated = await updateCallStatusIf(call.id, ["RINGING"], "REJECTED", {
    endedAt: new Date(),
  });

  if (!updated) {
    return c.json({ error: "Call is no longer ringing" }, 409);
  }

  await updateCallParticipant(call.id, user.id, { status: "REJECTED" });

  const freshCall = await findCallByIdWithParticipants(call.id);
  if (!freshCall) {
    return c.json({ error: "Call not found" }, 404);
  }

  return c.json({ call: toCallDto(freshCall) });
});

export const cancelCall = factory.createHandlers(async (c) => {
  const auth = requireOrgUser(c);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const callId = c.req.param("id");
  if (!callId) {
    return c.json({ error: "ID required" }, 400);
  }

  const call = await findCallByIdWithParticipants(callId);

  if (!call || call.organizationId !== user.organizationId) {
    return c.json({ error: "Call not found" }, 404);
  }

  if (call.initiatedBy !== user.id) {
    return c.json({ error: "Only the caller can cancel this call" }, 403);
  }

  const updated = await updateCallStatusIf(call.id, ["RINGING"], "CANCELLED", {
    endedAt: new Date(),
  });

  if (!updated) {
    return c.json({ error: "Call is no longer ringing" }, 409);
  }

  for (const participant of call.participants) {
    if (participant.status === "INVITED") {
      await updateCallParticipant(call.id, participant.userId as string, {
        status: "MISSED",
      });
    }
  }

  const freshCall = await findCallByIdWithParticipants(call.id);
  if (!freshCall) {
    return c.json({ error: "Call not found" }, 404);
  }

  return c.json({ call: toCallDto(freshCall) });
});

export const leaveCall = factory.createHandlers(async (c) => {
  const auth = requireOrgUser(c);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const callId = c.req.param("id");
  if (!callId) {
    return c.json({ error: "ID required" }, 400);
  }

  const call = await findCallByIdWithParticipants(callId);

  if (!call || call.organizationId !== user.organizationId) {
    return c.json({ error: "Call not found" }, 404);
  }

  const myParticipant = call.participants.find((p) => p.userId === user.id);
  if (!myParticipant || myParticipant.status !== "JOINED") {
    return c.json({ error: "You have not joined this call" }, 409);
  }

  await updateCallParticipant(call.id, user.id, {
    status: "LEFT",
    leftAt: new Date(),
  });

  const openCount = await countOpenCallParticipants(call.id);

  if (openCount === 0) {
    await updateCallStatusIf(call.id, ["ACTIVE", "RINGING"], "ENDED", {
      endedAt: new Date(),
    });
    deleteLiveKitRoom(call.roomName).catch(() => undefined);
  }

  const freshCall = await findCallByIdWithParticipants(call.id);
  if (!freshCall) {
    return c.json({ error: "Call not found" }, 404);
  }

  return c.json({ call: toCallDto(freshCall) });
});

export const getCallToken = factory.createHandlers(async (c) => {
  const auth = requireOrgUser(c);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const callId = c.req.param("id");
  if (!callId) {
    return c.json({ error: "ID required" }, 400);
  }

  const call = await findCallByIdWithParticipants(callId);

  if (!call || call.organizationId !== user.organizationId) {
    return c.json({ error: "Call not found" }, 404);
  }

  const myParticipant = call.participants.find((p) => p.userId === user.id);
  if (!myParticipant) {
    return c.json({ error: "You are not a participant of this call" }, 403);
  }

  if (call.status !== "ACTIVE") {
    return c.json({ error: "Call is not active" }, 409);
  }

  if (!isLiveKitConfigured()) {
    return c.json({ error: "LiveKit is not configured" }, 503);
  }

  if (myParticipant.status === "INVITED") {
    await updateCallParticipant(call.id, user.id, {
      status: "JOINED",
      joinedAt: new Date(),
    });
  }

  try {
    const { serverUrl, token } = await issueCallToken(call, user);
    const freshCall = await findCallByIdWithParticipants(call.id);
    if (!freshCall) {
      return c.json({ error: "Call not found" }, 404);
    }
    return c.json({ serverUrl, token, call: toCallDto(freshCall) });
  } catch (error) {
    if (error instanceof LiveKitNotConfiguredError) {
      return c.json({ error: "LiveKit is not configured" }, 503);
    }
    logError(error, { action: "getCallToken", callId: call.id });
    throw error;
  }
});
