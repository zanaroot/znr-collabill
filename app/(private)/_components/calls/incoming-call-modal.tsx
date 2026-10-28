"use client";

import {
  AudioOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Flex, Modal, Space, Typography } from "antd";
import type { CallDto } from "@/http/models/call.model";

export const IncomingCallModal = ({
  call,
  callerName,
  callerAvatar,
  onAccept,
  onReject,
  accepting,
  rejecting,
}: {
  call: CallDto;
  callerName: string;
  callerAvatar: string | null;
  onAccept: () => void;
  onReject: () => void;
  accepting: boolean;
  rejecting: boolean;
}) => {
  const isVideo = call.type === "VIDEO";

  return (
    <Modal
      open
      title={null}
      footer={null}
      closable={false}
      maskClosable={false}
      centered
      width={360}
      styles={{ body: { padding: "32px 24px", textAlign: "center" } }}
    >
      <Space direction="vertical" size={16} align="center">
        <Avatar size={80} src={callerAvatar || undefined}>
          {callerName.charAt(0).toUpperCase()}
        </Avatar>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            {callerName}
          </Typography.Title>
          <Typography.Text type="secondary">
            {isVideo ? "Incoming video call" : "Incoming audio call"}
          </Typography.Text>
        </div>
        <Flex gap={16} justify="center">
          <Button
            danger
            size="large"
            icon={<PhoneOutlined style={{ transform: "rotate(135deg)" }} />}
            onClick={onReject}
            loading={rejecting}
          >
            Decline
          </Button>
          <Button
            type="primary"
            size="large"
            style={{ background: "#52c41a" }}
            icon={isVideo ? <VideoCameraOutlined /> : <AudioOutlined />}
            onClick={onAccept}
            loading={accepting}
          >
            Accept
          </Button>
        </Flex>
      </Space>
    </Modal>
  );
};
