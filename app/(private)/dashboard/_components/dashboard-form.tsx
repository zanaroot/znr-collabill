"use client";

import {
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: currentUser } = useCurrentUser();
  const { data: users } = useUsers();

  const isOwner = currentUser?.organizationRole === "OWNER";

  const handleTicketClick = (ticketId: string, projectId: string) => {
    router.push(`/task-board?projectId=${projectId}&taskId=${ticketId}`);
  };

  useEffect(() => {
    if (isOwner && currentUser?.id && !selectedUserId) {
      setSelectedUserId(currentUser.id);
    }
  }, [isOwner, currentUser?.id, selectedUserId]);

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
      }}
    >
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

      <StatisticsRow statistics={statistics} loading={isLoadingStatistics} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={18}>
          <Card
            loading={isLoadingNewTickets}
            title={
              <Flex align="center" gap={8}>
                <FileTextOutlined />
                <span>New tickets assigned to you</span>
                <Badge count={newTicketsCount} overflowCount={99} />
              </Flex>
            }
          >
            {newTickets.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No new tickets assigned to you"
              />
            ) : (
              <div
                style={{
                  maxHeight: 250,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                <Space
                  orientation="vertical"
                  size={8}
                  style={{
                    width: "100%",
                  }}
                >
                  {newTickets.map((ticket) => (
                    <Card
                      key={ticket.id}
                      size="small"
                      variant="borderless"
                      hoverable
                      onClick={() =>
                        handleTicketClick(ticket.id, ticket.projectId)
                      }
                      style={{
                        border: "1px solid #f0f0f0",
                        cursor: "pointer",
                      }}
                    >
                      <Flex align="center" justify="space-between" gap={16}>
                        <Flex
                          align="center"
                          gap={12}
                          style={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <Avatar shape="square" icon={<FileTextOutlined />} />

                          <div
                            style={{
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <Flex align="center" gap={8} wrap="wrap">
                              <Text strong>{ticket.id}</Text>

                              {ticket.priority !== null && (
                                <Tag color="blue">
                                  Priority {ticket.priority}
                                </Tag>
                              )}
                            </Flex>

                            <Text
                              ellipsis
                              style={{
                                display: "block",
                              }}
                            >
                              {ticket.title}
                            </Text>

                            <Text type="secondary">
                              {ticket.project}
                              {" · "}
                              {ticket.createdAt
                                ? new Date(
                                    ticket.createdAt,
                                  ).toLocaleDateString()
                                : "—"}
                            </Text>
                          </div>
                        </Flex>

                        <ArrowRightOutlined />
                      </Flex>
                    </Card>
                  ))}
                </Space>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            loading={isInvoiceEstimateLoading}
            hoverable
            onClick={() => {
              if (!invoiceEstimate) return;

              router.push(
                `/invoices?periodStart=${invoiceEstimate.periodStart}&periodEnd=${invoiceEstimate.periodEnd}`,
              );
            }}
            style={{
              height: 220,
              cursor: invoiceEstimate ? "pointer" : "default",
            }}
          >
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

      <Card
        title={
          <Flex align="center" gap={8}>
            <ExclamationCircleOutlined />
            <span>Important & urgent tickets</span>
          </Flex>
        }
      >
        {importantTickets.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No important or urgent tickets"
          />
        ) : (
          <div
            style={{
              maxHeight: 380,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            <Space
              orientation="vertical"
              size={12}
              style={{
                width: "100%",
              }}
            >
              {importantTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  size="small"
                  hoverable
                  onClick={() => handleTicketClick(ticket.id, ticket.projectId)}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <Flex align="center" justify="space-between" gap={16}>
                    <Flex
                      align="center"
                      gap={12}
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <Avatar
                        shape="square"
                        icon={<ExclamationCircleOutlined />}
                      />

                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <Flex align="center" gap={8} wrap="wrap">
                          <Text strong>{ticket.id}</Text>

                          <Tag color={priorityTagColor(ticket.priority)}>
                            {getPriorityLabel(ticket.priority)}
                          </Tag>
                        </Flex>

                        <Text
                          ellipsis
                          style={{
                            display: "block",
                          }}
                        >
                          {ticket.title}
                        </Text>

                        <Text type="secondary">{ticket.project}</Text>
                      </div>
                    </Flex>

                    <ArrowRightOutlined />
                  </Flex>
                </Card>
              ))}
            </Space>
          </div>
        )}
      </Card>
    </Space>
  );
}
