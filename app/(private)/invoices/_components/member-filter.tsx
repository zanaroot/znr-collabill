"use client";

import { Select } from "antd";
import { useRouter, useSearchParams } from "next/navigation";

type Member = {
  id: string;
  name: string;
  role: string;
};

type MemberFilterProps = {
  members: Member[];
  currentUserId: string;
};

export const MemberFilter = ({ members, currentUserId }: MemberFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMemberId = searchParams.get("memberId") || currentUserId;

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === currentUserId) {
      params.delete("memberId");
    } else {
      params.set("memberId", value);
    }
    router.push(`/invoices?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-sm font-medium text-gray-600">
        Filter by Member:
      </span>
      <Select
        style={{ width: 200 }}
        value={selectedMemberId}
        onChange={handleChange}
        options={members.map((m) => ({
          label: m.name + (m.id === currentUserId ? " (Me)" : ""),
          value: m.id,
        }))}
      />
    </div>
  );
};
