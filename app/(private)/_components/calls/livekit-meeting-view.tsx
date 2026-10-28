"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import type { MediaDeviceFailure } from "livekit-client";
import "@livekit/components-styles";
import { App } from "antd";

export const LiveKitMeetingView = ({
  serverUrl,
  token,
  onDisconnected,
  onMediaDeviceFailure,
}: {
  serverUrl: string;
  token: string;
  onDisconnected: () => void;
  onMediaDeviceFailure?: (
    failure?: MediaDeviceFailure,
    kind?: MediaDeviceKind,
  ) => void;
}) => {
  const { message } = App.useApp();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "#000",
      }}
    >
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect
        audio
        video
        onDisconnected={onDisconnected}
        onError={(error) => {
          message.error(error.message || "Call connection error");
        }}
        onMediaDeviceFailure={onMediaDeviceFailure}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};
