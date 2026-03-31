"use client";

import { Table, Typography } from "antd";

const { Text } = Typography;

export interface TaskSummaryRow {
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  projectBaseRate: number;
  XS: number;
  S: number;
  M: number;
  L: number;
  XL: number;
  total: number;
}

export interface RawTaskSummary {
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  projectBaseRate: string | null;
  size: "XS" | "S" | "M" | "L" | "XL";
  taskCount: number;
  rateXs: string | null;
  rateS: string | null;
  rateM: string | null;
  rateL: string | null;
  rateXl: string | null;
}

const getRateForSize = (
  size: string,
  rates: {
    rateXs: string | null;
    rateS: string | null;
    rateM: string | null;
    rateL: string | null;
    rateXl: string | null;
  },
): number => {
  switch (size) {
    case "XS":
      return Number(rates.rateXs || 0);
    case "S":
      return Number(rates.rateS || 0);
    case "M":
      return Number(rates.rateM || 0);
    case "L":
      return Number(rates.rateL || 0);
    case "XL":
      return Number(rates.rateXl || 0);
    default:
      return 0;
  }
};

export const TaskSummaryTable = ({ data }: { data: RawTaskSummary[] }) => {
  const rowsMap = new Map<string, TaskSummaryRow>();

  for (const item of data) {
    const key = `${item.userId}-${item.projectId}`;
    const projectRate = Number(item.projectBaseRate || 1);

    if (!rowsMap.has(key)) {
      rowsMap.set(key, {
        userId: item.userId,
        userName: item.userName,
        projectId: item.projectId,
        projectName: item.projectName,
        projectBaseRate: projectRate,
        XS: 0,
        S: 0,
        M: 0,
        L: 0,
        XL: 0,
        total: 0,
      });
    }

    const row = rowsMap.get(key);
    if (!row) continue;
    const baseRate = getRateForSize(item.size, {
      rateXs: item.rateXs,
      rateS: item.rateS,
      rateM: item.rateM,
      rateL: item.rateL,
      rateXl: item.rateXl,
    });
    const totalRate = baseRate * projectRate;
    const sizeKey = item.size as keyof Pick<
      TaskSummaryRow,
      "XS" | "S" | "M" | "L" | "XL"
    >;
    row[sizeKey] += Number(item.taskCount);
    row.total += Number(item.taskCount) * totalRate;
  }

  const dataSource = Array.from(rowsMap.values());

  const columns = [
    {
      title: "User",
      dataIndex: "userName",
      key: "userName",
    },
    {
      title: "Project",
      dataIndex: "projectName",
      key: "projectName",
    },
    {
      title: "XS",
      dataIndex: "XS",
      key: "XS",
      render: (count: number) => (count > 0 ? count : "-"),
    },
    {
      title: "S",
      dataIndex: "S",
      key: "S",
      render: (count: number) => (count > 0 ? count : "-"),
    },
    {
      title: "M",
      dataIndex: "M",
      key: "M",
      render: (count: number) => (count > 0 ? count : "-"),
    },
    {
      title: "L",
      dataIndex: "L",
      key: "L",
      render: (count: number) => (count > 0 ? count : "-"),
    },
    {
      title: "XL",
      dataIndex: "XL",
      key: "XL",
      render: (count: number) => (count > 0 ? count : "-"),
    },
    {
      title: "Total (€)",
      dataIndex: "total",
      key: "total",
      render: (total: number) => <Text strong>{total.toLocaleString()} €</Text>,
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      rowKey={(record) => `${record.userId}-${record.projectId}`}
      pagination={false}
    />
  );
};
