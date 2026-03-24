"use client";

import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Flex,
  Input,
  Modal,
  message,
  Select,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import React, { useState } from "react";
import type { CollaboratorRate, UserWithRoles } from "@/http/models/user.model";
import {
  useCollaboratorRates,
  useCurrentUser,
  useDeleteUser,
  useUpdateCollaboratorRates,
  useUpdateUserRole,
  useUsers,
} from "../_hooks/use-team";

const { Title } = Typography;
const { confirm } = Modal;

export function MemberList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [rates, setRates] = useState<CollaboratorRate>(() => ({
    rateXs: "0",
    rateS: "0",
    rateM: "0",
    rateL: "0",
    rateXl: "0",
    dailyRate: "0",
  }));
  const [baseRateM, setBaseRateM] = useState<string>("0");
  const { data: users, isLoading } = useUsers();
  const deleteMutation = useDeleteUser();
  const updateRoleMutation = useUpdateUserRole();
  const updateRatesMutation = useUpdateCollaboratorRates();
  const { data: currentUser } = useCurrentUser();
  const isOwner = currentUser?.organizationRole === "OWNER";
  const { data: currentRates } = useCollaboratorRates(selectedUser?.id || "");

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
    role: "ADMIN" | "COLLABORATOR",
  ) => {
    try {
      await updateRoleMutation.mutateAsync({ id, role });
      message.success("Role updated successfully");
    } catch (error) {
      message.error((error as Error).message || "Failed to update role");
    }
  };

  const openSizeModal = (user: UserWithRoles) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setRates({
      rateXs: "0",
      rateS: "0",
      rateM: "0",
      rateL: "0",
      rateXl: "0",
      dailyRate: "0",
    });
    setBaseRateM("0");
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    try {
      await updateRatesMutation.mutateAsync({
        userId: selectedUser.id,
        rates,
      });
      message.success("Rates updated successfully");
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      message.error((error as Error).message || "Failed to update rates");
    }
  };

  const handleRateChange = (field: keyof CollaboratorRate, value: string) => {
    setRates((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBaseRateMChange = (value: string) => {
    const m = Number(value); // 🔥 mieux que parseFloat

    if (Number.isNaN(m)) return; // sécurité

    setBaseRateM(value);

    setRates({
      rateXs: (m / 4).toString(),
      rateS: (m / 2).toString(),
      rateM: m.toString(),
      rateL: (m * 2).toString(),
      rateXl: (m * 4).toString(),
      dailyRate: rates.dailyRate, // ⚠️ garde l'ancien
    });
  };

  React.useEffect(() => {
    if (currentRates && selectedUser) {
      setRates({
        rateXs: currentRates.rateXs || "0",
        rateS: currentRates.rateS || "0",
        rateM: currentRates.rateM || "0",
        rateL: currentRates.rateL || "0",
        rateXl: currentRates.rateXl || "0",
        dailyRate: currentRates.dailyRate || "0",
      });
      setBaseRateM(currentRates.rateM || "0");
    }
  }, [currentRates, selectedUser]);

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
      render: (role: "ADMIN" | "COLLABORATOR", record) => (
        <Select
          value={role}
          disabled={
            !isOwner ||
            record.id === currentUser?.id ||
            updateRoleMutation.isPending
          }
          onChange={(value) => handleRoleChange(record.id, value)}
          style={{ width: 130 }}
          options={[
            { value: "ADMIN", label: "Admin" },
            { value: "COLLABORATOR", label: "Collaborator" },
          ]}
        />
      ),
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
        <Flex gap={10}>
          {(isOwner || record.id === currentUser?.id) && (
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => openSizeModal(record)}
            />
          )}
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
        </Flex>
      ),
    },
  ];

  return (
    <>
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

      <Modal
        title={`Size settings for ${selectedUser?.name || "Member"}`}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={isOwner ? handleSave : undefined}
        okButtonProps={{ disabled: !isOwner }}
        cancelButtonProps={{ children: isOwner ? "Cancel" : "Close" }}
        confirmLoading={updateRatesMutation.isPending}
      >
        <Flex vertical gap={10}>
          <Flex gap={1} vertical>
            <Input
              prefix="M (Base) :"
              placeholder="0"
              suffix="€"
              value={baseRateM}
              onChange={
                isOwner
                  ? (e) => handleBaseRateMChange(e.target.value)
                  : undefined
              }
              readOnly={!isOwner}
            />
          </Flex>
          <Flex gap={1} vertical>
            <Input
              prefix="XS  :"
              placeholder="0"
              suffix="€"
              value={rates.rateXs}
              readOnly
            />
          </Flex>
          <Flex gap={1} vertical>
            <Input
              prefix="S  :"
              placeholder="0"
              suffix="€"
              value={rates.rateS}
              readOnly
            />
          </Flex>
          <Flex gap={1} vertical>
            <Input
              prefix="L  :"
              placeholder="0"
              suffix="€"
              value={rates.rateL}
              readOnly
            />
          </Flex>
          <Flex gap={1} vertical>
            <Input
              prefix="XL  :"
              placeholder="0"
              suffix="€"
              value={rates.rateXl}
              readOnly
            />
          </Flex>
          <Flex gap={1} vertical>
            <Input
              prefix="Daily :"
              placeholder="0"
              suffix="€"
              value={rates.dailyRate}
              onChange={
                isOwner
                  ? (e) => handleRateChange("dailyRate", e.target.value)
                  : undefined
              }
              readOnly={!isOwner}
            />
          </Flex>
        </Flex>
      </Modal>
    </>
  );
}
