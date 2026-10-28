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
      ellipsis: true,
      render: (title: string, record) => (
        <Button
          type="link"
          title={title}
          onClick={() => onOpenDetail(record)}
          style={{
            padding: 0,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </Button>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: MeetingListItem["status"]) => (
        <MeetingStatusTag status={status} />
      ),
    },
    {
      title: "Created by",
      key: "createdBy",
      width: 150,
      responsive: ["sm", "md", "lg", "xl"],
      render: (_, record) => record.creator?.name ?? "-",
    },
    {
      title: "Scheduled",
      dataIndex: "scheduledAt",
      key: "scheduledAt",
      width: 170,
      responsive: ["md", "lg", "xl"],
      render: (value: string | null) =>
        value ? dayjs(value).format("MMM D, YYYY HH:mm") : "-",
    },
    {
      title: "Guests",
      dataIndex: "guestAccess",
      key: "guestAccess",
      width: 110,
      responsive: ["lg", "xl"],
      render: (enabled: boolean) => (enabled ? "Allowed" : "Disabled"),
    },
    {
      title: "Participants",
      dataIndex: "participantCount",
      key: "participantCount",
      width: 120,
      responsive: ["lg", "xl"],
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
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
          scroll={{ x: 940 }}
          tableLayout="fixed"
          size="middle"
        />
      </div>
    </Card>
  );
};
