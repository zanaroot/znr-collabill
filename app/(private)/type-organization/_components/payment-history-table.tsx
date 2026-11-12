"use client";

import {
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
        const reference = payment.providerPaymentId ?? payment.id;
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
      width: 150,
      render: (_: unknown, payment: PaymentHistoryRow) => (
        <Space size={4}>
          {payment.status === "PENDING" ? (
            <Button
              size="small"
              loading={
                reconcile.isPending && reconcile.variables === payment.id
              }
              onClick={() => reconcile.mutate(payment.id)}
            >
              Check status
            </Button>
          ) : (
            <Button size="small" onClick={() => setReceipt(payment)}>
              {payment.status === "FAILED" ? "Details" : "Receipt"}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="Payment history" style={{ marginBottom: 16 }}>
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
          scroll={{ x: 900 }}
        />
      )}
      <Modal
        open={receipt !== null}
        title={
          receipt?.status === "FAILED" ? "Payment details" : "Payment receipt"
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
            <Descriptions.Item label="Reference">
              <Text code>{receipt.providerPaymentId ?? "—"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Plan">
              <Tag>{receipt.planCode}</Tag>
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
