"use client";

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { QueryErrorAlert } from "@/app/_components/billing/query-error-alert";
import { PaymentStatusTag } from "@/app/_components/billing/status-tags";
import type { PaymentHistoryRow } from "@/app/_hooks/use-billing";
import { usePayments, useReconcilePayment } from "@/app/_hooks/use-billing";
import { formatDate, formatDateTime, formatMoney } from "@/app/_utils/billing";

const { Text } = Typography;

export const PaymentHistoryTable = () => {
  const { data: payments, isLoading, isError, refetch } = usePayments();
  const reconcile = useReconcilePayment();
  const [receipt, setReceipt] = useState<PaymentHistoryRow | null>(null);
  const pendingPayment = payments?.find(
    (payment) =>
      payment.status === "PENDING" || payment.status === "PROCESSING",
  );

  const columns: ColumnsType<PaymentHistoryRow> = [
    {
      title: "Date",
      dataIndex: "paidAt",
      key: "date",
      width: 140,
      render: (_: unknown, payment: PaymentHistoryRow) =>
        formatDate(payment.paidAt ?? payment.createdAt),
    },
    {
      title: "Amount",
      key: "amount",
      width: 120,
      render: (_: unknown, payment: PaymentHistoryRow) => (
        <Text strong>{formatMoney(payment.amountMinor, payment.currency)}</Text>
      ),
    },
    {
      title: "Plan",
      dataIndex: "planCode",
      key: "plan",
      width: 100,
      render: (planCode: string) => <Tag>{planCode}</Tag>,
    },
    {
      title: "Status",
      key: "status",
      width: 160,
      render: (_: unknown, payment: PaymentHistoryRow) => (
        <Tooltip title={payment.failureReason ?? undefined}>
          <span>
            <PaymentStatusTag status={payment.status} />
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Reference",
      key: "reference",
      render: (_: unknown, payment: PaymentHistoryRow) => {
        const reference =
          payment.providerPaymentId ?? payment.providerCheckoutId ?? payment.id;
        return (
          <Text
            code
            copyable={{ text: reference }}
            ellipsis={{ tooltip: reference }}
            style={{ maxWidth: 200 }}
          >
            {reference}
          </Text>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_: unknown, payment: PaymentHistoryRow) => (
        <Space size={4} wrap>
          {(payment.status === "PENDING" ||
            payment.status === "PROCESSING") && (
            <>
              {payment.status === "PENDING" && payment.checkoutUrl && (
                <Button
                  size="small"
                  type="primary"
                  href={payment.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pay now
                </Button>
              )}
              <Button
                size="small"
                loading={
                  reconcile.isPending && reconcile.variables === payment.id
                }
                onClick={() => reconcile.mutate(payment.id)}
              >
                Check status
              </Button>
            </>
          )}
          {payment.status !== "PENDING" && payment.status !== "PROCESSING" && (
            <Button size="small" onClick={() => setReceipt(payment)}>
              {payment.status === "FAILED" || payment.status === "EXPIRED"
                ? "Details"
                : "Receipt"}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="Payment history" style={{ marginBottom: 16 }}>
      {pendingPayment && (
        <Alert
          type={pendingPayment.status === "PROCESSING" ? "info" : "warning"}
          showIcon
          style={{ marginBottom: 16 }}
          message={
            pendingPayment.status === "PROCESSING"
              ? `${pendingPayment.planCode} payment processing`
              : `${pendingPayment.planCode} payment pending`
          }
          description={
            <>
              {formatMoney(pendingPayment.amountMinor, pendingPayment.currency)}{" "}
              {pendingPayment.status === "PROCESSING"
                ? "has been received and is waiting for provider confirmation. Access is activated only after the payment is confirmed."
                : "is waiting for confirmation. Complete the checkout to activate your plan. Access is activated only after the payment provider confirms the payment."}
            </>
          }
          action={
            <Space direction="vertical" size={4}>
              {pendingPayment.status === "PENDING" &&
                pendingPayment.checkoutUrl && (
                  <Button
                    size="small"
                    type="primary"
                    href={pendingPayment.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Pay now
                  </Button>
                )}
              <Button
                size="small"
                loading={
                  reconcile.isPending &&
                  reconcile.variables === pendingPayment.id
                }
                onClick={() => reconcile.mutate(pendingPayment.id)}
              >
                Check status
              </Button>
            </Space>
          }
        />
      )}
      {isError ? (
        <QueryErrorAlert
          message="Failed to load payment history"
          onRetry={() => refetch()}
        />
      ) : (
        <Table<PaymentHistoryRow>
          rowKey="id"
          size="small"
          loading={isLoading}
          columns={columns}
          dataSource={payments ?? []}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1000 }}
        />
      )}
      <Modal
        open={receipt !== null}
        title={
          receipt?.status === "FAILED" || receipt?.status === "EXPIRED"
            ? "Payment details"
            : "Payment receipt"
        }
        onCancel={() => setReceipt(null)}
        footer={[
          <Button key="print" onClick={() => window.print()}>
            Print
          </Button>,
          <Button key="close" type="primary" onClick={() => setReceipt(null)}>
            Close
          </Button>,
        ]}
      >
        {receipt && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Payment ID">
              <Text code>{receipt.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Payment reference">
              <Text code>{receipt.providerPaymentId ?? "—"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Checkout reference">
              <Text code>{receipt.providerCheckoutId ?? "—"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Checkout URL">
              {receipt.checkoutUrl ? (
                <Typography.Link
                  href={receipt.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open checkout
                </Typography.Link>
              ) : (
                "—"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Plan">
              <Tag>{receipt.planCode}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Billing interval">
              {receipt.interval ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              <Text strong>
                {formatMoney(receipt.amountMinor, receipt.currency)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <PaymentStatusTag status={receipt.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Provider">
              {receipt.provider}
            </Descriptions.Item>
            <Descriptions.Item label="Paid at">
              {formatDateTime(receipt.paidAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {formatDateTime(receipt.createdAt)}
            </Descriptions.Item>
            {receipt.failureReason && (
              <Descriptions.Item label="Failure reason">
                {receipt.failureReason}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};
