"use client";

import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  formatDateTime,
  formatMoney,
  getPaymentStatusMeta,
  getSubscriptionStatusMeta,
} from "@/app/_utils/billing";
import { useBackOfficeOverview } from "@/app/back-office/_hooks/use-back-office";

const { Text, Paragraph } = Typography;

type RecentPayment = {
  id: string;
  organizationName: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  amountMinor: number;
  currency: string;
  provider: string;
  planCode: string;
  createdAt: string;
};

const paymentColumns: ColumnsType<RecentPayment> = [
  {
    title: "Organization",
    dataIndex: "organizationName",
    key: "organizationName",
  },
  { title: "Plan", dataIndex: "planCode", key: "planCode", width: 90 },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    width: 120,
    render: (status: RecentPayment["status"]) => {
      const meta = getPaymentStatusMeta(status);
      return <Tag color={meta.color}>{meta.label}</Tag>;
    },
  },
  {
    title: "Amount",
    key: "amount",
    width: 120,
    render: (_, row) => formatMoney(row.amountMinor, row.currency),
  },
  {
    title: "Created",
    dataIndex: "createdAt",
    key: "createdAt",
    width: 160,
    render: (value: string) => formatDateTime(value),
  },
];

export const BillingDashboard = () => {
  const overview = useBackOfficeOverview();

  if (overview.isLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <Alert
        type="error"
        showIcon
        message="Failed to load the billing dashboard"
        action={
          <Button size="small" onClick={() => overview.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const data = overview.data;
  const statuses = Object.entries(data.subscriptionsByStatus).filter(
    ([, value]) => value > 0,
  );

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic title="Organizations" value={data.totalOrganizations} />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Live subscriptions"
            value={data.organizationsWithLiveSubscription}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="On paid plans"
            value={data.organizationsOnPaidPlan}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="On free plan"
            value={data.organizationsOnFreePlan}
          />
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card title="Revenue (MRR / ARR)">
          {data.revenueByCurrency.length === 0 ? (
            <Empty description="No live paid subscriptions" />
          ) : (
            data.revenueByCurrency.map((row) => (
              <div
                key={row.currency}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                }}
              >
                <Text strong>{row.currency}</Text>
                <Text>
                  {formatMoney(row.mrrMinor, row.currency)} / month ·{" "}
                  {formatMoney(row.arrMinor, row.currency)} / year
                </Text>
              </div>
            ))
          )}
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="Subscriptions by status">
          {statuses.length === 0 ? (
            <Empty description="No subscriptions yet" />
          ) : (
            statuses.map(([status, value]) => {
              const meta = getSubscriptionStatusMeta(
                status as Parameters<typeof getSubscriptionStatusMeta>[0],
              );
              return (
                <div
                  key={status}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                  }}
                >
                  <Tag color={meta.color}>{meta.label}</Tag>
                  <Text>{value}</Text>
                </div>
              );
            })
          )}
        </Card>
      </Col>

      <Col xs={24} md={14}>
        <Card title="Recent payments">
          <Table<RecentPayment>
            size="small"
            rowKey="id"
            columns={paymentColumns}
            dataSource={data.recentPayments}
            pagination={false}
            scroll={{ x: true }}
          />
        </Card>
      </Col>
      <Col xs={24} md={10}>
        <Card title="Recent subscription events">
          <List
            size="small"
            dataSource={data.recentEvents}
            renderItem={(event) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span>
                      <Tag>{event.type}</Tag>
                      <Text type="secondary">{event.organizationName}</Text>
                    </span>
                  }
                  description={
                    <Paragraph
                      style={{ marginBottom: 0 }}
                      ellipsis={{ rows: 1, tooltip: event.payload }}
                    >
                      {formatDateTime(event.createdAt)} · {event.provider}
                    </Paragraph>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  );
};
