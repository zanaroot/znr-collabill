"use client";

import { Col, Input, Row, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import {
  formatDate,
  getPaymentStatusMeta,
  getSubscriptionStatusMeta,
} from "@/app/_utils/billing";
import type { SubscriptionStatus } from "@/http/models/subscription.model";
import type {
  OrganizationListFilters,
  OrganizationListRow,
} from "../../_hooks/use-back-office";
import {
  useAdminOrganizations,
  useAdminPlans,
} from "../../_hooks/use-back-office";
import { OrganizationDrawer } from "./organization-drawer";

const STATUS_OPTIONS: Array<{ label: string; value: SubscriptionStatus }> = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELED",
  "EXPIRED",
].map((value) => ({
  label: getSubscriptionStatusMeta(value as SubscriptionStatus).label,
  value: value as SubscriptionStatus,
}));

const DEFAULT_FILTERS: OrganizationListFilters = {
  search: "",
  planCode: "",
  status: undefined,
  page: 1,
  pageSize: 20,
};

export const OrganizationsTable = () => {
  const [filters, setFilters] =
    useState<OrganizationListFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const organizations = useAdminOrganizations(filters);
  const plans = useAdminPlans();

  const patchFilters = (patch: Partial<OrganizationListFilters>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      ...(patch.search !== undefined || patch.planCode !== undefined
        ? { page: 1 }
        : {}),
    }));
  };

  const columns: ColumnsType<OrganizationListRow> = [
    {
      title: "Organization",
      dataIndex: "name",
      key: "name",
      render: (name: string, row) => (
        <span>
          {name}
          <br />
          <small>{row.ownerEmail ?? "—"}</small>
        </span>
      ),
    },
    {
      title: "Plan",
      key: "plan",
      width: 140,
      render: (_, row) => row.planCode ?? "FREE",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: SubscriptionStatus | null) =>
        status ? (
          <span>
            {(() => {
              const meta = getSubscriptionStatusMeta(status);
              return <span>{meta.label}</span>;
            })()}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "Interval",
      dataIndex: "interval",
      key: "interval",
      width: 100,
      render: (interval: string | null) => interval ?? "—",
    },
    {
      title: "Period end",
      dataIndex: "currentPeriodEnd",
      key: "currentPeriodEnd",
      width: 130,
      render: (value: string | null) => formatDate(value),
    },
    {
      title: "Latest payment",
      dataIndex: "latestPaymentStatus",
      key: "latestPaymentStatus",
      width: 140,
      render: (status: OrganizationListRow["latestPaymentStatus"]) => {
        if (!status) return "—";
        const meta = getPaymentStatusMeta(status);
        return meta.label;
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: (value: string) => formatDate(value),
    },
  ];

  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col flex="260px">
          <Input.Search
            allowClear
            placeholder="Search by name"
            onSearch={(value) => patchFilters({ search: value })}
          />
        </Col>
        <Col flex="180px">
          <Select
            allowClear
            placeholder="Plan"
            style={{ width: "100%" }}
            options={[
              { label: "Free", value: "FREE" },
              ...(plans.data ?? []).map((plan) => ({
                label: plan.name,
                value: plan.code,
              })),
            ]}
            value={filters.planCode || undefined}
            onChange={(value) => patchFilters({ planCode: value ?? "" })}
          />
        </Col>
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
      </Row>
      <Table<OrganizationListRow>
        rowKey="id"
        size="small"
        loading={organizations.isLoading}
        columns={columns}
        dataSource={organizations.data?.rows ?? []}
        scroll={{ x: true }}
        onRow={(row) => ({
          onClick: () => setSelectedId(row.id),
        })}
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total: organizations.data?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `${total} organizations`,
          onChange: (page, pageSize) =>
            setFilters((current) => ({
              ...current,
              page,
              pageSize,
            })),
        }}
      />
      <OrganizationDrawer
        organizationId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
};
