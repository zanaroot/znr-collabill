"use client";

import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { App, Button, Card, Flex, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import type { Project } from "@/http/models/project.model";
import { useCurrentUser } from "../../team-management/_hooks/use-team";
import { useDeleteProject, useProjects } from "../_hooks/use-projects";
import { CreateProjectDrawer } from "./create-project-drawer";
import { ProjectDetailsDrawer } from "./project-details-drawer";

const { Title } = Typography;

export function ProjectList() {
  const [selectedProjectForDetails, setSelectedProjectForDetails] =
    useState<Project | null>(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const { modal, message } = App.useApp();

  const { data: currentUser } = useCurrentUser();
  const { data: projects, isLoading: isFetching } = useProjects();
  const deleteProjectMutation = useDeleteProject();

  const handleDelete = (id: string) => {
    modal.confirm({
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

  const onAdd = () => {
    setIsCreateDrawerOpen(true);
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

      <CreateProjectDrawer
        open={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
      />
      <ProjectDetailsDrawer
        project={selectedProjectForDetails}
        open={!!selectedProjectForDetails}
        onClose={() => setSelectedProjectForDetails(null)}
      />
    </>
  );
}
