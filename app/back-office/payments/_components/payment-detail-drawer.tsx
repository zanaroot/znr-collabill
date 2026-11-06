"use client";

import { ExclamationCircleOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  List,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  getPaymentStatusMeta,
} from "@/app/_utils/billing";
import {
  useAdminPayment,
  useRefundPayment,
} from "../../_hooks/use-back-office";

const { Text, Paragraph } = Typography;

export const PaymentDetailDrawer = ({
  paymentId,
  onClose,
}: {
  paymentId: string | null;
  onClose: () => void;
}) => {
  const detail = useAdminPayment(paymentId);
  const refund = useRefundPayment();
  const { modal } = App.useApp();

  const data = detail.data;
  const refundable =
    data?.payment.status === "SUCCEEDED" && data?.refund.supported;

  const confirmRefund = () => {
    if (!paymentId) return;
    modal.confirm({
      title: "Refund this payment?",
      icon: <ExclamationCircleOutlined />,
      content:
        "The refund is sent to the payment provider. Only provider-confirmed refunds are recorded.",
      okText: "Send refund",
      okButtonProps: { danger: true },
      onOk: () => refund.mutateAsync(paymentId).catch(() => undefined),
    });
  };

  return (
    <Drawer
      title="Payment detail"
      open={!!paymentId}
      onClose={onClose}
      width={720}
    >
      {detail.isLoading && (
        <div style={{ padding: 48, textAlign: "center" }}>
          <Spin />
        </div>
      )}
      {detail.isError && (
        <Alert type="error" showIcon message="Failed to load payment" />
      )}
      {data && (
        <>
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Status">
              {(() => {
                const meta = getPaymentStatusMeta(data.payment.status);
                return <Tag color={meta.color}>{meta.label}</Tag>;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              {formatMoney(data.payment.amountMinor, data.payment.currency)}
            </Descriptions.Item>
            <Descriptions.Item label="Organization">
              {data.organization.name}
            </Descriptions.Item>
            <Descriptions.Item label="Plan">{data.plan.name}</Descriptions.Item>
            <Descriptions.Item label="Provider">
              {data.payment.provider}
            </Descriptions.Item>
            <Descriptions.Item label="Provider reference">
              {data.payment.providerPaymentId ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Paid at">
              {formatDateTime(data.payment.paidAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {formatDateTime(data.payment.createdAt)}
            </Descriptions.Item>
          </Descriptions>

          {data.payment.status === "REFUNDED" && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message="This payment has been refunded"
            />
          )}
          {data.payment.status === "SUCCEEDED" && !data.refund.supported && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12 }}
              message={
                data.refund.configured
                  ? "The configured payment provider does not support refunds"
                  : "No payment provider is configured for refunds"
              }
            />
          )}

          <Space style={{ marginTop: 12 }}>
            <Button
              type="primary"
              danger
              disabled={!refundable}
              loading={refund.isPending}
              onClick={confirmRefund}
            >
              Refund
            </Button>
          </Space>

          <Divider titlePlacement="left">Related subscription</Divider>
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Status">
              {data.subscription.status}
            </Descriptions.Item>
            <Descriptions.Item label="Interval">
              {data.subscription.interval ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Period">
              {formatDate(data.subscription.currentPeriodStart)} →{" "}
              {formatDate(data.subscription.currentPeriodEnd)}
            </Descriptions.Item>
            <Descriptions.Item label="Cancel at period end">
              {data.subscription.cancelAtPeriodEnd ? "Scheduled" : "—"}
            </Descriptions.Item>
          </Descriptions>

          <Divider titlePlacement="left">Provider events</Divider>
          {data.events.length === 0 ? (
            <Empty description="No events for this payment" />
          ) : (
            <List
              size="small"
              dataSource={data.events}
              renderItem={(event) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <span>
                        <Tag>{event.type}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatDateTime(event.createdAt)}
                        </Text>
                      </span>
                    }
                    description={
                      <Paragraph
                        style={{ marginBottom: 0 }}
                        ellipsis={{ rows: 1, tooltip: event.payload }}
                      >
                        {event.provider} · {event.payload}
                      </Paragraph>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </>
      )}
    </Drawer>
  );
};
