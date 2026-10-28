"use client";

import {
  DeleteOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { App, Button, Card, Flex, Input, Modal, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import { EmailVerificationStatus } from "@/app/(private)/_components/email-verification-status";
import { CallButtons } from "@/app/(private)/team-management/_components/call-buttons";
import { DetailMembers } from "@/app/(private)/team-management/_components/detail-mebers";
import { InviteUserModal } from "@/app/(private)/team-management/_components/invite-user-modal";
import { MemberRole } from "@/app/(private)/team-management/_components/member-role";
import { OnlineStatusTag } from "@/app/(private)/team-management/_components/online-status-tag";
import type {
  CollaboratorRate,
  Role,
  UserWithRoles,
} from "@/http/models/user.model";
import { client } from "@/packages/hono";
import {
  useCollaboratorRates,
  useCurrentUser,
  useDeleteUser,
  useLeaveOrganization,
  useMembersOnlineStatus,
  useUpdateCollaboratorRates,
  useUpdateUserRole,
  useUsers,
} from "../_hooks/use-team";

const { Title } = Typography;

type VerificationResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

export const MemberList = () => {
  const router = useRouter();

  const { message, modal } = App.useApp();

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
  const [selectedMember, setSelectedMember] = useState<UserWithRoles | null>(
    null,
  );
  const [baseRateM, setBaseRateM] = useState<string>("0");
  const { data: users, isLoading } = useUsers();
  const { data: onlineStatuses } = useMembersOnlineStatus();
  const onlineByUserId = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const status of onlineStatuses ?? []) {
      map.set(status.id, status.isOnline);
    }
    return map;
  }, [onlineStatuses]);
  const deleteMutation = useDeleteUser();
  const leaveMutation = useLeaveOrganization();
  const updateRoleMutation = useUpdateUserRole();
  const updateRatesMutation = useUpdateCollaboratorRates();
  const { data: currentUser } = useCurrentUser();

  const isOwner = currentUser?.organizationRole === "OWNER";
  const isAdmin =
    currentUser?.organizationRole === "OWNER" ||
    currentUser?.organizationRole === "ADMIN";
  const canManageMembers = isOwner || isAdmin;
  const { data: currentRates } = useCollaboratorRates(selectedUser?.id || "");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openDetails = (member: UserWithRoles) => {
    setSelectedMember(member);
    setDetailsOpen(true);
  };

  const handleDelete = (id: string) => {
    modal.confirm({
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

    modal.confirm({
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

  const handleRoleChange = async (id: string, role: Role) => {
    const performUpdate = async () => {
      try {
        await updateRoleMutation.mutateAsync({ id, role });
        message.success("Role updated successfully");
      } catch (error) {
        message.error((error as Error).message || "Failed to update role");
      }
    };

    if (role === "OWNER") {
      modal.confirm({
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

  const {
    mutateAsync: sendVerificationEmail,
    isPending: isSendingVerification,
    variables: verificationUserId,
  } = useMutation({
    mutationFn: async (userId: string) => {
      const res = await client.api.auth["email-verification"]["send-member"][
        ":userId"
      ].$post({
        param: { userId },
      });

      const result = (await res.json()) as VerificationResponse;

      if (!res.ok || result.success === false) {
        throw new Error(
          result.error || "Unable to send the verification email.",
        );
      }

      return result;
    },
  });

  const handleVerifyEmail = async (userId: string) => {
    try {
      const result = await sendVerificationEmail(userId);

      message.success(
        result.message ||
        "Verification email sent. Please check the member's inbox.",
      );
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Unable to send the verification email.",
      );

      throw error;
    }
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
      render: (text: string, record: UserWithRoles) => (
        <Flex align="center" gap={8}>
          <AvatarProfile
            src={record.avatar}
            userName={record.name}
            userEmail={record.email}
            size={32}
          />
          <Typography.Text strong>{text}</Typography.Text>
        </Flex>
      ),
    },

    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      responsive: ["sm", "md", "lg", "xl"],
      render: (email: string, record: UserWithRoles) => (
        <EmailVerificationStatus
          email={email}
          emailVerified={record.emailVerified}
          onVerify={() => handleVerifyEmail(record.id)}
          loading={isSendingVerification && verificationUserId === record.id}
        />
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      responsive: ["xs", "sm", "md", "lg", "xl"],
      render: (role: Role, record) => (
        <MemberRole
          role={role}
          isOwner={isOwner}
          isCurrentUser={record.id === currentUser?.id}
          loading={updateRoleMutation.isPending}
          onChange={(value) => handleRoleChange(record.id, value)}
        />
      ),
    },
    {
      title: "Status",
      key: "status",
      responsive: ["xs", "sm", "md", "lg", "xl"],
      render: (_, record: UserWithRoles) => (
        <OnlineStatusTag isOnline={onlineByUserId.get(record.id) ?? false} />
      ),
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
      width: 150,
      responsive: ["xs", "sm", "md", "lg", "xl"],
      render: (_, record) => (
        <Flex gap={4} wrap="wrap">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openDetails(record);
            }}
          />

          {record.id !== currentUser?.id && (
            <CallButtons
              memberUserId={record.id}
              memberName={record.name}
              currentUserId={currentUser?.id}
            />
          )}

          {(isOwner || record.id === currentUser?.id) && (
            <Button
              type="text"
              icon={<DollarOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                openSizeModal(record);
              }}
            />
          )}

          {record.id === currentUser?.id
            ? !isOwner && (
              <Button
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  handleLeave();
                }}
                size="small"
                loading={leaveMutation.isPending}
              >
                Leave
              </Button>
            )
            : canManageMembers && (
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(record.id);
                }}
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
            <InviteUserModal />
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

      <DetailMembers
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        member={selectedMember}
      />
    </>
  );
};
