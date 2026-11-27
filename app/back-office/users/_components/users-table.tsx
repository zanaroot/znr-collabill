"use client";

import { DeleteOutlined } from "@ant-design/icons";
import { Button, Col, Input, Modal, Row, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { formatDate } from "@/app/_utils/billing";
import type {
  AdminUserFilters,
  AdminUserRow,
} from "../../_hooks/use-back-office";
import {
  useAdminUsers,
  useDeleteAdminUser,
} from "../../_hooks/use-back-office";

const { Paragraph } = Typography;

const DEFAULT_FILTERS: AdminUserFilters = {
  search: "",
  page: 1,
  pageSize: 20,
};

export const UsersTable = () => {
  const [filters, setFilters] = useState<AdminUserFilters>(DEFAULT_FILTERS);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const users = useAdminUsers(filters);
  const deleteUser = useDeleteAdminUser();

  const columns: ColumnsType<AdminUserRow> = [
    {
      title: "User",
      key: "user",
      render: (_, row) => (
        <span>
          {row.name}
          <br />
          <small>{row.email}</small>
        </span>
      ),
    },
    {
      title: "Platform access",
      dataIndex: "platformRole",
      key: "platformRole",
      width: 150,
      render: (role: AdminUserRow["platformRole"]) =>
        role ? <Tag color="blue">{role}</Tag> : "—",
    },
    {
      title: "Organizations",
      dataIndex: "organizationCount",
      key: "organizationCount",
      width: 130,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: (createdAt: string | null) => formatDate(createdAt),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, row) => (
        <Button
          aria-label={`Delete ${row.name} (${row.email})`}
          danger
          icon={<DeleteOutlined />}
          onClick={() => setDeleteTarget(row)}
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
        <Col flex="1 1 240px">
          <Input.Search
            allowClear
            onSearch={(search) =>
              setFilters((current) => ({ ...current, search, page: 1 }))
            }
            placeholder="Search by name or email"
          />
        </Col>
      </Row>
      <Table<AdminUserRow>
        columns={columns}
        dataSource={users.data?.rows ?? []}
        loading={users.isLoading}
        onChange={(pagination) =>
          setFilters((current) => ({
            ...current,
            page: pagination.current ?? 1,
            pageSize: pagination.pageSize ?? current.pageSize,
          }))
        }
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total: users.data?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `${total} users`,
        }}
        rowKey="id"
        scroll={{ x: true }}
        size="small"
      />
      <Modal
        cancelButtonProps={{ disabled: deleteUser.isPending }}
        closable={!deleteUser.isPending}
        confirmLoading={deleteUser.isPending}
        destroyOnHidden
        okButtonProps={{ danger: true, disabled: deleteUser.isPending }}
        okText="Delete user"
        onCancel={() => {
          if (!deleteUser.isPending) setDeleteTarget(null);
        }}
        onOk={() => {
          if (!deleteTarget) return;
          deleteUser.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
        open={!!deleteTarget}
        title="Delete user"
      >
        {deleteTarget && (
          <Paragraph>
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>{" "}
            ({deleteTarget.email})? This action may permanently delete
            associated data and cannot be undone. Financial history, activity
            records, or files may prevent deletion.
          </Paragraph>
        )}
      </Modal>
    </>
  );
};
