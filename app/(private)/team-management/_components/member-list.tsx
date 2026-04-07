"use client";

import {
  DeleteOutlined,
  DollarOutlined,
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
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import type { CollaboratorRate, UserWithRoles } from "@/http/models/user.model";
import {
  useCollaboratorRates,
  useCurrentUser,
  useDeleteUser,
  useLeaveOrganization,
  useUpdateCollaboratorRates,
  useUpdateUserRole,
  useUsers,
} from "../_hooks/use-team";

const { Title } = Typography;
const { confirm } = Modal;

export function MemberList() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [rates, setRates] = useState<CollaboratorRate>(() => ({
    organizationId: "",
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
  const leaveMutation = useLeaveOrganization();
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

  const handleLeave = () => {
    const orgId = currentUser?.organizationId;
    if (!orgId) return;

    confirm({
      title: "Are you sure you want to leave this organization?",
      icon: <ExclamationCircleOutlined />,
      content: "You will no longer have access to this organization's data.",
      okText: "Yes, Leave",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await leaveMutation.mutateAsync(orgId);
          message.success("You have left the organization");
          router.push("/select-organization");
        } catch (error) {
          message.error(
            (error as Error).message || "Failed to leave organization",
          );
        }
      },
    });
  };

  const handleRoleChange = async (
    id: string,
    role: "OWNER" | "ADMIN" | "COLLABORATOR",
  ) => {
    const performUpdate = async () => {
      try {
        await updateRoleMutation.mutateAsync({ id, role });
        message.success("Role updated successfully");
      } catch (error) {
        message.error((error as Error).message || "Failed to update role");
      }
    };

    if (role === "OWNER") {
      confirm({
        title: "Transfer Ownership?",
        icon: <ExclamationCircleOutlined />,
        content:
          "This will transfer organization ownership to this member. You will be demoted to ADMIN and will no longer have full owner permissions.",
        okText: "Transfer",
        okType: "danger",
        cancelText: "Cancel",
        onOk: performUpdate,
      });
    } else {
      performUpdate();
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
      organizationId: currentUser?.organizationId || "",
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
    if (!selectedUser || !currentUser?.organizationId) return;

    try {
      await updateRatesMutation.mutateAsync({
        userId: selectedUser.id,
        rates: {
          ...rates,
          organizationId: currentUser.organizationId,
        },
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
    const m = Number(value);

    if (Number.isNaN(m)) return;

    setBaseRateM(value);

    setRates({
      ...rates,
      rateXs: (m / 4).toString(),
      rateS: (m / 2).toString(),
      rateM: m.toString(),
      rateL: (m * 2).toString(),
      rateXl: (m * 4).toString(),
    });
  };

  React.useEffect(() => {
    if (currentRates && selectedUser) {
      setRates({
        organizationId: currentRates.organizationId,
        rateXs: currentRates.rateXs || "0",
        rateS: currentRates.rateS || "0",
        rateM: currentRates.rateM || "0",
        rateL: currentRates.rateL || "0",
        rateXl: currentRates.rateXl || "0",
        dailyRate: currentRates.dailyRate || "0",
      });
      setBaseRateM(currentRates.rateM || "0");
    } else if (currentUser?.organizationId) {
      setRates((prev) => ({
        ...prev,
        organizationId: currentUser?.organizationId || "",
      }));
    }
  }, [currentRates, selectedUser, currentUser?.organizationId]);

  const columns: ColumnsType<UserWithRoles> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      responsive: ["xs", "sm", "md", "lg", "xl"],
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      responsive: ["sm", "md", "lg", "xl"],
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      responsive: ["xs", "sm", "md", "lg", "xl"],
      render: (role: "OWNER" | "ADMIN" | "COLLABORATOR", record) => {
        if (isOwner) {
          return (
            <Select
              value={role}
              disabled={
                record.id === currentUser?.id || updateRoleMutation.isPending
              }
              onChange={(value) => handleRoleChange(record.id, value)}
              style={{ width: "100%", minWidth: 100 }}
              options={[
                { value: "OWNER", label: "Owner" },
                { value: "ADMIN", label: "Admin" },
                { value: "COLLABORATOR", label: "Collaborator" },
              ]}
            />
          );
        } else {
          const roleColors = {
            OWNER: "gold",
            ADMIN: "blue",
            COLLABORATOR: "green",
          };
          return (
            <Tag color={roleColors[role]}>
              {role === "OWNER"
                ? "Owner"
                : role === "ADMIN"
                  ? "Admin"
                  : "Collaborator"}
            </Tag>
          );
        }
      },
    },
    {
      title: "Joined",
      dataIndex: "joinedAt",
      key: "joinedAt",
      responsive: ["md", "lg", "xl"],
      render: (date: string | Date) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      responsive: ["xs", "sm", "md", "lg", "xl"],
      render: (_, record) => (
        <Flex gap={4} wrap="wrap">
          {(isOwner || record.id === currentUser?.id) && (
            <Button
              type="text"
              icon={<DollarOutlined />}
              size="small"
              onClick={() => openSizeModal(record)}
            />
          )}
          {record.id === currentUser?.id
            ? !isOwner && (
                <Button
                  danger
                  onClick={handleLeave}
                  size="small"
                  loading={leaveMutation.isPending}
                >
                  Leave
                </Button>
              )
            : isOwner && (
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => handleDelete(record.id)}
                  loading={
                    deleteMutation.isPending &&
                    deleteMutation.variables === record.id
                  }
                />
              )}
        </Flex>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
            <Title level={4} style={{ margin: 0 }}>
              Team Members
            </Title>
          </Flex>
        }
        styles={{ body: { padding: "12px" } }}
      >
        <div className="table-responsive">
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={isLoading}
            pagination={false}
            scroll={{ x: "max-content" }}
            size="middle"
          />
        </div>
      </Card>

      <Modal
        title={`Size settings for ${selectedUser?.name || "Member"}`}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={isOwner ? handleSave : undefined}
        okButtonProps={{ disabled: !isOwner }}
        cancelButtonProps={{ children: isOwner ? "Cancel" : "Close" }}
        confirmLoading={updateRatesMutation.isPending}
        width={400}
        styles={{ body: { padding: "16px" } }}
      >
        <Flex vertical gap={12}>
          <div>
            <Typography.Text
              strong
              style={{ display: "block", marginBottom: 8 }}
            >
              M (Base)
            </Typography.Text>
            <Input
              prefix="€"
              placeholder="0"
              value={baseRateM}
              onChange={
                isOwner
                  ? (e) => handleBaseRateMChange(e.target.value)
                  : undefined
              }
              readOnly={!isOwner}
            />
          </div>
          <div>
            <Typography.Text
              strong
              style={{ display: "block", marginBottom: 8 }}
            >
              XS
            </Typography.Text>
            <Input prefix="€" placeholder="0" value={rates.rateXs} readOnly />
          </div>
          <div>
            <Typography.Text
              strong
              style={{ display: "block", marginBottom: 8 }}
            >
              S
            </Typography.Text>
            <Input prefix="€" placeholder="0" value={rates.rateS} readOnly />
          </div>
          <div>
            <Typography.Text
              strong
              style={{ display: "block", marginBottom: 8 }}
            >
              L
            </Typography.Text>
            <Input prefix="€" placeholder="0" value={rates.rateL} readOnly />
          </div>
          <div>
            <Typography.Text
              strong
              style={{ display: "block", marginBottom: 8 }}
            >
              XL
            </Typography.Text>
            <Input prefix="€" placeholder="0" value={rates.rateXl} readOnly />
          </div>
          <div>
            <Typography.Text
              strong
              style={{ display: "block", marginBottom: 8 }}
            >
              Daily
            </Typography.Text>
            <Input
              prefix="€"
              placeholder="0"
              value={rates.dailyRate}
              onChange={
                isOwner
                  ? (e) => handleRateChange("dailyRate", e.target.value)
                  : undefined
              }
              readOnly={!isOwner}
            />
          </div>
        </Flex>
      </Modal>
    </>
  );
}
