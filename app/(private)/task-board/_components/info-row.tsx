"use client";

import { Typography } from "antd";

const { Text } = Typography;

type InfoRowProps = {
  label: string;
  children: React.ReactNode;
};

export function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="flex gap-4 mb-5">
      <Text strong style={{ minWidth: 110 }}>
        {label}
      </Text>

      <div className="flex-1">{children}</div>
    </div>
  );
}
