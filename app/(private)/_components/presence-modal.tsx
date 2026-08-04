"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Flex, Modal, message, Radio, Typography } from "antd";
import { useEffect, useState } from "react";
import { getGreeting } from "@/app/_utils/get-greeting";
import type { PresenceStatus } from "@/http/models/presence.model";
import { client } from "@/packages/hono";
import { useOrganizationAttendanceSettings } from "../type-organization/_components/hooks/use-organization-attendance-settings";

const { Text, Title } = Typography;

interface PresenceModalProps {
  open: boolean;
  organizationId?: string;
  userName?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const PresenceModal = ({
  open,
  onSuccess,
  organizationId,
  onClose,
  userName,
}: PresenceModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<PresenceStatus>();

  const { data: attendanceData } =
    useOrganizationAttendanceSettings(
      organizationId || "",
    );

  const attendanceSettings = attendanceData?.settings;
  const presenceSelectionEnabled =
    attendanceData?.presenceSelectionEnabled ?? false;


  const { data: todayPresence, refetch: refetchPresence } = useQuery({
    queryKey: ["today-presence"],
    queryFn: async () => {
      const res = await client.api.presence.today.$get();
      return res.json();
    },
    enabled: open,
  });

  const isAlreadyPresent = !!todayPresence;


  useEffect(() => {
    if (open) {
      setIsVisible(true);
      refetchPresence();
    }
  }, [open, refetchPresence]);


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


  useEffect(() => {
    if (!attendanceSettings?.length) return;

    // Switch OFF => présence automatique OFFICE
    if (!presenceSelectionEnabled) {
      setStatus("OFFICE");
      return;
    }

    // Switch ON => première présence active par défaut
    const firstEnabled = attendanceSettings.find(
      (item) => item.enabled,
    );

    if (firstEnabled) {
      setStatus(firstEnabled.type as PresenceStatus);
    }
  }, [
    attendanceSettings,
    presenceSelectionEnabled,
  ]);


  const handleCheckIn = async () => {
    if (isAlreadyPresent || isPending || !status) return;

    await markPresence({
      status,
    });
  };


  const handleCancel = () => {
    setIsVisible(false);
    onClose();
  };


  const handleAfterClose = () => {
    setIsVisible(false);
  };


  return (
    <Modal
      title={null}
      open={isVisible}
      onCancel={handleCancel}
      afterClose={handleAfterClose}
      footer={null}
      centered
      width={400}
    >
      <Flex vertical align="center" className="py-6 text-center">

        <Title level={4}>
          {getGreeting(userName)}
        </Title>

        {isAlreadyPresent ? (
          <Text type="secondary" className="mb-6 block">
            You are already marked as present for today.
            <br />
            Have a productive day!
          </Text>
        ) : (
          <Text type="secondary" className="mb-6 block">
            Ready to start your day?
            <br />
            Check in to begin tracking your work and activity.
          </Text>
        )}


        {presenceSelectionEnabled && (
          <Radio.Group
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
            disabled={isAlreadyPresent}
            style={{
              width: "100%",
              marginTop: 24,
            }}
          >
            <Flex vertical gap={12}>
              {attendanceSettings
                ?.filter((setting) => setting.enabled)
                .map((setting) => (
                  <Radio
                    key={setting.type}
                    value={setting.type}
                  >
                    {setting.type === "OFFICE" &&
                      "🏢 Office"}

                    {setting.type === "REMOTE" &&
                      "💻 Remote"}

                    {setting.type === "ON_SITE" &&
                      "📍 On Site"}
                  </Radio>
                ))}


              {attendanceSettings?.every(
                (setting) => !setting.enabled,
              ) && (
                  <Text type="danger">
                    No presence type available. Contact your administrator.
                  </Text>
                )}

            </Flex>
          </Radio.Group>
        )}


        <Button
          type="primary"
          block
          loading={isPending}
          disabled={isAlreadyPresent}
          onClick={handleCheckIn}
          style={{
            height: 48,
            borderRadius: 8,
            marginTop: 24,
          }}
        >
          {isAlreadyPresent
            ? "Already Checked In"
            : "Check-in for today"}
        </Button>

      </Flex>
    </Modal>
  );
};