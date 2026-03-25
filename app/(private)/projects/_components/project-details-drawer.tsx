"use client";

import { PlusOutlined, UserOutlined } from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Drawer,
  Empty,
  Flex,
  List,
  message,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { useState } from "react";
import { useUsers } from "@/app/(private)/team-management/_hooks/use-team";
import type { Project } from "@/http/models/project.model";
import { getAvatarUrl } from "@/lib/get-avatar-url";
import { useAddProjectMember, useProjectMembers } from "../_hooks/use-projects";

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

  const { data: members, isLoading: isLoadingMembers } = useProjectMembers(
    project?.id ?? "",
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useUsers();
  const addMemberMutation = useAddProjectMember();

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
      destroyOnClose
    >
      {project ? (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
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
              {!isGrantingAccess && (
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
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Select
                    showSearch
                    placeholder="Select a user to grant access"
                    style={{ width: "100%" }}
                    loading={isLoadingUsers}
                    onChange={setSelectedUserId}
                    value={selectedUserId}
                    filterOption={(input, option) =>
                      (
                        (option as { label: string; value: string })?.label ??
                        ""
                      )
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
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
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          src={getAvatarUrl(item.avatar, item.email)}
                          icon={<UserOutlined />}
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
