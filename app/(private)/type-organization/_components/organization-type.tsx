"use client";

import { DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  message,
  Result,
  Switch,
  Tag,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import type { Role } from "@/http/models/user.model";
import { client } from "@/packages/hono";
import { useCurrentUser } from "../../team-management/_hooks/use-team";

const { Title, Text } = Typography;

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type Organization = {
  id: string;
  name: string;
  members: Member[];
};

type SlackSettings = {
  slackBotTokenEncrypted: boolean;
  slackDefaultChannel: string | null;
};

export default function OrganizationType() {
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const canView = currentUser?.organizationRole === "OWNER";

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["organizations", "all"],
    enabled: !!currentUser,
    queryFn: async () => {
      const res = await client.api.organizations.$get();
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "Failed to load organizations");
      }
      return (await res.json()) as Organization[];
    },
  });

  const { data: slackSettings } = useQuery({
    queryKey: ["organization", "slack-settings"],
    enabled: !!currentUser && !!currentUser.organizationId,
    queryFn: async () => {
      const res = await client.api.organizations["slack-settings"].$get();
      if (!res.ok) return null;
      return (await res.json()) as SlackSettings;
    },
  });

  const updateSlackMutation = useMutation({
    mutationFn: async (data: {
      slackBotToken?: string | null;
      slackDefaultChannel?: string | null;
    }) => {
      const res = await client.api.organizations["slack-settings"].$put({
        json: data,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization", "slack-settings"],
      });
      message.success("Slack settings saved");
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.organizations[":id"].$delete({
        param: { id },
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(body?.error || "Delete failed");
      }

      return await res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations", "all"] });
    },
  });

  const router = useRouter();

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: "Delete Organization",
      content:
        "Are you sure you want to delete this organization? This will also delete its projects and tasks.",
      okText: "Yes",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          message.success("Organization deleted");
          router.push("/select-organization");
        } catch (error) {
          message.error((error as Error).message || "Delete failed");
        }
      },
    });
  };

  if (isLoadingUser) {
    return null;
  }

  if (!canView) {
    return <Result status="403" title="403" subTitle="Forbidden" />;
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          My Organizations
        </Title>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : organizations?.length === 0 ? (
        <p>No organizations</p>
      ) : (
        (organizations ?? []).map((org) => (
          <Card
            key={org.id}
            style={{ marginBottom: 20 }}
            title={org.name}
            extra={
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(org.id)}
                loading={
                  deleteMutation.isPending &&
                  deleteMutation.variables === org.id
                }
              />
            }
          >
            <Title level={5}>Members :</Title>

            {org.members.map((member) => (
              <div
                key={member.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div>
                  <Text strong>{member.name}</Text>
                  <br />
                  <Text type="secondary">{member.email}</Text>
                </div>

                <Tag
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  color={
                    member.role === "OWNER"
                      ? "gold"
                      : member.role === "ADMIN"
                        ? "purple"
                        : "blue"
                  }
                >
                  {member.role}
                </Tag>
              </div>
            ))}
          </Card>
        ))
      )}

      <Card title="Slack Integration" style={{ marginTop: 16 }}>
        <SlackSettingsForm
          initialToken={slackSettings?.slackBotTokenEncrypted}
          initialChannel={slackSettings?.slackDefaultChannel}
          loading={updateSlackMutation.isPending}
          onFinish={(values) =>
            updateSlackMutation.mutate({
              slackBotToken: values.slackBotToken || null,
              slackDefaultChannel: values.slackDefaultChannel || null,
            })
          }
        />
      </Card>
    </div>
  );
}

type SlackFormValues = {
  slackBotToken: string;
  slackDefaultChannel: string;
};

function SlackSettingsForm({
  initialToken,
  initialChannel,
  loading,
  onFinish,
}: {
  initialToken?: boolean;
  initialChannel?: string | null;
  loading?: boolean;
  onFinish: (values: SlackFormValues) => void;
}) {
  const [form] = Form.useForm<SlackFormValues>();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        slackBotToken: "",
        slackDefaultChannel: initialChannel || "",
      }}
      onFinish={onFinish}
    >
      <Form.Item
        name="slackBotToken"
        label="Slack Bot Token (xoxb-...)"
        help="Enter your Slack Bot User OAuth Token"
      >
        <Input.Password placeholder="xoxb-..." style={{ maxWidth: 400 }} />
      </Form.Item>

      <Form.Item
        name="slackDefaultChannel"
        label="Default Channel"
        help="Default channel for task notifications (e.g., #general)"
      >
        <Input placeholder="#general" style={{ maxWidth: 400 }} />
      </Form.Item>

      <Form.Item>
        <Switch checked={!!initialToken} disabled style={{ marginRight: 8 }} />
        <span>Token configured</span>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save Slack Settings
        </Button>
      </Form.Item>
    </Form>
  );
}
