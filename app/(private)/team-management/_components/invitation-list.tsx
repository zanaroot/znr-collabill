"use client";

import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { App, Button, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Invitation } from "@/http/models/user.model";
import {
  useCurrentUser,
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from "../_hooks/use-team";

const { Title } = Typography;

export const InvitationList = () => {
  const { data: invitations, isLoading } = useInvitations();
  const revokeMutation = useRevokeInvitation();
  const resendMutation = useResendInvitation();
  const { data: currentUser } = useCurrentUser();

  const { message, modal } = App.useApp();

  const handleRevoke = (id: string) => {
    modal.confirm({
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

  const handleResend = async (id: string) => {
    try {
      await resendMutation.mutateAsync(id);
      message.success("Invitation resent successfully");
    } catch (_error) {
      message.error("Failed to resend invitation");
    }
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
      render: (role: string) => {
        const color =
          role === "OWNER" ? "gold" : role === "ADMIN" ? "purple" : "blue";
        return <Tag color={color}>{role}</Tag>;
      },
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
      width: 150,
      render: (_, record) => (
        <>
          <Button
            icon={<SendOutlined />}
            size="small"
            onClick={() => handleResend(record.id)}
            loading={
              resendMutation.isPending && resendMutation.variables === record.id
            }
            style={{ marginRight: 8 }}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleRevoke(record.id)}
            loading={
              revokeMutation.isPending && revokeMutation.variables === record.id
            }
          />
        </>
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
};
