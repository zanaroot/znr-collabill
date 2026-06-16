"use client";

import { Space, Typography } from "antd";

const { Text } = Typography;

type InfoRowProps = {
  label?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

export function InfoRow({ label, icon, children }: InfoRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Space size={6} className="text-zinc-400">
          {icon && (
            <span className="flex items-center text-[13px]">{icon}</span>
          )}
          <Text className="text-xs font-semibold text-zinc-400">{label}</Text>
        </Space>
      )}

      <div className="pl-0.5">{children}</div>
    </div>
  );
}
