"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, InputNumber, message, Radio } from "antd";
import type { OrganizationLeaveSettings } from "@/http/models/leave.model";
import { client } from "@/packages/hono";

interface LeaveSettingsValues {
  unusedLeavePolicy: "CARRY_OVER" | "PAID_AS_WORKED";
  adminLeaveQuota: number;
  collaboratorLeaveQuota: number;
}

export const LeaveSettingsPanel = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useQuery({
    queryKey: ["current-organization-settings"],
    queryFn: async () => {
      const res = await client.api["leave-requests"].settings.$get();
      const data = await res.json();
      if ("error" in data) return null;
      return data as OrganizationLeaveSettings;
    },
  });

  const { mutateAsync: updateSettings, isPending } = useMutation({
    mutationFn: async (values: LeaveSettingsValues) => {
      const res = await client.api["leave-requests"].settings.$patch({
        json: {
          unusedLeavePolicy: values.unusedLeavePolicy,
          adminLeaveQuota: values.adminLeaveQuota.toString(),
          collaboratorLeaveQuota: values.collaboratorLeaveQuota.toString(),
        },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to update settings");
      }

      return res.json();
    },
    onSuccess: () => {
      message.success("Settings updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["current-organization-settings"],
      });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  if (isLoading) return <div>Loading...</div>;

  const orgData: OrganizationLeaveSettings | null = org ?? null;

  return (
    <Card title="Organization Leave Settings" style={{ maxWidth: 600 }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          unusedLeavePolicy: orgData?.unusedLeavePolicy || "CARRY_OVER",
          adminLeaveQuota: parseFloat(orgData?.adminLeaveQuota || "2.5"),
          collaboratorLeaveQuota: parseFloat(
            orgData?.collaboratorLeaveQuota || "2.0",
          ),
        }}
        onFinish={updateSettings}
      >
        <Form.Item
          name="unusedLeavePolicy"
          label="Unused Leave Policy"
          tooltip="What happens to unused leave at the end of the month?"
        >
          <Radio.Group>
            <Radio value="CARRY_OVER">Carry Over (to next month)</Radio>
            <Radio value="PAID_AS_WORKED">
              Paid as Worked (add to invoice)
            </Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="adminLeaveQuota"
          label="Admin Leave Quota (days/month)"
          rules={[{ required: true }]}
        >
          <InputNumber min={0} max={31} step={0.5} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="collaboratorLeaveQuota"
          label="Collaborator Leave Quota (days/month)"
          rules={[{ required: true }]}
        >
          <InputNumber min={0} max={31} step={0.5} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isPending}>
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
