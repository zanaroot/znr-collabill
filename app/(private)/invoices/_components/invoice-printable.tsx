"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  App,
  Button,
  Divider,
  Input,
  InputNumber,
  Space,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import type { z } from "zod";
import { TaskSizeTag } from "@/app/_components/task-size-tag";
import { StatusTagInvoice } from "@/app/(private)/invoices/_components/status-tag-invoice";
import type { CreateInvoiceInput, InvoiceStatus, invoiceLineSchema } from "@/http/models/invoice.model";

type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

import { client } from "@/packages/hono";
import type { PresenceSummary } from "./presence-summary-table";
import type { RawTaskSummary } from "./task-summary-table";

const { Title, Text, Paragraph } = Typography;

type InvoicePrintableProps = {
  presenceData: PresenceSummary[];
  taskData: RawTaskSummary[];
  organizationName: string;
  organizationId: string;
  targetUserName?: string;
  targetUserId?: string;
  periodId?: string;
  periodStart?: string;
  periodEnd?: string;
  periodName?: string;
  existingInvoice?: { id: string; status: InvoiceStatus | null } | null;
  isOwner?: boolean;
  customLines?: Array<{ label: string; amount: string; key: string }>;
  onCustomLinesChange?: (
    lines: Array<{ label: string; amount: string; key: string }>,
  ) => void;
};

