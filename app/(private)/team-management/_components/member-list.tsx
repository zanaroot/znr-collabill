"use client";

import { DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Modal, message, Select, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UserWithRoles } from "@/http/models/user.model";
import { client } from "@/packages/hono";
import { useDeleteUser, useUpdateUserRole, useUsers } from "../_hooks/use-team";

const { Title } = Typography;
const { confirm } = Modal;

export function MemberList() {
  const { data: users, isLoading } = useUsers();
  const deleteMutation = useDeleteUser();
  const updateRoleMutation = useUpdateUserRole();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await client.api.users.me.$get();
      return await res.json();
    },
  });

  const handleDelete = (id: string) => {
    confirm({
      title: "Are you sure you want to remove this member?",
      icon: <ExclamationCircleOutlined />,
      content: "This action cannot be undone.",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          message.success("Member removed successfully");
        } catch (error) {
          message.error((error as Error).message || "Failed to remove member");
        }
      },
    });
  };

  const handleRoleChange = async (
    id: string,
    role: "OWNER" | "COLLABORATOR",
  ) => {
    try {
      await updateRoleMutation.mutateAsync({ id, role });
      message.success("Role updated successfully");
    } catch (error) {
      message.error((error as Error).message || "Failed to update role");
    }
  };

  const columns: ColumnsType<UserWithRoles> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: "OWNER" | "COLLABORATOR", record) => {
        return (
          <Select
            value={role}
            disabled={
              record.id === currentUser?.id || updateRoleMutation.isPending
            }
            onChange={(value) => handleRoleChange(record.id, value)}
            style={{ width: 130 }}
            options={[
              { value: "OWNER", label: "Owner" },
              { value: "COLLABORATOR", label: "Collaborator" },
            ]}
          />
        );
      },
    },
    {
      title: "Joined At",
      dataIndex: "joinedAt",
      key: "joinedAt",
      render: (date: string | Date) =>
        date ? new Date(date).toLocaleDateString() : "-",
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
          disabled={record.id === currentUser?.id}
          onClick={() => handleDelete(record.id)}
          loading={
            deleteMutation.isPending && deleteMutation.variables === record.id
          }
        />
      ),
    },
  ];

  return (
    <Card
      title={
        <Title level={4} style={{ margin: 0 }}>
          Team Members
        </Title>
      }
    >
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={isLoading}
        pagination={false}
      />
    </Card>
  );
}
