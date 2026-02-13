"use client";

import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
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
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "../_hooks/use-projects";

const { Title } = Typography;
const { confirm } = Modal;
const { TextArea } = Input;

export function ProjectList() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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
    },
  });

  // Reset form when editingProject changes
  useEffect(() => {
    if (editingProject) {
      reset({
        name: editingProject.name,
        description: editingProject.description || "",
        gitRepo: editingProject.gitRepo || "",
      });
    } else {
      reset({
        name: "",
        description: "",
        gitRepo: "",
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
    if (editingProject) {
      updateProjectMutation.mutate(
        { id: editingProject.id, data },
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
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text) =>
        text || (
          <Typography.Text type="secondary">No description</Typography.Text>
        ),
    },
    {
      title: "Git Repository",
      dataIndex: "gitRepo",
      key: "gitRepo",
      render: (text) =>
        text ? (
          <Typography.Link href={text} target="_blank">
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
      render: (date: string | Date) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Flex gap={8}>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit(record)}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            loading={
              deleteProjectMutation.isPending &&
              deleteProjectMutation.variables === record.id
            }
            onClick={() => handleDelete(record.id)}
          />
        </Flex>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Title level={4} style={{ margin: 0 }}>
              Projects
            </Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              New Project
            </Button>
          </Flex>
        }
      >
        <Table
          columns={columns}
          dataSource={projects}
          rowKey="id"
          loading={isFetching}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title={editingProject ? "Edit project" : "Create a new project"}
        width={400}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingProject(null);
          reset();
        }}
        open={isDrawerOpen}
        extra={
          <Button
            type="primary"
            onClick={handleSubmit(onFormSubmit)}
            loading={
              createProjectMutation.isPending || updateProjectMutation.isPending
            }
          >
            {editingProject ? "Update" : "Submit"}
          </Button>
        }
      >
        <Form layout="vertical">
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Project Name"
                required
                validateStatus={errors.name ? "error" : ""}
                help={errors.name?.message}
              >
                <Input {...field} placeholder="Enter project name" />
              </Form.Item>
            )}
          />

          <Controller
            name="gitRepo"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Git Repository URL"
                validateStatus={errors.gitRepo ? "error" : ""}
                help={errors.gitRepo?.message}
              >
                <Input {...field} placeholder="https://github.com/user/repo" />
              </Form.Item>
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Description"
                validateStatus={errors.description ? "error" : ""}
                help={errors.description?.message}
              >
                <TextArea
                  {...field}
                  rows={4}
                  placeholder="Enter project description"
                />
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>
    </>
  );
}
