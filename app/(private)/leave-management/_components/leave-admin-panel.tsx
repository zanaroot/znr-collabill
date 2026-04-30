"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { LeaveRequest } from "@/http/models/leave.model";
import { client } from "@/packages/hono";

const { Text } = Typography;

interface LeaveAdminPanelProps {
  mode: "user" | "admin";
}

export const LeaveAdminPanel = ({ mode }: LeaveAdminPanelProps) => {
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: [mode === "user" ? "my-leave-requests" : "org-leave-requests"],
    queryFn: async () => {
      const res =
        mode === "user"
          ? await client.api["leave-requests"].my.$get()
          : await client.api["leave-requests"].org.$get();
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((r) => ({
          ...r,
          createdAt: r.createdAt ?? undefined,
          updatedAt: r.updatedAt ?? undefined,
        }));
      }
      return [];
    },
  });

  const { mutateAsync: updateStatus, isPending } = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
    }) => {
      const res = await client.api["leave-requests"][":id"].status.$patch({
        param: { id } as { id: string },
        json: { status } as { status: "PENDING" | "APPROVED" | "REJECTED" },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to update status");
      }

      return res.json();
    },
    onSuccess: () => {
      message.success("Leave request status updated");
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["org-leave-requests"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const columns: ColumnsType<LeaveRequest> = [
    {
      title: "Date Range",
      key: "dates",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>
            {dayjs(record.startDate).format("DD MMM YYYY")} -{" "}
            {dayjs(record.endDate).format("DD MMM YYYY")}
          </Text>
          <Text type="secondary">
            {dayjs(record.endDate).diff(dayjs(record.startDate), "day") + 1}{" "}
            day(s)
          </Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => <Tag color="blue">{type.replace("_", " ")}</Tag>,
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = "orange";
        if (status === "APPROVED") color = "green";
        if (status === "REJECTED") color = "red";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          {mode === "admin" && record.status === "PENDING" && (
            <>
              <Popconfirm
                title="Approve this leave request?"
                onConfirm={() =>
                  updateStatus({ id: record.id, status: "APPROVED" })
                }
              >
                <Button type="primary" size="small">
                  Approve
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Reject this leave request?"
                onConfirm={() =>
                  updateStatus({ id: record.id, status: "REJECTED" })
                }
              >
                <Button danger size="small">
                  Reject
                </Button>
              </Popconfirm>
            </>
          )}
          {mode === "user" && record.status === "PENDING" && (
            <Button danger size="small" disabled>
              Cancel
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={Array.isArray(requests) ? requests : []}
      rowKey="id"
      loading={isLoading || isPending}
    />
  );
};
