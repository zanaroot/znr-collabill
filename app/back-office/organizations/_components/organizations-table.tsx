"use client";

import { DeleteOutlined } from "@ant-design/icons";
import {
  Button,
  Col,
  Input,
  Modal,
  Row,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { Email } from "@/app/_components/email";
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
  useDeleteAdminOrganization,
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

const { Paragraph } = Typography;

export const OrganizationsTable = () => {
  const [filters, setFilters] =
    useState<OrganizationListFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrganizationListRow | null>(
    null,
  );
  const organizations = useAdminOrganizations(filters);
  const plans = useAdminPlans();
  const deleteOrganization = useDeleteAdminOrganization();

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
          <small>
            {row.ownerEmail ? <Email email={row.ownerEmail} /> : "—"}
          </small>
        </span>
      ),
    },
    {
      title: "Plan",
      key: "plan",
      width: 140,
      render: (_, row) =>
        row.paymentExempt || row.isPaymentExempt ? (
          <Tag color="green">Free Plan</Tag>
        ) : (
          (row.planCode ?? "FREE")
        ),
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
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, row) => (
        <Button
          aria-label={`Delete ${row.name}`}
          danger
          icon={<DeleteOutlined />}
          onClick={(event) => {
            event.stopPropagation();
            setDeleteTarget(row);
          }}
          size="small"
          type="text"
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col flex="1 1 220px">
          <Input.Search
            allowClear
            placeholder="Search by name"
            onSearch={(value) => patchFilters({ search: value })}
          />
        </Col>
        <Col flex="1 1 160px">
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
        <Col flex="1 1 160px">
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
      <Modal
        cancelButtonProps={{ disabled: deleteOrganization.isPending }}
        closable={!deleteOrganization.isPending}
        confirmLoading={deleteOrganization.isPending}
        destroyOnHidden
        okButtonProps={{ danger: true, disabled: deleteOrganization.isPending }}
        okText="Delete organization"
        onCancel={() => {
          if (!deleteOrganization.isPending) setDeleteTarget(null);
        }}
        onOk={() => {
          if (!deleteTarget) return;
          deleteOrganization.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
        open={!!deleteTarget}
        title="Delete organization"
      >
        {deleteTarget && (
          <Paragraph>
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>
            ? This action may permanently delete its associated data and cannot
            be undone. Financial history, activity records, or files may prevent
            deletion.
          </Paragraph>
        )}
      </Modal>
    </>
  );
};
