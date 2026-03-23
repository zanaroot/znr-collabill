"use client";

import { Table, Typography } from "antd";

const { Text } = Typography;

export interface TaskSummaryRow {
  userId: string;
  userName: string;
  XS: { count: number; rate: string | null };
  S: { count: number; rate: string | null };
  M: { count: number; rate: string | null };
  L: { count: number; rate: string | null };
  XL: { count: number; rate: string | null };
  total: number;
}

export interface RawTaskSummary {
  userId: string;
  userName: string;
  size: "XS" | "S" | "M" | "L" | "XL";
  taskCount: number;
  rateXs: string | null;
  rateS: string | null;
  rateM: string | null;
  rateL: string | null;
  rateXl: string | null;
}

export const TaskSummaryTable = ({ data }: { data: RawTaskSummary[] }) => {
  // Pivot data
  const usersMap = new Map<string, TaskSummaryRow>();

  for (const item of data) {
    if (!usersMap.has(item.userId)) {
      usersMap.set(item.userId, {
        userId: item.userId,
        userName: item.userName,
        XS: { count: 0, rate: item.rateXs },
        S: { count: 0, rate: item.rateS },
        M: { count: 0, rate: item.rateM },
        L: { count: 0, rate: item.rateL },
        XL: { count: 0, rate: item.rateXl },
        total: 0,
      });
    }

    const row = usersMap.get(item.userId);
    if (!row) continue;
    const size = item.size as keyof Pick<
      TaskSummaryRow,
      "XS" | "S" | "M" | "L" | "XL"
    >;
    row[size].count = Number(item.taskCount);

    const rate = Number(row[size].rate || 0);
    row.total += row[size].count * rate;
  }

  const dataSource = Array.from(usersMap.values());

  const columns = [
    {
      title: "User",
      dataIndex: "userName",
      key: "userName",
    },
    {
      title: "XS",
      key: "XS",
      render: (_: unknown, record: TaskSummaryRow) => (
        <Text>
          {record.XS.count > 0
            ? `${record.XS.count} (${Number(record.XS.rate).toLocaleString()} €)`
            : "-"}
        </Text>
      ),
    },
    {
      title: "S",
      key: "S",
      render: (_: unknown, record: TaskSummaryRow) => (
        <Text>
          {record.S.count > 0
            ? `${record.S.count} (${Number(record.S.rate).toLocaleString()} €)`
            : "-"}
        </Text>
      ),
    },
    {
      title: "M",
      key: "M",
      render: (_: unknown, record: TaskSummaryRow) => (
        <Text>
          {record.M.count > 0
            ? `${record.M.count} (${Number(record.M.rate).toLocaleString()} €)`
            : "-"}
        </Text>
      ),
    },
    {
      title: "L",
      key: "L",
      render: (_: unknown, record: TaskSummaryRow) => (
        <Text>
          {record.L.count > 0
            ? `${record.L.count} (${Number(record.L.rate).toLocaleString()} €)`
            : "-"}
        </Text>
      ),
    },
    {
      title: "XL",
      key: "XL",
      render: (_: unknown, record: TaskSummaryRow) => (
        <Text>
          {record.XL.count > 0
            ? `${record.XL.count} (${Number(record.XL.rate).toLocaleString()} €)`
            : "-"}
        </Text>
      ),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (total: number) => <Text strong>{total.toLocaleString()} €</Text>,
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      rowKey="userId"
      pagination={false}
    />
  );
};
