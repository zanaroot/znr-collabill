"use client";

import { App, Button, Form, Input, Switch } from "antd";
import { useState } from "react";
import type { Project } from "@/http/models/project.model";
import { client } from "@/packages/hono";

type SlackFormValues = {
  slackChannel: string;
  slackNotificationsEnabled: boolean;
};

export const ProjectSlackSettingsForm = ({ project }: { project: Project }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<SlackFormValues>();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: SlackFormValues) => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await client.api.projects[":id"]["slack-settings"].$put({
        param: { id: project.id },
        json: {
          slackChannel: values.slackChannel || null,
          slackNotificationsEnabled: values.slackNotificationsEnabled,
        },
      });

      if (res.ok) {
        message.success("Slack settings saved");
      } else {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        message.error(body?.error || "Failed to save");
      }
    } catch {
      message.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        slackChannel: project.slackChannel || "",
        slackNotificationsEnabled: project.slackNotificationsEnabled ?? true,
      }}
      onFinish={handleFinish}
    >
      <Form.Item name="slackChannel" label="Channel ID">
        <Input placeholder="#general or C01234ABC" style={{ maxWidth: 300 }} />
      </Form.Item>

      <Form.Item
        name="slackNotificationsEnabled"
        label="Enable notifications"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save
        </Button>
      </Form.Item>
    </Form>
  );
};
