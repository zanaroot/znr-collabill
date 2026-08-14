"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme } from "antd";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTheme } from "@/app/_hooks/use-theme";

const { defaultAlgorithm, darkAlgorithm } = theme;

export const AntProvider = ({ children }: { children: ReactNode }) => {
  const { theme: appTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: appTheme === "dark" ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      <AntdRegistry>{children}</AntdRegistry>
    </ConfigProvider>
  );
};
