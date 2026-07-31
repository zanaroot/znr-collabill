"use client";

import {
  CalendarOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  App,
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Flex,
  List,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import {
  useAddProjectMember,
  useMemberProjects,
  useProjects,
  useRemoveProjectMember,
} from "@/app/(private)/projects/_hooks/use-projects";
import { useCurrentUser } from "@/app/(private)/team-management/_hooks/use-team";
import type { UserWithRoles } from "@/http/models/user.model";
import { client } from "@/packages/hono";

interface DetailMembersProps {
  open: boolean;
  onClose: () => void;
  member: UserWithRoles | null;
}

export const DetailMembers = ({
  open,
  onClose,
  member,
}: DetailMembersProps) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const addMemberMutation = useAddProjectMember();
  const { data: projects } = useProjects();
  const { data: memberProjects = [] } = useMemberProjects(member?.id || "");
  const { data: currentUser } = useCurrentUser();
  const removeMemberMutation = useRemoveProjectMember();
  const isOwner = currentUser?.organizationRole === "OWNER";
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [invoiceMonth, setInvoiceMonth] = useState(dayjs());
  const { message } = App.useApp();
  const handleAddToProject = async () => {
    if (!member || !selectedProjectId) return;

    try {
      await addMemberMutation.mutateAsync({
        projectId: selectedProjectId,
        userId: member.id,
      });

      message.success("Member added to project");
      setSelectedProjectId(undefined);
    } catch (error) {
      message.error((error as Error).message || "Failed to add member");
    }
  };

  const availableProjects =
    projects?.filter(
      (project) => !memberProjects.some((p) => p.id === project.id),
    ) ?? [];

  const startDate = currentMonth.startOf("month").format("YYYY-MM-DD");
  const endDate = currentMonth.endOf("month").format("YYYY-MM-DD");

  const { data: presences } = useQuery({
    queryKey: ["member-presences", member?.id, startDate, endDate],
    queryFn: async () => {

      if (!member) {
        return [];
      }

      const res = await client.api.presence.member[":userId"].$get({
        param: {
          userId: member.id,
        },
        query: {
          startDate,
          endDate,
        },
      });

      return res.json();
    },
    enabled: !!member,
  });

  const presenceByDate = useMemo(() => {
    if (!presences || "error" in presences) {
      return new Map();
    }

    return new Map(
      presences.map((p: { date: string; status: string }) => [
        p.date,
        p.status,
      ]),
    );
  }, [presences]);

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format("YYYY-MM-DD");
    const status = presenceByDate.get(dateStr);

    if (!status) {
      return null;
    }

    const color =
      status === "PRESENT"
        ? "green"
        : status === "REMOTE"
          ? "blue"
          : status === "LEAVE"
            ? "gold"
            : status === "SICK"
              ? "red"
              : "default";

    return (
      <div style={{ padding: 2 }}>
        <Badge status="processing" color={color} text={status} />
      </div>
    );
  };

  const handleRemoveFromProject = async (projectId: string) => {
    if (!member) return;

    try {
      await removeMemberMutation.mutateAsync({
        projectId,
        userId: member.id,
      });

      message.success("Member removed from project");
    } catch (error) {
      message.error((error as Error).message || "Failed to remove member");
    }
  };

  const invoicePeriod = invoiceMonth.format("YYYY-MM");

  const { data: invoice } = useQuery({
    queryKey: ["member-invoice", member?.id, invoicePeriod],
    queryFn: async () => {
      if (!member) return null;

      const res = await client.api.invoices.member[":userId"].$get({
        param: {
          userId: member.id,
        },
        query: {
          month: invoicePeriod,
        },
      });

      const data = await res.json();

      if (!data || "error" in data) {
        return null;
      }

      return data;
    },
    enabled: !!member,
  });

  return (
    <Drawer
      title={null}
      placement="right"
      width={1500}
      open={open}
      onClose={onClose}
    >
      {member && (
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <Card bordered={false}>
            <Flex justify="space-between" align="center">
              <Flex align="center" gap={20}>
                <AvatarProfile
                  src={member.avatar}
                  userName={member.name}
                  userEmail={member.email}
                  size={72}
                />

                <div>
                  <Typography.Title level={3} style={{ marginBottom: 4 }}>
                    {member.name}
                  </Typography.Title>

                  <Typography.Text type="secondary">
                    {member.email}
                  </Typography.Text>
                </div>
              </Flex>

              <Tag color="blue">Collaborator</Tag>
            </Flex>
          </Card>

          <Row gutter={24} align="top">
            <Col span={8}>
              <Space direction="vertical" size={20} style={{ width: "100%" }}>
                {isOwner && (
                  <Card title="Project management" extra={<ProjectOutlined />}>
                    {availableProjects.length > 0 ? (
                      <>
                        <Select
                          placeholder="Select project"
                          value={selectedProjectId}
                          style={{ width: "100%" }}
                          options={availableProjects.map((project) => ({
                            value: project.id,
                            label: project.name,
                          }))}
                          onChange={setSelectedProjectId}
                          allowClear
                        />

                        <Button
                          type="primary"
                          block
                          style={{ marginTop: 16 }}
                          loading={addMemberMutation.isPending}
                          disabled={!selectedProjectId}
                          onClick={handleAddToProject}
                        >
                          Add to project
                        </Button>
                      </>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Already assigned to every project"
                      />
                    )}
                  </Card>
                )}

                {isOwner && (
                  <Card title={`Projects (${memberProjects.length})`}>
                    {memberProjects.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No project"
                      />
                    ) : (
                      <List
                        dataSource={memberProjects}
                        renderItem={(project) => (
                          <List.Item
                            actions={[
                              <Button
                                key="remove"
                                danger
                                type="text"
                                icon={<DeleteOutlined />}
                                loading={removeMemberMutation.isPending}
                                onClick={() =>
                                  handleRemoveFromProject(project.id)
                                }
                              />,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={<ProjectOutlined />}
                              title={project.name}
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>
                )}

                <Card title="Invoice" extra={<FileTextOutlined />}>
                  <DatePicker
                    picker="month"
                    value={invoiceMonth}
                    onChange={(date) => date && setInvoiceMonth(date)}
                    style={{
                      width: "100%",
                      marginBottom: 20,
                    }}
                  />

                  {!invoice?.lines?.length ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No invoice"
                    />
                  ) : (
                    <>
                      <Table
                        size="small"
                        pagination={false}
                        dataSource={invoice.lines}
                        rowKey="id"
                        columns={[
                          {
                            title: "Label",
                            dataIndex: "label",
                          },
                          {
                            title: "Qty",
                            dataIndex: "quantity",
                            width: 70,
                          },
                          {
                            title: "Unit",
                            dataIndex: "unitPrice",
                            width: 90,
                            render: (v) => `${v} €`,
                          },
                          {
                            title: "Total",
                            dataIndex: "total",
                            width: 90,
                            render: (v) => (
                              <Typography.Text strong>{v} €</Typography.Text>
                            ),
                          },
                        ]}
                      />

                      <Divider />

                      <Statistic
                        title="Invoice total"
                        value={invoice.totalAmount ?? 0}
                        suffix="€"
                      />
                    </>
                  )}
                </Card>
              </Space>
            </Col>

            <Col span={16}>
              <Card title="Presence calendar" extra={<CalendarOutlined />}>
                <Calendar
                  value={currentMonth}
                  cellRender={dateCellRender}
                  onPanelChange={(value) => setCurrentMonth(value)}
                />
              </Card>
            </Col>
          </Row>
        </Space>
      )}
    </Drawer>
  );
};
