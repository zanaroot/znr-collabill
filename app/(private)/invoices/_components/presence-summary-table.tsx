"use client";

import { Table, Typography } from "antd";

const { Text } = Typography;

export interface PresenceSummary {
  userId: string;
  userName: string;
  dailyRate: string | null;
  presenceCount: number;
}

export const PresenceSummaryTable = ({ data }: { data: PresenceSummary[] }) => {
  const columns = [
    {
      title: "User",
      dataIndex: "userName",
      key: "userName",
    },
    {
      title: "Presence Count",
      dataIndex: "presenceCount",
      key: "presenceCount",
      render: (count: number) => <Text>{count} days</Text>,
    },
    {
      title: "Daily Rate",
      dataIndex: "dailyRate",
      key: "dailyRate",
      render: (rate: string | null) =>
        rate ? `${Number(rate).toLocaleString()} €` : "Not set",
    },
    {
      title: "Total (Theoretical)",
      key: "total",
      render: (_: unknown, record: PresenceSummary) => {
        const rate = Number(record.dailyRate || 0);
        const total = record.presenceCount * rate;
        return <Text strong>{total.toLocaleString()} €</Text>;
      },
    },
  ];

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="userId"
      pagination={false}
    />
  );
};
