"use client";

import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useAmountsVisibility } from "./amounts-visibility-provider";

export const HideAmountsToggle = () => {
  const { hidden, toggleHidden } = useAmountsVisibility();

  const label = hidden ? "Show amounts" : "Hide amounts";

  return (
    <Tooltip title={label}>
      <Button
        type="text"
        aria-label={label}
        aria-pressed={hidden}
        icon={hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        onClick={toggleHidden}
      />
    </Tooltip>
  );
};
