"use client";

import { useMutation } from "@tanstack/react-query";
import { Button, Flex, Modal, message, Typography } from "antd";
import { useEffect, useState } from "react";
import type { PresenceStatus } from "@/http/models/presence.model";
import { getGreeting } from "@/lib/get-greeting";
import { client } from "@/packages/hono";

const { Text, Title } = Typography;

interface PresenceModalProps {
  open: boolean;
  organizationId?: string;
  userName?: string;
  onSuccess: () => void;
}

export const PresenceModal = ({
  open,
  onSuccess,
  userName,
}: PresenceModalProps) => {
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
    await markPresence({ status: "REMOTE" });
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
        <Title level={4}>{getGreeting(userName)}</Title>
        <Text type="secondary" className="mb-6 block">
          Ready to start your day? <br />
          Check in to begin tracking your work and activity.
        </Text>
        <Button
          type="primary"
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
