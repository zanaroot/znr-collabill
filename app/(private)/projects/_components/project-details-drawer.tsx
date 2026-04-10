"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Divider,
  Drawer,
  Empty,
  Flex,
  List,
  Modal,
  message,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { useState } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import {
  useCurrentUser,
  useUsers,
} from "@/app/(private)/team-management/_hooks/use-team";
import type { Project } from "@/http/models/project.model";
import {
  useAddProjectMember,
  useProjectMembers,
  useRemoveProjectMember,
} from "../_hooks/use-projects";

const { Title, Text, Paragraph } = Typography;

interface ProjectDetailsDrawerProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}

export function ProjectDetailsDrawer({
  project,
  open,
  onClose,
}: ProjectDetailsDrawerProps) {
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  const { data: currentUser } = useCurrentUser();
  const { data: members, isLoading: isLoadingMembers } = useProjectMembers(
    project?.id ?? "",
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useUsers();
  const addMemberMutation = useAddProjectMember();
  const removeMemberMutation = useRemoveProjectMember();

  const isAdminOrOwner =
    currentUser?.organizationRole === "OWNER" ||
    currentUser?.organizationRole === "ADMIN";

  const canRemoveUser = (userId: string) => {
    if (!isAdminOrOwner) return false;
    if (
      currentUser?.organizationRole === "OWNER" &&
      userId === currentUser.id
    ) {
      return false;
    }
    return true;
  };

  const { confirm } = Modal;

  const handleGrantAccess = async () => {
    if (!project || !selectedUserId) return;

    try {
      await addMemberMutation.mutateAsync({
        projectId: project.id,
        userId: selectedUserId,
      });
      message.success("Access granted successfully");
      setIsGrantingAccess(false);
      setSelectedUserId(undefined);
    } catch (error) {
      message.error((error as Error).message || "Failed to grant access");
    }
  };

  const handleRemoveAccess = async (userId: string, userName: string) => {
    if (!project) return;

    confirm({
      title: "Remove Access",
      content: `Are you sure you want to remove ${userName} from this project?`,
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await removeMemberMutation.mutateAsync({
            projectId: project.id,
            userId,
          });
          message.success("Access removed successfully");
        } catch (error) {
          message.error((error as Error).message || "Failed to remove access");
        }
      },
    });
  };

  const memberIds = new Set(members?.map((m) => m.id) ?? []);
  const availableUsers = allUsers?.filter((u) => !memberIds.has(u.id)) ?? [];

  return (
    <Drawer
      title="Project Details"
      placement="right"
      size="large"
      onClose={() => {
        setIsGrantingAccess(false);
        setSelectedUserId(undefined);
        onClose();
      }}
      open={open}
      destroyOnHidden
    >
      {project ? (
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <section>
            <Title level={4}>{project.name}</Title>
            <Paragraph type="secondary">
              {project.description || "No description provided."}
            </Paragraph>
            {project.gitRepo && (
              <Text type="secondary">
                Git Repo:{" "}
                <Typography.Link href={project.gitRepo} target="_blank">
                  {project.gitRepo}
                </Typography.Link>
              </Text>
            )}
          </section>

          <Divider />

          <section>
            <Flex
              justify="space-between"
              align="center"
              style={{ marginBottom: 16 }}
            >
              <Title level={5} style={{ margin: 0 }}>
                Team Members
              </Title>
              {!isGrantingAccess && isAdminOrOwner && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={() => setIsGrantingAccess(true)}
                >
                  Grant Access
                </Button>
              )}
            </Flex>

            {isGrantingAccess && (
              <Card
                size="small"
                style={{ marginBottom: 16, backgroundColor: "#fafafa" }}
              >
                <Space orientation="vertical" style={{ width: "100%" }}>
                  <Select
                    showSearch={{
                      filterOption: (input, option) =>
                        (
                          (option as { label: string; value: string })?.label ??
                          ""
                        )
                          .toLowerCase()
                          .includes(input.toLowerCase()),
                    }}
                    placeholder="Select a user to grant access"
                    style={{ width: "100%" }}
                    loading={isLoadingUsers}
                    onChange={setSelectedUserId}
                    value={selectedUserId}
                    options={availableUsers.map((u) => ({
                      label: `${u.name} (${u.email})`,
                      value: u.id,
                    }))}
                  />
                  <Flex gap={8} justify="end">
                    <Button
                      size="small"
                      onClick={() => setIsGrantingAccess(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={handleGrantAccess}
                      loading={addMemberMutation.isPending}
                      disabled={!selectedUserId}
                    >
                      Confirm
                    </Button>
                  </Flex>
                </Space>
              </Card>
            )}

            {isLoadingMembers ? (
              <Flex justify="center" align="center" style={{ padding: 24 }}>
                <Spin />
              </Flex>
            ) : members && members.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={members}
                renderItem={(item) => (
                  <List.Item
                    actions={
                      isAdminOrOwner && canRemoveUser(item.id)
                        ? [
                            <Button
                              key="remove"
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() =>
                                handleRemoveAccess(item.id, item.name)
                              }
                            />,
                          ]
                        : undefined
                    }
                  >
                    <List.Item.Meta
                      avatar={
                        <AvatarProfile
                          src={item.avatar}
                          userName={item.name}
                          userEmail={item.email}
                        />
                      }
                      title={item.name}
                      description={item.email}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No members found" />
            )}
          </section>
        </Space>
      ) : (
        <Empty />
      )}
    </Drawer>
  );
}
