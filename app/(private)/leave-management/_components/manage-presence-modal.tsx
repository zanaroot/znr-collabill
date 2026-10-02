"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, DatePicker, Form, Modal, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useUsers } from "@/app/(private)/team-management/_hooks/use-team";
import type { PresenceStatus } from "@/http/models/presence.model";
import { toReadable } from "@/lib/text";
import { client } from "@/packages/hono";

export interface ManagePresenceTarget {
  date: string;
  userId?: string;
  userName?: string;
  status?: PresenceStatus;
}

interface ManagePresenceFormValues {
  userId: string;
  status: PresenceStatus;
  date: Dayjs;
}

interface ManagePresenceModalProps {
  open: boolean;
  target: ManagePresenceTarget | null;
  onClose: () => void;
}

const PRESENCE_STATUS_OPTIONS = (
  ["OFFICE", "REMOTE", "HALF_DAY", "SICK", "VACATION", "ON_LEAVE"] as const
).map((status) => ({
  value: status,
  label: toReadable(status),
}));

export const ManagePresenceModal = ({
  open,
  target,
  onClose,
}: ManagePresenceModalProps) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data: members } = useUsers();

  const memberOptions =
    members?.map((member) => ({
      value: member.id,
      label: member.name,
    })) ?? [];

  const { mutateAsync: updatePresence, isPending } = useMutation({
    mutationFn: async (payload: {
      userId: string;
      date: string;
      status: PresenceStatus;
    }) => {
      const res = await client.api.presence.member[":userId"].$patch({
        param: { userId: payload.userId },
        json: { date: payload.date, status: payload.status },
      });

      const result = await res.json();

      if (!res.ok) {
        const errorData = result as { error?: string };
        throw new Error(errorData.error || "Failed to update presence");
      }

      return result;
    },

    onSuccess: () => {
      message.success("Presence updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["all-presences"] });
      queryClient.invalidateQueries({ queryKey: ["my-presences"] });
      queryClient.invalidateQueries({ queryKey: ["member-presences"] });
      queryClient.invalidateQueries({ queryKey: ["today-presence"] });
      onClose();
    },

    onError: (error: Error) => {
      message.error(error.message || "Failed to update presence");
    },
  });

  const onFinish = (values: ManagePresenceFormValues) => {
    updatePresence({
      userId: values.userId,
      date: values.date.format("YYYY-MM-DD"),
      status: values.status,
    });
  };

  return (
    <Modal
      title={
        target?.userName
          ? `Manage presence · ${target.userName}`
          : "Mark presence"
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      centered
      width={420}
    >
      <Form
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          userId: target?.userId,
          status: target?.status ?? "OFFICE",
          date: target ? dayjs(target.date) : dayjs(),
        }}
      >
        <Form.Item
          name="userId"
          label="Team member"
          rules={[{ required: true, message: "Please select a member" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Select a member"
            options={memberOptions}
          />
        </Form.Item>

        <Form.Item
          name="status"
          label="Presence status"
          rules={[{ required: true, message: "Please select a status" }]}
        >
          <Select options={PRESENCE_STATUS_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="date"
          label="Date"
          rules={[{ required: true, message: "Please select a date" }]}
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item className="mb-0 text-right">
          <Button onClick={onClose} className="mr-2">
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={isPending}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};
