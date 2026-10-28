"use client";

import { App, Button, Result, Spin } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { LiveKitMeetingView } from "@/app/(private)/_components/calls/livekit-meeting-view";
import { useJoinMeeting, useLeaveMeeting } from "../../_hooks/use-meetings";

export const MeetingRoomClient = ({
  meetingId,
  meetingTitle,
}: {
  meetingId: string;
  meetingTitle: string;
}) => {
  const router = useRouter();
  const { message } = App.useApp();
  const leaveMeeting = useLeaveMeeting(meetingId);
  const hasJoinedRef = useRef(false);

  const {
    mutate: joinMutate,
    data: tokenData,
    error: joinError,
    isPending: joining,
  } = useJoinMeeting();

  useEffect(() => {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    joinMutate(meetingId);
  }, [joinMutate, meetingId]);

  const handleLeave = () => {
    leaveMeeting.mutate();
    router.push("/meetings");
  };

  if (joinError) {
    return (
      <Result
        status="warning"
        title="Unable to join meeting"
        subTitle={(joinError as Error).message}
        extra={
          <Button type="primary" onClick={() => router.push("/meetings")}>
            Back to meetings
          </Button>
        }
      />
    );
  }

  if (joining || !tokenData) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 16,
        }}
      >
        <Spin size="large" />
        <span>Joining {meetingTitle}...</span>
      </div>
    );
  }

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
};
