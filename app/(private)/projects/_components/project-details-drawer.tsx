"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  App,
  Button,
  Card,
  Divider,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import { ProjectSlackSettingsForm } from "@/app/(private)/projects/_components/project-slack-settings-form";
import {
  useCurrentUser,
  useUsers,
} from "@/app/(private)/team-management/_hooks/use-team";
import {
  type CreateProjectInput,
  createProjectSchema,
  type Project,
} from "@/http/models/project.model";
import {
  useAddProjectMember,
  useProjectMembers,
  useRemoveProjectMember,
  useUpdateProject,
} from "../_hooks/use-projects";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

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
  const { message, modal } = App.useApp();
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [isEditing, setIsEditing] = useState(false);

  const { data: currentUser } = useCurrentUser();
  const { data: members, isLoading: isLoadingMembers } = useProjectMembers(
    project?.id ?? "",
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useUsers();
  const addMemberMutation = useAddProjectMember();
  const removeMemberMutation = useRemoveProjectMember();
  const updateProjectMutation = useUpdateProject();

  const [form] = Form.useForm();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      gitRepo: "",
      baseRate: 1,
    },
  });

  useEffect(() => {
    if (project && isEditing) {
      reset({
        name: project.name,
        description: project.description || "",
        gitRepo: project.gitRepo || "",
        baseRate: project.baseRate || 1,
      });
    } else {
      reset({
        name: "",
        description: "",
        gitRepo: "",
        baseRate: 1,
      });
    }
  }, [project, isEditing, reset]);

  const onEdit = () => {
    setIsEditing(true);
  };

  const onCancelEdit = () => {
    setIsEditing(false);
    reset();
  };

  const onFormSubmit = (data: CreateProjectInput) => {
    if (!project) return;

    const isOwner = currentUser?.organizationRole === "OWNER";
    const payload = isOwner ? data : { ...data, baseRate: undefined };

    updateProjectMutation.mutate(
      { id: project.id, data: payload },
      {
        onSuccess: () => {
          message.success("Project updated successfully");
          setIsEditing(false);
          reset();
        },
        onError: (error) => {
          message.error(error.message || "Failed to update project");
        },
      },
    );
  };

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

    modal.confirm({
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
      title={
        <Flex justify="space-between" align="center">
          <span>{isEditing ? "Edit Project" : "Project Details"}</span>
          {!isEditing && (
            <Button type="primary" onClick={onEdit}>
              Edit
            </Button>
          )}
        </Flex>
      }
      placement="right"
      size={isEditing ? 500 : "large"}
      onClose={() => {
        setIsGrantingAccess(false);
        setSelectedUserId(undefined);
        setIsEditing(false);
        onClose();
      }}
      open={open}
      destroyOnHidden
      footer={
        isEditing ? (
          <Flex justify="flex-end" gap={8}>
            <Button onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit(onFormSubmit)}
              loading={updateProjectMutation.isPending}
            >
              Update
            </Button>
          </Flex>
        ) : undefined
      }
    >
      {isEditing ? (
        <Form form={form} layout="vertical">
          <Form.Item
            label="Project Name"
            required
            validateStatus={errors.name ? "error" : ""}
            help={errors.name?.message}
          >
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="Enter project name" />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Git Repository URL"
            validateStatus={errors.gitRepo ? "error" : ""}
            help={errors.gitRepo?.message}
          >
            <Controller
              name="gitRepo"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="https://github.com/user/repo" />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Description"
            validateStatus={errors.description ? "error" : ""}
            help={errors.description?.message}
          >
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  rows={3}
                  placeholder="Enter project description"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Base Rate"
            validateStatus={errors.baseRate ? "error" : ""}
            help={errors.baseRate?.message}
          >
            {currentUser?.organizationRole === "OWNER" ? (
              <Controller
                name="baseRate"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={0}
                    step={0.01}
                    placeholder="Enter base rate"
                    style={{ width: "100%" }}
                  />
                )}
              />
            ) : (
              <InputNumber
                value={project?.baseRate || 1}
                disabled
                min={0}
                step={0.01}
                style={{ width: "100%" }}
              />
            )}
          </Form.Item>
        </Form>
      ) : (
        project ? (
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
              <Title level={5} style={{ marginBottom: 16 }}>
                Slack Notifications
              </Title>
              <ProjectSlackSettingsForm project={project} />
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
                <Card size="small">
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
        ))}
    </Drawer >
  );
}
