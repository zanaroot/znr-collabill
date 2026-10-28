"use client";

import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useCallHistory } from "@/app/(private)/_components/calls/_hooks/use-calls";
import type { CallDto } from "@/http/models/call.model";

const { Title } = Typography;

const STATUS_COLORS: Record<CallDto["status"], string> = {
  RINGING: "blue",
  ACTIVE: "green",
  ENDED: "default",
  MISSED: "orange",
  REJECTED: "red",
  CANCELLED: "default",
};

const TYPE_ICONS: Record<CallDto["type"], string> = {
  AUDIO: "Audio",
  VIDEO: "Video",
};

export const CallHistoryList = () => {
  const { data: calls, isLoading } = useCallHistory();

  const columns: ColumnsType<CallDto> = [
    {
      title: "Participants",
      key: "participants",
      ellipsis: true,
      render: (_, record) => {
        const names = [
          record.initiator?.name,
          ...record.participants.map(
            (participant) => participant.user?.name ?? participant.guestName,
          ),
        ].filter((name): name is string => Boolean(name));
        return names.join(", ") || "-";
      },
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 90,
      render: (type: CallDto["type"]) => TYPE_ICONS[type],
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: CallDto["status"]) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
    },
    {
      title: "Started",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 190,
      responsive: ["sm", "md", "lg", "xl"],
      render: (value: string) => dayjs(value).format("MMM D, YYYY HH:mm"),
    },
    {
      title: "Duration",
      key: "duration",
      width: 110,
      responsive: ["lg", "xl"],
      render: (_, record) => {
        if (!record.startedAt || !record.endedAt) return "-";
        const seconds = dayjs(record.endedAt).diff(
          dayjs(record.startedAt),
          "second",
        );
        if (seconds < 60) return `${seconds}s`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      },
    },
  ];

  return (
    <Card
      title={
        <Title level={4} style={{ margin: 0 }}>
          Call History
        </Title>
      }
      styles={{ body: { padding: "12px" } }}
    >
      <div className="table-responsive">
        <Table
          columns={columns}
          dataSource={calls ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 720 }}
          tableLayout="fixed"
          size="middle"
        />
      </div>
    </Card>
  );
};
