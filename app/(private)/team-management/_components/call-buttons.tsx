"use client";

import { AudioOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { App, Button, Space, Tooltip } from "antd";
import type { MouseEvent } from "react";
import {
  useActiveCalls,
  useStartCall,
} from "@/app/(private)/_components/calls/_hooks/use-calls";
import type { CallType } from "@/http/models/call.model";

export const CallButtons = ({
  memberUserId,
  memberName,
  currentUserId,
}: {
  memberUserId: string;
  memberName: string;
  currentUserId?: string;
}) => {
  const { message } = App.useApp();
  const startCall = useStartCall();
  const { data: activeCalls } = useActiveCalls();

  const inCall = (activeCalls ?? []).length > 0;

  const handleCall = (type: CallType, event: MouseEvent) => {
    event.stopPropagation();
    startCall.mutate(
      { calleeId: memberUserId, type },
      {
        onSuccess: () => {
          message.success(`Calling ${memberName}...`);
        },
        onError: (error) => {
          message.error(error.message);
        },
      },
    );
  };

  if (memberUserId === currentUserId) {
    return null;
  }

  return (
    <Space size={4}>
      <Tooltip title="Start audio call">
        <Button
          type="text"
          icon={<AudioOutlined />}
          size="small"
          disabled={inCall}
          loading={startCall.isPending}
          onClick={(event) => handleCall("AUDIO", event)}
        />
      </Tooltip>
      <Tooltip title="Start video call">
        <Button
          type="text"
          icon={<VideoCameraOutlined />}
          size="small"
          disabled={inCall}
          loading={startCall.isPending}
          onClick={(event) => handleCall("VIDEO", event)}
        />
      </Tooltip>
    </Space>
  );
};
