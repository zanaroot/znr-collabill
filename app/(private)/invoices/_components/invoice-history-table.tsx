"use client";

import { Table, Typography } from "antd";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { StatusTagInvoice } from "./status-tag-invoice";

const { Title } = Typography;

export type InvoiceHistoryItem = {
  id: string;
  userId: string;
  userName?: string;
  periodStart: string;
  periodEnd: string;
  status: string | null;
  totalAmount: string | null;
};

type InvoiceHistoryTableProps = {
  data: InvoiceHistoryItem[];
  isOwner: boolean;
};

export const InvoiceHistoryTable = ({
  data,
  isOwner,
}: InvoiceHistoryTableProps) => {
  const columns = [
    {
      title: "Invoice",
      dataIndex: "id",
      key: "invoice",
      render: (id: string, record: InvoiceHistoryItem) => (
        <Link
          href={`/invoices?periodId=${format(parseISO(record.periodStart), "yyyy-MM")}${isOwner ? `&memberId=${record.userId}` : ""}`}
        >
          Invoice #{id.slice(0, 8)}
          {isOwner && record.userName && (
            <span className="ml-2 text-gray-400">({record.userName})</span>
          )}
        </Link>
      ),
    },
    {
      title: "Month",
      dataIndex: "periodStart",
      key: "month",
      render: (date: string) => format(parseISO(date), "MMMM yyyy"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string | null) => <StatusTagInvoice status={status} />,
    },
    {
      title: "Amount",
      dataIndex: "totalAmount",
      key: "amount",
      render: (amount: string | null) =>
        amount ? `$${Number(amount).toFixed(2)}` : "-",
    },
  ];

  return (
    <div className="bg-white dark:bg-card p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
      <Title level={4} className="mb-6 dark:text-white">
        Invoice History
      </Title>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};
