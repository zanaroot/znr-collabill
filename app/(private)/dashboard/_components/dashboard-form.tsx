"use client";

import {
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import { getPriorityLabel, priorityTagColor } from "@/app/_utils/priority";
import {
  useCurrentUser,
  useUsers,
} from "@/app/(private)/team-management/_hooks/use-team";
import {
  useDashboardImportantTickets,
  useDashboardInvoiceEstimate,
  useDashboardNewTickets,
  useDashboardStatistics,
} from "../_hooks/usedasboard";
import { StatisticsRow } from "./statistics-row";

const { Text, Title } = Typography;

export default function Dashboard() {
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: currentUser } = useCurrentUser();
  const { data: users } = useUsers();

  const isOwner = currentUser?.organizationRole === "OWNER";

  const dashboardUserId =
    isOwner && selectedUserId ? selectedUserId : currentUser?.id;

  const { data: invoiceEstimate, isLoading: isInvoiceEstimateLoading } =
    useDashboardInvoiceEstimate(isOwner ? selectedUserId : undefined);

  const { data: statistics, isLoading: isLoadingStatistics } =
    useDashboardStatistics(dashboardUserId);

  const { data: newTicketsData, isLoading: isLoadingNewTickets } =
    useDashboardNewTickets(dashboardUserId);

  const newTickets = newTicketsData?.tickets ?? [];
  const newTicketsCount = newTicketsData?.total ?? 0;

  const { data: importantTicketsData } =
    useDashboardImportantTickets(dashboardUserId);

  const importantTickets = importantTicketsData?.tickets ?? [];

  return (
    <Space
      orientation="vertical"
      size={24}
      style={{
        width: "100%",
        minHeight: "100%",
        paddingBottom: 32,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Dashboard
          </Title>

          <Text type="secondary">
            Overview of your activity and current work.
          </Text>
        </div>

        {isOwner && (
          <Select
            showSearch
            allowClear
            value={selectedUserId || undefined}
            placeholder="Select a member"
            optionFilterProp="label"
            onChange={(value) => setSelectedUserId(value ?? "")}
            style={{ width: 300 }}
            options={
              users?.map((user) => ({
                value: user.id,
                label: user.name,
              })) ?? []
            }
          />
        )}
      </Flex>

      {/* Statistics */}
      <StatisticsRow statistics={statistics} loading={isLoadingStatistics} />

      {/* Main content */}
      <Row gutter={[16, 16]}>
        {/* New tickets */}
        <Col xs={24} lg={14}>
          <Card
            loading={isLoadingNewTickets}
            title={
              <Flex align="center" justify="space-between">
                <Space>
                  <FileTextOutlined />
                  <span>New tickets assigned to you</span>
                </Space>

                <Badge count={newTicketsCount} overflowCount={99} />
              </Flex>
            }
            extra={
              <Button type="link" icon={<ArrowRightOutlined />}>
                View all
              </Button>
            }
          >
            {newTickets.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No new tickets assigned to you"
              />
            ) : (
              <Space
                orientation="vertical"
                size={0}
                style={{
                  width: "100%",
                }}
              >
                {newTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    size="small"
                    variant="borderless"
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      borderRadius: 0,
                    }}
                  >
                    <Flex align="center" justify="space-between" gap={16}>
                      <Flex
                        align="center"
                        gap={12}
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <Avatar shape="square" icon={<FileTextOutlined />} />

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <Flex align="center" gap={8} wrap="wrap">
                            <Text strong>{ticket.id}</Text>

                            {ticket.priority !== null && (
                              <Tag color="blue">Priority {ticket.priority}</Tag>
                            )}
                          </Flex>

                          <Text
                            ellipsis
                            style={{
                              display: "block",
                              maxWidth: 400,
                            }}
                          >
                            {ticket.title}
                          </Text>

                          <Text type="secondary">
                            {ticket.project}
                            {" · "}
                            {ticket.createdAt
                              ? new Date(ticket.createdAt).toLocaleDateString()
                              : "—"}
                          </Text>
                        </div>
                      </Flex>

                      <Button type="text" icon={<ArrowRightOutlined />} />
                    </Flex>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        {/* Current month invoice */}
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isInvoiceEstimateLoading}>
            <Typography.Text type="secondary">
              Estimated invoice
            </Typography.Text>

            <Typography.Title level={2} className="!mb-1">
              {invoiceEstimate
                ? new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  }).format(invoiceEstimate.amount)
                : "—"}
            </Typography.Title>

            <Space>
              <Typography.Text type="secondary">Current month</Typography.Text>

              {invoiceEstimate && (
                <Tag
                  color={
                    invoiceEstimate.status === "PAID"
                      ? "green"
                      : invoiceEstimate.status === "VALIDATED"
                        ? "blue"
                        : invoiceEstimate.status === "DRAFT"
                          ? "orange"
                          : "default"
                  }
                >
                  {invoiceEstimate.status}
                </Tag>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
      {/* Important tickets */}
      <Card
        title={
          <Space>
            <ExclamationCircleOutlined />
            Important & urgent tickets
          </Space>
        }
        extra={
          <Button type="link" icon={<ArrowRightOutlined />}>
            View all
          </Button>
        }
      >
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          {importantTickets.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No important or urgent tickets"
            />
          ) : (
            importantTickets.map((ticket) => (
              <Card key={ticket.id} size="small">
                <Flex align="center" justify="space-between" gap={16}>
                  <Flex
                    align="center"
                    gap={12}
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <Avatar
                      shape="square"
                      icon={<ExclamationCircleOutlined />}
                    />

                    <div>
                      <Flex align="center" gap={8}>
                        <Text strong>{ticket.id}</Text>

                        <Tag color={priorityTagColor(ticket.priority)}>
                          {getPriorityLabel(ticket.priority)}
                        </Tag>
                      </Flex>

                      <Text
                        ellipsis
                        style={{
                          display: "block",
                          maxWidth: 600,
                        }}
                      >
                        {ticket.title}
                      </Text>

                      <Text type="secondary">{ticket.project}</Text>
                    </div>
                  </Flex>

                  <Button type="text" icon={<ArrowRightOutlined />} />
                </Flex>
              </Card>
            ))
          )}
        </Space>
      </Card>
    </Space>
  );
}

export { Dashboard };
