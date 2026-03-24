"use client";

import { Select, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const { Text } = Typography;

type Iteration = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

type Member = {
  id: string;
  name: string;
  role: string;
};

type InvoiceFiltersProps = {
  iterations: Iteration[];
  members: Member[];
  currentUserId: string;
  showMemberFilter?: boolean;
};

export const InvoiceFilters = ({
  iterations,
  members,
  currentUserId,
  showMemberFilter = false,
}: InvoiceFiltersProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const iterationId = searchParams.get("iterationId");
  const selectedMemberId = searchParams.get("memberId") || currentUserId;

  useEffect(() => {
    if (!iterationId && iterations.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const current =
        iterations.find((it) => it.startDate <= today && it.endDate >= today) ||
        iterations[0];

      const params = new URLSearchParams(searchParams.toString());
      params.set("iterationId", current.id);
      router.replace(`/invoices?${params.toString()}`);
    }
  }, [iterationId, iterations, router, searchParams]);

  const handleIterationChange = (value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("iterationId", value);
    } else {
      params.delete("iterationId");
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
    <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <Text strong className="whitespace-nowrap">
        Filter by Iteration:
      </Text>
      <Select
        placeholder="Select iteration"
        className="w-full max-w-md"
        value={iterationId || undefined}
        onChange={handleIterationChange}
        allowClear
        options={iterations.map((it) => ({
          label: `${it.name} (${it.startDate} to ${it.endDate})`,
          value: it.id,
        }))}
      />
      {showMemberFilter && (
        <div className="flex items-center gap-2">
          <Text strong className="whitespace-nowrap">
            Filter by Member:
          </Text>
          <Select
            style={{ width: 200 }}
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
