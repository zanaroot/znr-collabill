"use client";

import { DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Button, Card, Modal, message, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Invitation } from "@/http/models/user.model";
import {
  useCurrentUser,
  useInvitations,
  useRevokeInvitation,
} from "../_hooks/use-team";

const { Title } = Typography;
const { confirm } = Modal;

export function InvitationList() {
  const { data: invitations, isLoading } = useInvitations();
  const revokeMutation = useRevokeInvitation();
  const { data: currentUser } = useCurrentUser();

  const handleRevoke = (id: string) => {
    confirm({
      title: "Are you sure you want to revoke this invitation?",
      icon: <ExclamationCircleOutlined />,
      content: "The invitee will no longer be able to use the link.",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await revokeMutation.mutateAsync(id);
          message.success("Invitation revoked successfully");
        } catch (_error) {
          message.error("Failed to revoke invitation");
        }
      },
    });
  };

  const columns: ColumnsType<Invitation> = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string) => (
        <Tag color={role === "OWNER" ? "gold" : "blue"}>{role}</Tag>
      ),
    },
    {
      title: "Expires At",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (date: string | Date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => handleRevoke(record.id)}
          loading={
            revokeMutation.isPending && revokeMutation.variables === record.id
          }
        />
      ),
    },
  ];

  if (
    !invitations ||
    invitations.length === 0 ||
    currentUser?.organizationRole !== "OWNER"
  ) {
    return null;
  }

  return (
    <Card
      title={
        <Title level={4} style={{ margin: 0 }}>
          Pending Invitations
        </Title>
      }
      style={{ marginTop: 24 }}
    >
      <Table
        columns={columns}
        dataSource={invitations}
        rowKey="id"
        loading={isLoading}
        pagination={false}
      />
    </Card>
  );
}
