"use client";

import { Button, Card, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { MeetingListItem } from "../_hooks/use-meetings";
import { MeetingStatusTag } from "./meeting-status-tag";

const { Title } = Typography;

export const MeetingList = ({
  meetings,
  isLoading,
  onOpenDetail,
  onCreate,
}: {
  meetings: MeetingListItem[];
  isLoading: boolean;
  onOpenDetail: (meeting: MeetingListItem) => void;
  onCreate: () => void;
}) => {
  const columns: ColumnsType<MeetingListItem> = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (title: string, record) => (
        <Button
          type="link"
          onClick={() => onOpenDetail(record)}
          style={{ padding: 0 }}
        >
          {title}
        </Button>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: MeetingListItem["status"]) => (
        <MeetingStatusTag status={status} />
      ),
    },
    {
      title: "Created by",
      key: "createdBy",
      responsive: ["sm", "md", "lg", "xl"],
      render: (_, record) => record.creator?.name ?? "-",
    },
    {
      title: "Scheduled",
      dataIndex: "scheduledAt",
      key: "scheduledAt",
      responsive: ["md", "lg", "xl"],
      render: (value: string | null) =>
        value ? dayjs(value).format("MMM D, YYYY HH:mm") : "-",
    },
    {
      title: "Guests",
      dataIndex: "guestAccess",
      key: "guestAccess",
      responsive: ["lg", "xl"],
      render: (enabled: boolean) => (enabled ? "Allowed" : "Disabled"),
    },
    {
      title: "Participants",
      dataIndex: "participantCount",
      key: "participantCount",
      responsive: ["lg", "xl"],
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      responsive: ["xl"],
      render: (value: string) => dayjs(value).format("MMM D, YYYY"),
    },
  ];

  return (
    <Card
      title={
        <Title level={4} style={{ margin: 0 }}>
          Meetings
        </Title>
      }
      extra={
        <Button type="primary" onClick={onCreate}>
          New Meeting
        </Button>
      }
      styles={{ body: { padding: "12px" } }}
    >
      <div className="table-responsive">
        <Table
          columns={columns}
          dataSource={meetings}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: "max-content" }}
          size="middle"
        />
      </div>
    </Card>
  );
};
