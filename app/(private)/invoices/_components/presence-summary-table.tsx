"use client";

import { Table, Tag, Typography } from "antd";
import { AmountDisplay } from "@/app/(private)/_components/amount-display";
import type { PresenceSummary } from "@/http/models/presence.model";
import { PRESENCE_STATUS_COLORS } from "@/lib/presence";

const { Text } = Typography;

export const PresenceSummaryTable = ({ data }: { data: PresenceSummary[] }) => {
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
      render: (type: PresenceSummary["type"]) =>
        type ? (
          <Tag color={PRESENCE_STATUS_COLORS[type]}>
            {type.replace("_", " ")}
          </Tag>
        ) : null,
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
        rate ? (
          <AmountDisplay>{Number(rate).toLocaleString()} €</AmountDisplay>
        ) : (
          "Not set"
        ),
    },
    {
      title: "Rate",
      dataIndex: "rate",
      key: "rate",
      render: (rate: string | null) => `${Number(rate ?? 0)}%`,
    },
    {
      title: "Total",
      key: "total",
      render: (_: unknown, record: PresenceSummary) => {
        const dailyRate = Number(record.dailyRate ?? 0);

        const total =
          record.count * dailyRate * (Number(record.rate ?? 0) / 100);

        return (
          <Text strong>
            <AmountDisplay>{total.toLocaleString()} €</AmountDisplay>
          </Text>
        );
      },
    },
  ];

  return (
    <Table
      rowKey={(record) => `${record.userId}-${record.type}`}
      columns={columns}
      dataSource={data}
      pagination={false}
    />
  );
};
