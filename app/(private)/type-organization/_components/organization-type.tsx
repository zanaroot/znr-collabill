"use client";

import { DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  List,
  Modal,
  message,
  Result,
  Tag,
  Typography,
} from "antd";
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

export default function OrganizationType() {
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const canView = currentUser?.organizationRole === "OWNER";

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["organizations", "owned"],
    enabled: !!currentUser && canView,
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
      queryClient.invalidateQueries({ queryKey: ["organizations", "owned"] });
    },
  });

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
      <Title level={2}>My Organizations</Title>

      <List
        loading={isLoading}
        dataSource={organizations ?? []}
        locale={{ emptyText: "No organizations" }}
        renderItem={(org) => (
          <Card
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
            <Title level={5}>Members</Title>

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
        )}
      />
    </div>
  );
}
