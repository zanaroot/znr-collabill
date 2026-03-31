"use client";

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Divider, message, Space, Tag, Typography } from "antd";
import { useMemo } from "react";
import { StatusTagInvoice } from "@/app/(private)/invoices/_components/status-tag-invoice";
import type {
  CreateInvoiceInput,
  InvoiceStatus,
} from "@/http/models/invoice.model";
import { client } from "@/packages/hono";
import type { PresenceSummary } from "./presence-summary-table";
import type { RawTaskSummary } from "./task-summary-table";

const { Title, Text, Paragraph } = Typography;

type InvoiceLineInput = {
  type: string;
  referenceId: string | null;
  label: string;
  quantity: number;
  unitPrice: string;
  total: string;
};

type InvoicePrintableProps = {
  presenceData: PresenceSummary[];
  taskData: RawTaskSummary[];
  organizationName: string;
  organizationId: string;
  targetUserName?: string;
  targetUserId: string;
  periodId?: string;
  periodStart?: string;
  periodEnd?: string;
  periodName?: string;
  existingInvoice?: { id: string; status: InvoiceStatus | null } | null;
  isOwner?: boolean;
};

export const InvoicePrintable = ({
  presenceData,
  taskData,
  organizationName,
  organizationId,
  targetUserName,
  targetUserId,
  periodStart,
  periodEnd,
  periodName,
  existingInvoice,
  isOwner,
}: InvoicePrintableProps) => {
  const handlePrint = () => {
    window.print();
  };

  const { data: organizationOwner, isLoading: isLoadingOwner } = useQuery({
    queryKey: ["organization-owner", organizationId],
    queryFn: async () => {
      const res = await client.api.organizations[":id"].owner.$get({
        param: { id: organizationId },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch organization owner");
      }
      return res.json();
    },
  });

  const { mutateAsync: validateInvoice, isPending: isValidating } = useMutation(
    {
      mutationFn: async (args: CreateInvoiceInput) => {
        const res = await client.api.invoices.$post({
          json: args,
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            (errorData as { error?: string }).error ||
            "Failed to validate invoice",
          );
        }
        return res.json();
      },
      onSuccess: () => {
        message.success("Invoice validated successfully!");
        window.location.reload();
      },
      onError: (error: Error) => {
        message.error(error.message);
      },
    },
  );

  const { mutateAsync: markAsPaid, isPending: isMarkingPaid } = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.invoices[":id"].status.$patch({
        param: { id },
        json: { status: "PAID" },
      });
      const result = await res.json();
      if (!res.ok) {
        const errorData = result as { error?: string };
        throw new Error(errorData.error || "Failed to mark as paid");
      }
      return result;
    },
    onSuccess: () => {
      message.success("Invoice marked as paid!");
      window.location.reload();
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const { mutateAsync: unvalidateInvoice, isPending: isUnvalidating } =
    useMutation({
      mutationFn: async (id: string) => {
        const res = await client.api.invoices[":id"].status.$patch({
          param: { id },
          json: { status: "DRAFT" },
        });
        const result = await res.json();
        if (!res.ok) {
          const errorData = result as { error?: string };
          throw new Error(errorData.error || "Failed to unvalidate invoice");
        }
        return result;
      },
      onSuccess: () => {
        message.success("Invoice unvalidated successfully!");
        window.location.reload();
      },
      onError: (error: Error) => {
        message.error(error.message);
      },
    });

  const presenceTotal = useMemo(() => {
    return presenceData.reduce((acc, item) => {
      return acc + item.presenceCount * Number(item.dailyRate || 0);
    }, 0);
  }, [presenceData]);

  const taskTotal = useMemo(() => {
    return taskData.reduce((acc, item) => {
      const size = item.size.toLowerCase();
      const rateKey =
        `rate${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof RawTaskSummary;
      const rate = Number(item[rateKey] || 0);
      return acc + item.taskCount * rate;
    }, 0);
  }, [taskData]);

  const grandTotal = presenceTotal + taskTotal;
  const invoiceDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${organizationId.slice(0, 4).toUpperCase()}`;

  const handleValidate = async () => {
    if (!targetUserId || !periodStart || !periodEnd) return;

    let totalAmount = 0;
    const linesInput: InvoiceLineInput[] = [];

    for (const p of presenceData) {
      const rate = Number(p.dailyRate || 0);
      const amount = p.presenceCount * rate;
      if (amount > 0) {
        totalAmount += amount;
        linesInput.push({
          type: "PRESENCE",
          referenceId: p.userId,
          label: `Presence for ${p.userName}`,
          quantity: p.presenceCount,
          unitPrice: rate.toString(),
          total: amount.toString(),
        });
      }
    }

    for (const t of taskData) {
      const size = t.size.toLowerCase();
      const rateKey =
        `rate${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof RawTaskSummary;
      const rate = Number((t[rateKey] as unknown) || 0);
      const amount = t.taskCount * rate;

      if (amount > 0) {
        totalAmount += amount;
        linesInput.push({
          type: "TASK",
          referenceId: t.userId,
          label: `Tasks ${t.size} for ${t.userName}`,
          quantity: t.taskCount,
          unitPrice: rate.toString(),
          total: amount.toString(),
        });
      }
    }

    await validateInvoice({
      userId: targetUserId,
      organizationId: organizationId,
      periodStart,
      periodEnd,
      status: "VALIDATED",
      totalAmount: totalAmount.toString(),
      note: "Auto-validated",
      lines: linesInput,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-3 no-print">
        {isOwner &&
          !existingInvoice &&
          targetUserId &&
          periodStart &&
          periodEnd && (
            <Button
              variant="solid"
              loading={isValidating}
              icon={<CheckCircleOutlined />}
              onClick={handleValidate}
              color="green"
            >
              Validate Invoice
            </Button>
          )}
        {existingInvoice?.status === "VALIDATED" && isOwner && (
          <>
            <Button
              variant="solid"
              loading={isUnvalidating}
              icon={<CloseCircleOutlined />}
              onClick={() => unvalidateInvoice(existingInvoice.id)}
              color="orange"
            >
              Unvalidate
            </Button>
            <Button
              variant="solid"
              loading={isMarkingPaid}
              icon={<CheckCircleOutlined />}
              onClick={() => markAsPaid(existingInvoice.id)}
              color="purple"
            >
              Mark as Paid
            </Button>
          </>
        )}
        {existingInvoice?.status !== "PAID" && (
          <Button
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            type="primary"
            className="shadow-md"
          >
            Print Invoice
          </Button>
        )}
      </div>

      <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg border border-gray-100 invoice-container print:shadow-none print:border-none print:p-0 print:m-0 w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-12">
          <div className="flex flex-col gap-2">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl mb-2 print:bg-blue-600">
              {organizationName.charAt(0).toUpperCase()}
            </div>
            <Title level={2} className="m-0! text-gray-800">
              {organizationName}
            </Title>
            <div className="flex flex-col">
              <Text
                type="secondary"
                className="text-sm uppercase tracking-widest"
              >
                Billing Summary
              </Text>
              {periodName && (
                <Text
                  strong
                  className="text-blue-600 uppercase text-xs tracking-wider"
                >
                  {periodName}
                </Text>
              )}
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <Title
              level={1}
              className="m-0! text-blue-600 font-black tracking-tighter"
            >
              INVOICE
            </Title>
            <div className="mt-4 flex flex-col gap-1 items-end">
              <div className="flex gap-2">
                <Text type="secondary" className="font-medium">
                  Invoice #:
                </Text>
                <Text strong>{invoiceNumber}</Text>
              </div>
              <div className="flex gap-2">
                <Text type="secondary" className="font-medium">
                  Date:
                </Text>
                <Text strong>{invoiceDate}</Text>
              </div>
              <StatusTagInvoice status={existingInvoice?.status || "DRAFT"} />
            </div>
          </div>
        </div>

        <Divider className="my-8 border-gray-100" />

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div>
            <Text
              strong
              className="text-gray-400 uppercase text-xs tracking-wider mb-3 block"
            >
              Bill From:
            </Text>
            <div className="flex flex-col">
              <Text strong className="text-lg">
                {organizationName}
              </Text>
              <Text type="secondary" className="text-sm">
                Collaboration & Billing Portal
              </Text>
              <Text type="secondary" className="text-sm italic">
                Cloud Managed Organization
              </Text>
            </div>
          </div>
          <div className="text-right">
            <Text
              strong
              className="text-gray-400 uppercase text-xs tracking-wider mb-3 block"
            >
              Bill To:
            </Text>
            {isLoadingOwner ? (
              <Text type="secondary">Loading owner info...</Text>
            ) : (
              <div className="flex flex-col">
                <Text strong className="text-lg">
                  {organizationOwner?.name}
                </Text>
                <Text type="secondary" className="text-sm">
                  {organizationOwner?.email}
                </Text>
                <Text type="secondary" className="text-sm">
                  Account ID: {organizationOwner?.id.slice(0, 8)}
                </Text>
              </div>
            )}
          </div>
        </div>

        {targetUserName && (
          <div className="mb-8 p-4 bg-blue-50/50 rounded-lg border border-blue-100 print:bg-transparent">
            <Space>
              <Text strong>Billing for Member:</Text>
              <Text className="text-blue-700 font-semibold underline decoration-2 underline-offset-4 decoration-blue-200">
                {targetUserName}
              </Text>
            </Space>
          </div>
        )}

        <div className="mb-12">
          <Title
            level={4}
            className="flex items-center gap-2 mb-6 text-gray-700"
          >
            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
            Presence Details
          </Title>
          <div className="overflow-hidden rounded-lg border border-gray-100 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Days Worked
                  </th>
                  <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Daily Rate
                  </th>
                  <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {presenceData.map((item) => {
                  const amount =
                    item.presenceCount * Number(item.dailyRate || 0);
                  if (amount === 0) return null;
                  return (
                    <tr
                      key={item.userId}
                      className="hover:bg-gray-50/30 transition-colors"
                    >
                      <td className="p-4">
                        <Text strong>{item.userName}</Text>
                      </td>
                      <td className="text-center p-4">
                        <Text>{item.presenceCount} days</Text>
                      </td>
                      <td className="text-right p-4 font-mono">
                        {Number(item.dailyRate).toLocaleString()} €
                      </td>
                      <td className="text-right p-4 font-bold text-gray-800 font-mono">
                        {amount.toLocaleString()} €
                      </td>
                    </tr>
                  );
                })}
                {presenceTotal === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-gray-400 italic bg-gray-50/20"
                    >
                      No presence data recorded for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-12">
          <Title
            level={4}
            className="flex items-center gap-2 mb-6 text-gray-700"
          >
            <span className="w-1 h-6 bg-green-500 rounded-full"></span>
            Task Details
          </Title>
          <div className="overflow-hidden rounded-lg border border-gray-100 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Task Size
                  </th>
                  <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {taskData.map((item, index) => {
                  const size = item.size.toLowerCase();
                  const rateKey =
                    `rate${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof RawTaskSummary;
                  const rate = Number((item[rateKey] as unknown) || 0);
                  const amount = item.taskCount * rate;
                  if (amount === 0) return null;
                  return (
                    <tr
                      key={`${item.userId}-${item.size}-${index}`}
                      className="hover:bg-gray-50/30 transition-colors"
                    >
                      <td className="p-4">
                        <Tag className="font-semibold px-2 py-0.5 rounded border-gray-200">
                          {item.size}
                        </Tag>
                      </td>
                      <td className="text-center p-4">
                        <Text>{item.taskCount} tasks</Text>
                      </td>
                      <td className="text-right p-4 font-mono">
                        {rate.toLocaleString()} €
                      </td>
                      <td className="text-right p-4 font-bold text-gray-800 font-mono">
                        {amount.toLocaleString()} €
                      </td>
                    </tr>
                  );
                })}
                {taskTotal === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-gray-400 italic bg-gray-50/20"
                    >
                      No validated tasks found for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end mt-16 mb-12">
          <div className="w-full md:w-80">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-gray-600">
                <Text>Presence Subtotal</Text>
                <Text className="font-mono">
                  {presenceTotal.toLocaleString()} €
                </Text>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <Text>Tasks Subtotal</Text>
                <Text className="font-mono">
                  {taskTotal.toLocaleString()} €
                </Text>
              </div>
              <Divider className="my-2 border-gray-200" />
              <div className="flex justify-between items-center bg-gray-100 text-white p-4 rounded-lg shadow-inner print:bg-gray-100 print:text-black">
                <Title level={3} className="m-0! text-white print:text-black">
                  Total
                </Title>
                <Title
                  level={3}
                  className="m-0! text-white font-mono print:text-black"
                >
                  {grandTotal.toLocaleString()} €
                </Title>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 border-t border-gray-100 pt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <Text strong className="block mb-2 text-gray-800">
                Payment Notes:
              </Text>
              <Paragraph className="text-gray-500 text-sm leading-relaxed">
                Please make sure all tasks are validated before the end of the
                billing period. Payment details should be confirmed with the
                organization owner.
              </Paragraph>
            </div>
            <div className="md:text-right">
              <Text strong className="block mb-2 text-gray-800">
                Authorized By:
              </Text>
              <div className="h-16 w-48 ml-auto border-b border-gray-200 italic text-gray-300 flex items-end justify-center pb-1 font-serif text-xl">
                {organizationName}
              </div>
            </div>
          </div>

          <div className="text-center">
            <Text type="secondary" className="text-xs">
              This is a computer-generated summary for {organizationName}.
              Generated on {new Date().toLocaleString()}.
            </Text>
            <div className="mt-2 text-gray-400 text-xs">
              © {new Date().getFullYear()} Collabill • {organizationName}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: white !important;
          }
          .invoice-container, .invoice-container * {
            visibility: visible;
          }
          .invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            border: none;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
            size: auto;
          }
        }
      `}</style>
    </div>
  );
};
