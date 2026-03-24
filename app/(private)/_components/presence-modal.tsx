"use client";

import { Button, Modal, message, Radio, Space, Typography } from "antd";
import { useEffect, useState, useTransition } from "react";
import { markPresenceAction } from "@/http/actions/presence.action";
import {
  PRESENCE_STATUSES,
  type PresenceStatus,
} from "@/http/models/presence.model";

const { Text, Title } = Typography;

interface PresenceModalProps {
  open: boolean;
  organizationId?: string;
  onSuccess: () => void;
}

export const PresenceModal = ({
  open,
  organizationId,
  onSuccess,
}: PresenceModalProps) => {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<PresenceStatus>("OFFICE");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    }
  }, [open]);

  const handleCheckIn = () => {
    if (!organizationId) {
      message.error("Organization ID is required");
      return;
    }
    startTransition(async () => {
      const result = await markPresenceAction({ status, organizationId });
      if (result.success) {
        message.success("Presence marked successfully!");
        setIsVisible(false);
        onSuccess();
      } else {
        message.error(result.error || "Failed to mark presence");
      }
    });
  };

  return (
    <Modal
      title={null}
      open={isVisible}
      closable={false}
      maskClosable={false}
      footer={null}
      centered
      width={400}
    >
      <div className="flex flex-col items-center py-6 text-center">
        <Title level={4}>👋 Welcome back!</Title>
        <Text type="secondary" className="mb-6 block">
          Please mark your presence for today to continue.
        </Text>

        <Radio.Group
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          className="mb-8"
        >
          <Space orientation="vertical" className="w-full">
            {PRESENCE_STATUSES.map((s) => (
              <Radio.Button
                key={s}
                value={s}
                className="w-full h-12 flex items-center justify-center rounded-lg!"
              >
                {s}
              </Radio.Button>
            ))}
          </Space>
        </Radio.Group>

        <Button
          type="primary"
          size="large"
          block
          loading={isPending}
          onClick={handleCheckIn}
          style={{ height: 48, borderRadius: 8 }}
        >
          Check-in for today
        </Button>
      </div>
    </Modal>
  );
};
