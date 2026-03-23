"use client";

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import { useCreateIteration, useDeleteIteration, useIterations, useUpdateIteration } from "../_hooks/use-iterations";
import { useCurrentUser } from "../team-management/_hooks/use-team";
import type { Iteration, CreateIterationInput } from "@/http/models/iteration.model";

const { Title, Text } = Typography;

const IterationActions = ({
  iteration,
  onEdit,
}: {
  iteration: Iteration;
  onEdit: (it: Iteration) => void;
}) => {
  const deleteIterationMutation = useDeleteIteration();

  return (
    <Space size="middle">
      <Button
        type="text"
        icon={<EditOutlined />}
        onClick={() => onEdit(iteration)}
      />
      <Popconfirm
        title="Are you sure you want to delete this iteration?"
        onConfirm={() => deleteIterationMutation.mutate(iteration.id)}
        okButtonProps={{ loading: deleteIterationMutation.isPending }}
      >
        <Button type="text" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space>
  );
};

export default function IterationsPage() {
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.organizationId || "";
  const { data: iterations = [], isLoading } = useIterations();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIteration, setEditingIteration] = useState<Iteration | null>(null);
  const [form] = Form.useForm();

  const createIterationMutation = useCreateIteration();
  const updateIterationMutation = useUpdateIteration();

  const handleOpenDrawer = (iteration?: Iteration) => {
    if (iteration) {
      setEditingIteration(iteration);
      form.setFieldsValue(iteration);
    } else {
      setEditingIteration(null);
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingIteration(null);
    form.resetFields();
  };

  const onFinish = async (values: CreateIterationInput) => {
    if (editingIteration) {
      await updateIterationMutation.mutateAsync({ id: editingIteration.id, data: values });
    } else if (organizationId) {
      await createIterationMutation.mutateAsync({
        ...values,
        organizationId,
      });
    }
    handleCloseDrawer();
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "blue";
        if (status === "CLOSED") color = "gray";
        if (status === "ARCHIVED") color = "red";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Iteration) => (
        <IterationActions
          iteration={record}
          onEdit={handleOpenDrawer}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Iterations
          </Title>
          <Text type="secondary">
            Manage sprints, billing cycles, or time periods for your organization.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenDrawer()}
        >
          New Iteration
        </Button>
      </div>

      <Card>
        <Table
          dataSource={iterations}
          columns={columns}
          loading={isLoading}
          rowKey="id"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No iterations found"
              >
                <Button type="primary" onClick={() => handleOpenDrawer()}>
                  Create your first iteration
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Drawer
        title={editingIteration ? "Edit Iteration" : "New Iteration"}
        width={400}
        onClose={handleCloseDrawer}
        open={drawerOpen}
        extra={
          <Space>
            <Button onClick={handleCloseDrawer}>Cancel</Button>
            <Button
              type="primary"
              onClick={() => form.submit()}
              loading={createIterationMutation.isPending || updateIterationMutation.isPending}
            >
              {editingIteration ? "Save" : "Create"}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ status: "OPEN" }}
        >
          <Form.Item
            name="name"
            label="Iteration Name"
            rules={[{ required: true, message: "Please enter iteration name" }]}
          >
            <Input placeholder="e.g., Sprint 1, March 2026" />
          </Form.Item>

          <Form.Item
            name="startDate"
            label="Start Date"
            rules={[{ required: true, message: "Please select start date" }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            name="endDate"
            label="End Date"
            rules={[{ required: true, message: "Please select end date" }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="OPEN">Open</Select.Option>
              <Select.Option value="CLOSED">Closed</Select.Option>
              <Select.Option value="ARCHIVED">Archived</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
