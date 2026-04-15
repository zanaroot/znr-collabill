"use client";

import {
  ApartmentOutlined,
  DeleteOutlined,
  GithubOutlined,
  SlackOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TabsProps } from "antd";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Result,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import type {
  Integration,
  IntegrationFormValues,
} from "@/app/(private)/type-organization/_components/integration-card-form";
import { IntegrationCard } from "@/app/(private)/type-organization/_components/integration-card-form";
import type { IntegrationType } from "@/http/models/integration.model";
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

export const OrganizationType = () => {
  const { message, modal } = App.useApp();
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

  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ["integrations"],
    enabled: !!currentUser && canView,
    queryFn: async () => {
      const res = await client.api.integrations.$get();
      if (!res.ok) return [];
      return res.json() as Promise<Integration[]>;
    },
  });

  const saveIntegrationMutation = useMutation({
    mutationFn: async (data: {
      type: IntegrationType;
      credentials: Record<string, unknown>;
    }) => {
      const res = await client.api.integrations.$post({
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
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      message.success("Integration saved");
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (data: { type: IntegrationType; isActive: boolean }) => {
      const res = await client.api.integrations.toggle.$post({
        json: data,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "Failed to toggle");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      message.success("Integration updated");
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      id,
      hardDelete,
    }: {
      id: string;
      hardDelete?: boolean;
    }) => {
      const res = await client.api.organizations[":id"].$delete({
        param: { id },
        json: { confirmDelete: "DELETE", hardDelete },
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

  const handleDelete = ({
    id,
    hardDelete,
  }: {
    id: string;
    hardDelete?: boolean;
  }) => {
    const isHardDelete = hardDelete ?? false;

    const content = isHardDelete
      ? "This will permanently delete the organization and ALL its data (projects, tasks, invoices, integrations, etc.). This action cannot be undone."
      : "Are you sure you want to delete this organization? This will also delete its projects and tasks.";

    modal.confirm({
      title: "Delete Organization",
      content,
      okText: "Yes, delete it",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync({ id, hardDelete });
          message.success(
            isHardDelete
              ? "Organization permanently deleted"
              : "Organization deleted",
          );
          router.push("/select-organization");
        } catch (error) {
          message.error((error as Error).message || "Delete failed");
        }
      },
    });
  };

  const getIntegration = (type: IntegrationType) =>
    integrations?.find((i) => i.type === type);

  const handleSaveIntegration = (
    type: IntegrationType,
    values: IntegrationFormValues,
  ) => {
    let credentials: Record<string, unknown> = {};

    if (type === "GITHUB" && values.token) {
      credentials = { github: { token: values.token } };
    } else if (type === "SLACK" && values.botToken) {
      credentials = {
        slack: {
          botToken: values.botToken,
          defaultChannel: values.defaultChannel,
        },
      };
    }

    saveIntegrationMutation.mutate({ type, credentials });
  };

  const handleToggleIntegration = (
    type: IntegrationType,
    isActive: boolean,
  ) => {
    toggleMutation.mutate({
      type,
      isActive,
    });
  };

  if (isLoadingUser) {
    return null;
  }

  if (!canView) {
    return <Result status="403" title="403" subTitle="Forbidden" />;
  }

  const tabItems: TabsProps["items"] = [
    {
      key: "members",
      label: (
        <span>
          <TeamOutlined /> Members
        </span>
      ),
      children: (
        <div style={{ padding: "16px 0" }}>
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
                    onClick={() => handleDelete({ id: org.id })}
                    loading={
                      deleteMutation.isPending &&
                      deleteMutation.variables?.id === org.id
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
        </div>
      ),
    },
    {
      key: "integrations",
      label: (
        <span>
          <ApartmentOutlined /> Integrations
        </span>
      ),
      children: (
        <div style={{ padding: "16px 0" }}>
          <Tabs
            defaultActiveKey="slack"
            items={[
              {
                key: "slack",
                label: (
                  <span>
                    <SlackOutlined /> Slack
                  </span>
                ),
                children: (
                  <IntegrationCard
                    integration={getIntegration("SLACK")}
                    loading={
                      saveIntegrationMutation.isPending || integrationsLoading
                    }
                    onSave={(values) => handleSaveIntegration("SLACK", values)}
                    onToggle={(isActive) =>
                      handleToggleIntegration("SLACK", isActive)
                    }
                    renderForm={(_form, disabled) => (
                      <>
                        <Form.Item
                          name="botToken"
                          label="Slack Bot Token (xoxb-...)"
                          help="Enter your Slack Bot User OAuth Token"
                        >
                          <Input.Password
                            placeholder="xoxb-..."
                            disabled={disabled}
                          />
                        </Form.Item>

                        <Form.Item
                          name="defaultChannel"
                          label="Default Channel"
                          help="Default channel for task notifications (e.g., #general)"
                        >
                          <Input placeholder="#general" disabled={disabled} />
                        </Form.Item>
                      </>
                    )}
                  />
                ),
              },
              {
                key: "github",
                label: (
                  <span>
                    <GithubOutlined /> GitHub
                  </span>
                ),
                children: (
                  <IntegrationCard
                    integration={getIntegration("GITHUB")}
                    loading={
                      saveIntegrationMutation.isPending || integrationsLoading
                    }
                    onSave={(values) => handleSaveIntegration("GITHUB", values)}
                    onToggle={(isActive) =>
                      handleToggleIntegration("GITHUB", isActive)
                    }
                    renderForm={(_form, disabled) => (
                      <Form.Item
                        name="token"
                        label="GitHub Personal Access Token"
                        help="Enter your GitHub Personal Access Token with repo scope"
                      >
                        <Input.Password
                          placeholder="ghp_..."
                          disabled={disabled}
                        />
                      </Form.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        </div>
      ),
    },
  ];

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

      <Tabs items={tabItems} />
    </div>
  );
};
