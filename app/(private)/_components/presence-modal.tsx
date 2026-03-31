"use client";

import { useMutation } from "@tanstack/react-query";
import { Button, Flex, Modal, message, Radio, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import {
  PRESENCE_STATUSES,
  type PresenceStatus,
} from "@/http/models/presence.model";
import { client } from "@/packages/hono";

const { Text, Title } = Typography;

interface PresenceModalProps {
  open: boolean;
  organizationId?: string;
  onSuccess: () => void;
}

export const PresenceModal = ({ open, onSuccess }: PresenceModalProps) => {
  const [status, setStatus] = useState<PresenceStatus>("OFFICE");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    }
  }, [open]);

  const { mutateAsync: markPresence, isPending } = useMutation({
    mutationFn: async (payload: { status: PresenceStatus }) => {
      const res = await client.api.presence.$post({
        json: payload,
      });
      const result = await res.json();
      if (!res.ok) {
        const errorData = result as { error?: string };
        throw new Error(errorData.error || "Failed to mark presence");
      }
      return result;
    },
    onSuccess: () => {
      message.success("Presence marked successfully!");
      setIsVisible(false);
      onSuccess();
    },
    onError: (error: Error) => {
      message.error(error.message || "Failed to mark presence");
    },
  });

  const handleCheckIn = async () => {
    await markPresence({ status });
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
      <Flex vertical align="center" className="py-6 text-center">
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
          style={{ height: 48, borderRadius: 8, marginTop: 24 }}
        >
          Check-in for today
        </Button>
      </Flex>
    </Modal>
  );
};
