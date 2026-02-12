"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import type { ReactNode } from "react";

export const AntProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ConfigProvider>
      <AntdRegistry>{children}</AntdRegistry>
    </ConfigProvider>
  );
};
