"use client";

import { AudioOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { Avatar, Button, Flex, Modal, Space, Typography } from "antd";
import type { CallDto } from "@/http/models/call.model";

export const OutgoingCallModal = ({
  call,
  calleeName,
  calleeAvatar,
  onCancel,
  cancelling,
}: {
  call: CallDto;
  calleeName: string;
  calleeAvatar: string | null;
  onCancel: () => void;
  cancelling: boolean;
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
        <Avatar size={80} src={calleeAvatar || undefined}>
          {calleeName.charAt(0).toUpperCase()}
        </Avatar>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            {calleeName}
          </Typography.Title>
          <Typography.Text type="secondary">
            {isVideo ? "Video call" : "Audio call"} &mdash; calling...
          </Typography.Text>
        </div>
        <Flex gap={16} justify="center">
          <Button
            danger
            size="large"
            icon={isVideo ? <VideoCameraOutlined /> : <AudioOutlined />}
            onClick={onCancel}
            loading={cancelling}
          >
            Cancel
          </Button>
        </Flex>
      </Space>
    </Modal>
  );
};
