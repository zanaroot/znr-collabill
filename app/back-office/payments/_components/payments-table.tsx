"use client";

import { Alert, Button, Col, DatePicker, Row, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import {
  formatDateTime,
  formatMoney,
  getPaymentStatusMeta,
} from "@/app/_utils/billing";
import type {
  PaymentListFilters,
  PaymentListRow,
} from "../../_hooks/use-back-office";
import { useAdminPayments } from "../../_hooks/use-back-office";
import { PaymentDetailDrawer } from "./payment-detail-drawer";

const DEFAULT_FILTERS: PaymentListFilters = {
  status: undefined,
  provider: "",
  from: "",
  to: "",
  page: 1,
  pageSize: 20,
};

const STATUS_OPTIONS = ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"].map(
  (value) => ({
    label: getPaymentStatusMeta(
      value as "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED",
    ).label,
    value,
  }),
);

export const PaymentsTable = () => {
  const [filters, setFilters] = useState<PaymentListFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const payments = useAdminPayments(filters);

  const patchFilters = (patch: Partial<PaymentListFilters>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      ...(patch.from !== undefined || patch.to !== undefined
        ? { page: 1 }
        : {}),
    }));
  };

  const columns: ColumnsType<PaymentListRow> = [
    {
      title: "Organization",
      dataIndex: "organizationName",
      key: "organizationName",
      render: (name: string, row) => (
        <span>
          {name}
          <br />
          <small>{row.planName}</small>
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: PaymentListRow["status"]) => {
        const meta = getPaymentStatusMeta(status);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Amount",
      key: "amount",
      width: 130,
      render: (_, row) => formatMoney(row.amountMinor, row.currency),
    },
    {
      title: "Provider",
      dataIndex: "provider",
      key: "provider",
      width: 110,
    },
    {
      title: "Paid at",
      dataIndex: "paidAt",
      key: "paidAt",
      width: 160,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "",
      key: "action",
      width: 90,
      render: (_, row) => (
        <Button
          size="small"
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedId(row.id);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col flex="180px">
          <Select
            allowClear
            placeholder="Status"
            style={{ width: "100%" }}
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(value) => patchFilters({ status: value })}
          />
        </Col>
        <Col flex="180px">
          <Select
            allowClear
            placeholder="Provider"
            style={{ width: "100%" }}
            options={[
              { label: "Mock", value: "mock" },
              { label: "Stripe", value: "stripe" },
            ]}
            value={filters.provider || undefined}
            onChange={(value) => patchFilters({ provider: value ?? "" })}
          />
        </Col>
        <Col flex="280px">
          <DatePicker.RangePicker
            style={{ width: "100%" }}
            onChange={(dates) => {
              const [from, to] = dates ?? [null, null];
              patchFilters({
                from: from?.toISOString() ?? "",
                to: to?.toISOString() ?? "",
              });
            }}
          />
        </Col>
      </Row>
      {payments.isError && (
        <Alert
          type="error"
          showIcon
          message="Failed to load payments"
          style={{ marginBottom: 16 }}
        />
      )}
      <Table<PaymentListRow>
        rowKey="id"
        size="small"
        loading={payments.isLoading}
        columns={columns}
        dataSource={payments.data?.rows ?? []}
        scroll={{ x: true }}
        onRow={(row) => ({
          onClick: () => setSelectedId(row.id),
        })}
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total: payments.data?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `${total} payments`,
          onChange: (page, pageSize) =>
            setFilters((current) => ({ ...current, page, pageSize })),
        }}
      />
      <PaymentDetailDrawer
        paymentId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
};
