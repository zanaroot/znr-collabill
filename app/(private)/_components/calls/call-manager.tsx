"use client";

import { App, Button } from "antd";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/app/(private)/team-management/_hooks/use-team";
import type { CallDto } from "@/http/models/call.model";
import {
  useAcceptCall,
  useActiveCalls,
  useCallToken,
  useCancelCall,
  useLeaveCall,
  useRejectCall,
} from "./_hooks/use-calls";
import { IncomingCallModal } from "./incoming-call-modal";
import { LiveKitMeetingView } from "./livekit-meeting-view";
import { OutgoingCallModal } from "./outgoing-call-modal";

const getOtherParticipant = (call: CallDto, userId: string) =>
  call.participants.find((participant) => participant.userId !== userId) ??
  call.participants[0];

export const CallManager = () => {
  const { message } = App.useApp();
  const { data: currentUser } = useCurrentUser();
  const { data: activeCalls } = useActiveCalls();
  const acceptCall = useAcceptCall();
  const rejectCall = useRejectCall();
  const cancelCall = useCancelCall();
  const leaveCall = useLeaveCall();
  const [connectedCallId, setConnectedCallId] = useState<string | null>(null);
  const previousRingingIdsRef = useRef<Set<string>>(new Set());

  const myId = currentUser?.id;

  const incomingCall = activeCalls?.find(
    (call) =>
      call.status === "RINGING" &&
      call.participants.some(
        (participant) =>
          participant.userId === myId && participant.status === "INVITED",
      ),
  );

  const outgoingCall = activeCalls?.find(
    (call) => call.status === "RINGING" && call.initiatedBy === myId,
  );

  const activeCall = activeCalls?.find(
    (call) =>
      call.status === "ACTIVE" &&
      call.participants.some(
        (participant) =>
          participant.userId === myId &&
          !participant.leftAt &&
          participant.status !== "REJECTED" &&
          participant.status !== "MISSED",
      ),
  );

  useEffect(() => {
    if (!activeCalls || !myId) return;

    const ringingIds = new Set(
      activeCalls
        .filter(
          (call) => call.initiatedBy === myId && call.status === "RINGING",
        )
        .map((call) => call.id),
    );

    for (const id of previousRingingIdsRef.current) {
      if (!ringingIds.has(id) && id !== activeCall?.id) {
        message.info("Call ended");
      }
    }

    previousRingingIdsRef.current = ringingIds;
  }, [activeCalls, activeCall?.id, myId, message]);

  const joinedCallId = connectedCallId ?? activeCall?.id ?? null;

  const {
    data: tokenData,
    error: tokenError,
    refetch: refetchToken,
  } = useCallToken(joinedCallId ?? "", Boolean(joinedCallId));

  if (!myId) {
    return null;
  }

  const handleLeave = () => {
    const callId = joinedCallId;
    setConnectedCallId(null);
    if (callId) {
      leaveCall.mutate(callId);
    }
  };

  const inCall = Boolean(activeCall) || Boolean(tokenData && joinedCallId);

  if (inCall && joinedCallId) {
    if (tokenData && tokenData.call.id === joinedCallId) {
      return (
        <LiveKitMeetingView
          serverUrl={tokenData.serverUrl}
          token={tokenData.token}
          onDisconnected={handleLeave}
          onMediaDeviceFailure={() => {
            message.error(
              "Camera or microphone access failed. Check browser permissions.",
            );
          }}
        />
      );
    }

    return (
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1100,
          background: "#141414",
          color: "#fff",
          padding: "16px 24px",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span>{tokenError ? "Failed to join call" : "Connecting..."}</span>
        {tokenError ? (
          <Button
            type="link"
            size="small"
            onClick={() => {
              setConnectedCallId(null);
              refetchToken();
            }}
          >
            Retry
          </Button>
        ) : null}
        <Button type="link" size="small" danger onClick={handleLeave}>
          Leave
        </Button>
      </div>
    );
  }

  return (
    <>
      {incomingCall ? (
        <IncomingCallModal
          call={incomingCall}
          callerName={
            getOtherParticipant(incomingCall, myId)?.user?.name ?? "Unknown"
          }
          callerAvatar={
            getOtherParticipant(incomingCall, myId)?.user?.avatar ?? null
          }
          accepting={acceptCall.isPending}
          rejecting={rejectCall.isPending}
          onAccept={() => acceptCall.mutate(incomingCall.id)}
          onReject={() => rejectCall.mutate(incomingCall.id)}
        />
      ) : null}

      {outgoingCall ? (
        <OutgoingCallModal
          call={outgoingCall}
          calleeName={
            getOtherParticipant(outgoingCall, myId)?.user?.name ?? "Unknown"
          }
          calleeAvatar={
            getOtherParticipant(outgoingCall, myId)?.user?.avatar ?? null
          }
          cancelling={cancelCall.isPending}
          onCancel={() => cancelCall.mutate(outgoingCall.id)}
        />
      ) : null}
    </>
  );
};
