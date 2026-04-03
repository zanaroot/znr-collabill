"use client";

import { Button, Table, Typography } from "antd";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const getDetailsUrl = (record: InvoiceHistoryItem) => {
    return `/invoices?periodId=${format(parseISO(record.periodStart), "yyyy-MM")}${
      isOwner ? `&memberId=${record.userId}` : ""
    }`;
  };

  const columns = [
    {
      title: "Invoice",
      dataIndex: "id",
      key: "invoice",
      render: (id: string, record: InvoiceHistoryItem) => (
        <div className="flex flex-col">
          <span className="font-medium text-blue-600 dark:text-blue-400">
            Invoice #{id.slice(0, 8)}
          </span>
          {isOwner && record.userName && (
            <span className="text-gray-400 text-xs">({record.userName})</span>
          )}
        </div>
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
        amount ? `${Number(amount).toFixed(2)} €` : "-",
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      render: (_: unknown, record: InvoiceHistoryItem) => (
        <Button
          type="primary"
          ghost
          onClick={(e) => {
            e.stopPropagation();
            router.push(getDetailsUrl(record));
          }}
        >
          View Details
        </Button>
      ),
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
        onRow={(record) => ({
          onClick: () => {
            router.push(getDetailsUrl(record));
          },
          className: "cursor-pointer",
        })}
      />
    </div>
  );
};
