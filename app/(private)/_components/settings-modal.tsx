"use client";

import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Modal, Segmented } from "antd";
import { useTheme } from "@/app/_hooks/use-theme";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Settings"
      centered
    >
      <div style={{ padding: "16px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span>Theme</span>
        </div>
        <Segmented
          value={theme}
          onChange={(value) => setTheme(value as "light" | "dark")}
          options={[
            {
              value: "light",
              label: (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <SunOutlined /> Light
                </span>
              ),
            },
            {
              value: "dark",
              label: (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MoonOutlined /> Dark
                </span>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};
