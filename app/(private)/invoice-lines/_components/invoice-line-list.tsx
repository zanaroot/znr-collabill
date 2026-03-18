"use client";

import { Card, Flex, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { InvoiceLine } from "@/http/models/invoice.model";
import { useInvoiceLines } from "../_hooks/use-invoice-lines";

const { Title, Text } = Typography;

export function InvoiceLineList() {
  const { data: lines, isLoading } = useInvoiceLines();

  const columns: ColumnsType<InvoiceLine> = [
    {
      title: "Label",
      dataIndex: "label",
      key: "label",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => (
        <Tag color={type === "TASK" ? "blue" : "green"}>{type}</Tag>
      ),
    },
    {
      title: "User",
      key: "user",
      render: (_, record) => <Text>{record.invoice?.user?.name || "-"}</Text>,
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      align: "right",
    },
    {
      title: "Unit Price",
      dataIndex: "unitPrice",
      key: "unitPrice",
      align: "right",
      render: (price: string) => `${price} €`,
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      align: "right",
      render: (total: string) => <Text strong>{total} €</Text>,
    },
    {
      title: "Period",
      key: "period",
      render: (_, record) =>
        record.invoice
          ? `${record.invoice.periodStart} to ${record.invoice.periodEnd}`
          : "-",
    },
  ];

  return (
    <Card
      title={
        <Flex justify="space-between" align="center">
          <Title level={4} style={{ margin: 0 }}>
            Invoice Lines
          </Title>
        </Flex>
      }
    >
      <Table
        columns={columns}
        dataSource={lines}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}
