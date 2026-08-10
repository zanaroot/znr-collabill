
"use client";

import { Table, Typography } from "antd";

const { Text } = Typography;

export interface PresenceSummary {
  userId: string;
  userName: string;
  type:
  | "OFFICE"
  | "REMOTE"
  | "ON_SITE"
  | "SICK"
  | "VACATION"
  | "ON_LEAVE";
  count: number;
  dailyRate: string | null;
  rate: number;
}

export const PresenceSummaryTable = ({
  data,
}: {
  data: PresenceSummary[];
}) => {
  const columns = [
    {
      title: "User",
      dataIndex: "userName",
      key: "userName",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => <span>{type}</span>,
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      render: (count: number) => <span>{count} days</span>,
    },
    {
      title: "Daily Rate",
      dataIndex: "dailyRate",
      key: "dailyRate",
      render: (rate: string | null) =>
        rate ? `${Number(rate).toLocaleString()} €` : "Not set",
    },
    {
      title: "Total",
      key: "total",
      render: (_: unknown, record: PresenceSummary) => {
        const dailyRate = Number(record.dailyRate ?? 0);

        const total =
          record.count * dailyRate * (record.rate / 100);

        return (
          <Text strong>
            {total.toLocaleString()} €
          </Text>
        );
      },
    },
  ];

  console.log("PresenceSummaryTable", data);

  return (
    <Table
      rowKey={(record) => `${record.userId}-${record.type}`}
      columns={columns}
      dataSource={data}
      pagination={false}
    />
  );
};