export const InvoicePrintable = ({
  presenceData,
  taskData,
  organizationName,
  organizationId,
  targetUserName,
  targetUserId,
  periodId,
  periodStart,
  periodEnd,
  periodName,
  existingInvoice,
  isOwner,
  customLines = [],
  onCustomLinesChange,
}: InvoicePrintableProps) => {
  const { message } = App.useApp();
  const [clientInvoiceDate] = useState(() =>
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );
  const [clientInvoiceNumber] = useState(
    () =>
      `INV-${Date.now().toString().slice(-6)}-${organizationId.slice(0, 4).toUpperCase()}`,
  );

  const _handlePrint = () => {
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

  const { mutateAsync: validateInvoice } = useMutation({
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
      const baseRate = Number(item[rateKey] || 0);
      const projectRate = Number(item.projectBaseRate || 1);
      const totalRate = baseRate * projectRate;
      return acc + item.taskCount * totalRate;
    }, 0);
  }, [taskData]);

  const customTotal = useMemo(() => {
    return customLines.reduce((acc, item) => {
      return acc + Number(item.amount || 0);
    }, 0);
  }, [customLines]);

  const grandTotal = presenceTotal + taskTotal + customTotal;
  const invoiceDate = clientInvoiceDate;
  const invoiceNumber = clientInvoiceNumber;
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldAmount, setNewFieldAmount] = useState("");

  const _handleValidate = async () => {
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
      const baseRate = Number((t[rateKey] as unknown) || 0);
      const projectRate = Number(t.projectBaseRate || 1);
      const totalRate = baseRate * projectRate;
      const amount = t.taskCount * totalRate;

      if (amount > 0) {
        totalAmount += amount;
        linesInput.push({
          type: "TASK",
          referenceId: t.userId,
          label: `Tasks ${t.size} for ${t.userName} (${t.projectName})`,
          quantity: t.taskCount,
          unitPrice: totalRate.toString(),
          total: amount.toString(),
        });
      }
    }

    // Add custom lines
    for (const cl of customLines) {
      const amount = Number(cl.amount || 0);
      if (amount !== 0) {
        totalAmount += amount;
        linesInput.push({
          type: "CUSTOM",
          referenceId: null,
          label: cl.label,
          quantity: 1,
          unitPrice: amount.toString(),
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
      <div className="bg-white dark:bg-card p-8 md:p-12 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 invoice-container print:shadow-none print:border-none print:p-0 print:m-0 w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-12">
          <div className="flex flex-col gap-2">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl mb-2 print:bg-blue-600">
              {organizationName.charAt(0).toUpperCase()}
            </div>
            <Title level={2} className="m-0! text-gray-800 dark:text-gray-100">
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

        <Divider className="my-8 border-gray-100 dark:border-gray-800" />

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div>
            <Text
              strong
              className="text-gray-400 uppercase text-xs tracking-wider mb-3 block dark:text-gray-500"
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
              className="text-gray-400 uppercase text-xs tracking-wider mb-3 block dark:text-gray-500"
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
          <div className="mb-8 p-4 bg-blue-50/50 rounded-lg border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 print:bg-transparent">
            <Space>
              <Text strong className="dark:text-gray-200">
                Billing for Member:
              </Text>
              <Text className="text-blue-700 dark:text-blue-300 font-semibold underline decoration-2 underline-offset-4 decoration-blue-200 dark:decoration-blue-700">
                {targetUserName}
              </Text>
            </Space>
          </div>
        )}

        <div className="mb-12">
          <Title
            level={4}
            className="flex items-center gap-2 mb-6 text-gray-700 dark:text-gray-200"
          >
            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
            Presence Details
          </Title>
          <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="text-center p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Days Worked
                  </th>
                  <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Daily Rate
                  </th>
                  <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {presenceData.map((item) => {
                  const amount =
                    item.presenceCount * Number(item.dailyRate || 0);
                  if (amount === 0) return null;
                  return (
                    <tr
                      key={item.userId}
                      className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <Text strong className="dark:text-gray-200">
                          {item.userName}
                        </Text>
                      </td>
                      <td className="text-center p-4 dark:text-gray-300">
                        <Text>{item.presenceCount} days</Text>
                      </td>
                      <td className="text-right p-4 font-mono dark:text-gray-300">
                        {Number(item.dailyRate).toLocaleString()} €
                      </td>
                      <td className="text-right p-4 font-bold text-gray-800 dark:text-gray-100 font-mono">
                        {amount.toLocaleString()} €
                      </td>
                    </tr>
                  );
                })}
                {presenceTotal === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-gray-400 italic bg-gray-50/20 dark:bg-gray-800/20"
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
            className="flex items-center gap-2 mb-6 text-gray-700 dark:text-gray-200"
          >
            <span className="w-1 h-6 bg-green-500 rounded-full"></span>
            Task Details
          </Title>
          <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Task Size
                  </th>
                  <th className="text-center p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {taskData.map((item, index) => {
                  const size = item.size.toLowerCase();
                  const rateKey =
                    `rate${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof RawTaskSummary;
                  const baseRate = Number((item[rateKey] as unknown) || 0);
                  const projectRate = Number(item.projectBaseRate || 1);
                  const totalRate = baseRate * projectRate;
                  const amount = item.taskCount * totalRate;
                  if (amount === 0) return null;
                  return (
                    <tr
                      key={`${item.userId}-${item.projectId}-${item.size}-${index}`}
                      className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <Text strong className="dark:text-gray-200">
                          {item.projectName}
                        </Text>
                      </td>
                      <td className="p-4">
                        <TaskSizeTag size={item.size} />
                      </td>
                      <td className="text-center p-4 dark:text-gray-300">
                        <Text>{item.taskCount} tasks</Text>
                      </td>
                      <td className="text-right p-4 font-mono dark:text-gray-300">
                        {totalRate.toLocaleString()} €
                      </td>
                      <td className="text-right p-4 font-bold text-gray-800 dark:text-gray-100 font-mono">
                        {amount.toLocaleString()} €
                      </td>
                    </tr>
                  );
                })}
                {taskTotal === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-gray-400 italic bg-gray-50/20 dark:bg-gray-800/20"
                    >
                      No validated tasks found for this period
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
            className="flex items-center gap-2 mb-6 text-gray-700 dark:text-gray-200"
          >
            <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
            Custom Fields
          </Title>
          <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="text-left p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  {!existingInvoice && isOwner && (
                    <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider no-print">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {customLines.map((item, index) => (
                  <tr
                    key={item.key}
                    className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <Text strong className="dark:text-gray-200">
                        {item.label}
                      </Text>
                    </td>
                    <td className="text-right p-4 font-bold text-gray-800 dark:text-gray-100 font-mono">
                      {Number(item.amount).toLocaleString()} €
                    </td>
                    {!existingInvoice && isOwner && (
                      <td className="text-right p-4 no-print">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            const newLines = [...customLines];
                            newLines.splice(index, 1);
                            onCustomLinesChange?.(newLines);
                          }}
                        />
                      </td>
                    )}
                  </tr>
                ))}
                {!existingInvoice && isOwner && (
                  <tr className="bg-gray-50/20 dark:bg-gray-800/20 no-print">
                    <td className="p-4">
                      <Input
                        placeholder="Label (e.g. Bonus, Prime)"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        variant="borderless"
                        className="font-medium"
                      />
                    </td>
                    <td className="text-right p-4">
                      <InputNumber
                        placeholder="Amount"
                        controls={false}
                        value={newFieldAmount}
                        onChange={(val) =>
                          setNewFieldAmount(val === null ? "" : String(val))
                        }
                        variant="borderless"
                        className="text-right font-mono"
                        onPressEnter={() => {
                          if (newFieldLabel && newFieldAmount) {
                            onCustomLinesChange?.([
                              ...customLines,
                              {
                                label: newFieldLabel,
                                amount: newFieldAmount,
                                key: crypto.randomUUID(),
                              },
                            ]);
                            setNewFieldLabel("");
                            setNewFieldAmount("");
                          }
                        }}
                      />
                    </td>
                    <td className="text-right p-4">
                      <Button
                        type="primary"
                        ghost
                        icon={<PlusOutlined />}
                        onClick={() => {
                          if (newFieldLabel && newFieldAmount) {
                            onCustomLinesChange?.([
                              ...customLines,
                              {
                                label: newFieldLabel,
                                amount: newFieldAmount,
                                key: crypto.randomUUID(),
                              },
                            ]);
                            setNewFieldLabel("");
                            setNewFieldAmount("");
                          } else {
                            message.warning(
                              "Please enter both label and amount",
                            );
                          }
                        }}
                      >
                        Add
                      </Button>
                    </td>
                  </tr>
                )}
                {customLines.length === 0 && (existingInvoice || !isOwner) && (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-8 text-center text-gray-400 italic bg-gray-50/20 dark:bg-gray-800/20"
                    >
                      No custom fields for this invoice
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
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                <Text className="dark:text-gray-300">Presence Subtotal</Text>
                <Text className="font-mono dark:text-gray-200">
                  {presenceTotal.toLocaleString()} €
                </Text>
              </div>
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                <Text className="dark:text-gray-300">Tasks Subtotal</Text>
                <Text className="font-mono dark:text-gray-200">
                  {taskTotal.toLocaleString()} €
                </Text>
              </div>
              {customTotal !== 0 && (
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                  <Text className="dark:text-gray-300">Custom Fields</Text>
                  <Text className="font-mono dark:text-gray-200">
                    {customTotal.toLocaleString()} €
                  </Text>
                </div>
              )}
              <Divider className="my-2 border-gray-200 dark:border-gray-700" />
              <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 text-white dark:text-white p-4 rounded-lg shadow-inner print:bg-gray-100 print:text-black">
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
        <div className="mt-20 border-t border-gray-100 dark:border-gray-800 pt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <Text
                strong
                className="block mb-2 text-gray-800 dark:text-gray-200"
              >
                Payment Notes:
              </Text>
              <Paragraph className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                Please make sure all tasks are validated before the end of the
                billing period. Payment details should be confirmed with the
                organization owner.
              </Paragraph>
            </div>
            <div className="md:text-right">
              <Text
                strong
                className="block mb-2 text-gray-800 dark:text-gray-200"
              >
                Authorized By:
              </Text>
              <div className="h-16 w-48 ml-auto border-b border-gray-200 dark:border-gray-700 italic text-gray-300 dark:text-gray-600 flex items-end justify-center pb-1 font-serif text-xl">
                {organizationName}
              </div>
            </div>
          </div>

          <div className="text-center">
            <Text type="secondary" className="text-xs dark:text-gray-500">
              This is a computer-generated summary for {organizationName}.
              Generated on {new Date().toLocaleString()}.
            </Text>
            <div className="mt-2 text-gray-400 dark:text-gray-500 text-xs">
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
