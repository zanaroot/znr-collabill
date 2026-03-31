"use client";

import { Select, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const { Text } = Typography;

import { getCurrentPeriod, getMonthlyPeriods } from "@/lib/periods";

type Member = {
  id: string;
  name: string;
  role: string;
};

type InvoiceFiltersProps = {
  members: Member[];
  currentUserId: string;
  showMemberFilter?: boolean;
};

export const InvoiceFilters = ({
  members,
  currentUserId,
  showMemberFilter = false,
}: InvoiceFiltersProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const periodId = searchParams.get("periodId");
  const selectedMemberId = searchParams.get("memberId") || currentUserId;

  const periods = getMonthlyPeriods();
  const currentPeriod = getCurrentPeriod();

  useEffect(() => {
    if (!periodId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("periodId", currentPeriod.id);
      router.replace(`/invoices?${params.toString()}`);
    }
  }, [periodId, currentPeriod.id, router, searchParams]);

  const handlePeriodChange = (value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("periodId", value);
    } else {
      params.delete("periodId");
    }
    router.push(`/invoices?${params.toString()}`);
  };

  const handleMemberChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === currentUserId) {
      params.delete("memberId");
    } else {
      params.set("memberId", value);
    }
    router.push(`/invoices?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-card p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <Text strong className="whitespace-nowrap dark:text-white">
          Filter by Period:
        </Text>
        <Select
          placeholder="Select period"
          className="w-full md:min-w-[200px]"
          value={periodId || undefined}
          onChange={handlePeriodChange}
          allowClear
          options={periods.map((p) => ({
            label: p.name,
            value: p.id,
          }))}
        />
      </div>
      {showMemberFilter && (
        <div className="flex items-center gap-2">
          <Text strong className="whitespace-nowrap dark:text-white">
            Filter by Member:
          </Text>
          <Select
            className="w-full md:min-w-[200px]"
            value={selectedMemberId}
            onChange={handleMemberChange}
            options={members.map((m) => ({
              label: m.name + (m.id === currentUserId ? " (Me)" : ""),
              value: m.id,
            }))}
          />
        </div>
      )}
    </div>
  );
};
