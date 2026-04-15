"use client";

import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  type CreateProjectInput,
  createProjectSchema,
  type Project,
} from "@/http/models/project.model";
import { useCurrentUser } from "../../team-management/_hooks/use-team";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "../_hooks/use-projects";
import { ProjectDetailsDrawer } from "./project-details-drawer";

const { Title } = Typography;
const { confirm } = Modal;
const { TextArea } = Input;

export function ProjectList() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProjectForDetails, setSelectedProjectForDetails] =
    useState<Project | null>(null);

  const { data: currentUser } = useCurrentUser();
  const { data: projects, isLoading: isFetching } = useProjects();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

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
    if (editingProject) {
      reset({
        name: editingProject.name,
        description: editingProject.description || "",
        gitRepo: editingProject.gitRepo || "",
        baseRate: editingProject.baseRate || 1,
      });
    } else {
      reset({
        name: "",
        description: "",
        gitRepo: "",
        baseRate: 1,
      });
    }
  }, [editingProject, reset]);

  const handleDelete = (id: string) => {
    confirm({
      title: "Are you sure you want to delete this project?",
      icon: <ExclamationCircleOutlined />,
      content: "This action cannot be undone.",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          await deleteProjectMutation.mutateAsync(id);
          message.success("Project deleted successfully");
        } catch (error) {
          message.error((error as Error).message || "Failed to delete project");
        }
      },
    });
  };

  const onEdit = (project: Project) => {
    setEditingProject(project);
    setIsDrawerOpen(true);
  };

  const onAdd = () => {
    setEditingProject(null);
    setIsDrawerOpen(true);
  };

  const onFormSubmit = (data: CreateProjectInput) => {
    const isOwner = currentUser?.organizationRole === "OWNER";
    const payload = isOwner ? data : { ...data, baseRate: undefined };

    if (editingProject) {
      updateProjectMutation.mutate(
        { id: editingProject.id, data: payload },
        {
          onSuccess: () => {
            message.success("Project updated successfully");
            setIsDrawerOpen(false);
            setEditingProject(null);
            reset();
          },
          onError: (error) => {
            message.error(error.message || "Failed to update project");
          },
        },
      );
    } else {
      createProjectMutation.mutate(data, {
        onSuccess: () => {
          message.success("Project created successfully");
          setIsDrawerOpen(false);
          reset();
        },
        onError: (error) => {
          message.error(error.message || "Failed to create project");
        },
      });
    }
  };

  const columns: ColumnsType<Project> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      responsive: ["xs", "sm", "md", "lg", "xl"],
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      responsive: ["md", "lg", "xl"],
      render: (text) =>
        text || (
          <Typography.Text type="secondary">No description</Typography.Text>
        ),
    },
    {
      title: "Git Repository",
      dataIndex: "gitRepo",
      key: "gitRepo",
      responsive: ["lg", "xl"],
      render: (text) =>
        text ? (
          <Typography.Link href={text} target="_blank" ellipsis>
            {text}
          </Typography.Link>
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      responsive: ["sm", "md", "lg", "xl"],
      render: (date: string | Date) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      responsive: ["xs", "sm", "md", "lg", "xl"],
      render: (_, record) => (
        <Flex gap={4}>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(record);
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            loading={
              deleteProjectMutation.isPending &&
              deleteProjectMutation.variables === record.id
            }
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
          />
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProjectForDetails(record);
            }}
          />
        </Flex>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <Flex justify="space-between" align="center" wrap="wrap">
            <Title level={4} style={{ margin: 0 }}>
              Projects
            </Title>
            {currentUser?.organizationRole === "OWNER" && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onAdd}
                size="middle"
                className="hidden-xs"
              >
                New Project
              </Button>
            )}
          </Flex>
        }
        styles={{
          body: { padding: "12px" },
        }}
      >
        <div className="table-responsive">
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="id"
            loading={isFetching}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} projects`,
              pageSizeOptions: ["5", "10", "20"],
            }}
            scroll={{ x: "max-content" }}
            size="middle"
            onRow={(record) => ({
              onClick: (event) => {
                const target = event.target as HTMLElement;
                if (
                  target.tagName === "BUTTON" ||
                  target.tagName === "A" ||
                  target.closest("button") ||
                  target.closest("a")
                ) {
                  return;
                }
                setSelectedProjectForDetails(record);
              },
              style: { cursor: "pointer" },
            })}
          />
        </div>
      </Card>

      <ProjectDetailsDrawer
        project={selectedProjectForDetails}
        open={!!selectedProjectForDetails}
        onClose={() => setSelectedProjectForDetails(null)}
      />

      <Drawer
        title={editingProject ? "Edit project" : "Create a new project"}
        width={500}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingProject(null);
          reset();
        }}
        open={isDrawerOpen}
        styles={{
          body: { paddingBottom: 80 },
        }}
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button
              onClick={() => {
                setIsDrawerOpen(false);
                setEditingProject(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit(onFormSubmit)}
              loading={
                createProjectMutation.isPending ||
                updateProjectMutation.isPending
              }
            >
              {editingProject ? "Update" : "Submit"}
            </Button>
          </Flex>
        }
      >
        <Form layout="vertical">
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
                value={editingProject?.baseRate || 1}
                disabled
                min={0}
                step={0.01}
                style={{ width: "100%" }}
              />
            )}
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
