"use client";

import { CopyOutlined } from "@ant-design/icons";
import { App, Button, Tooltip, Typography } from "antd";
import type { CSSProperties, MouseEvent } from "react";

type EmailProps = {
  email: string;
  href?: string;
  textClassName?: string;
};

const emailTextStyle: CSSProperties = {
  minWidth: 0,
  maxWidth: "100%",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
};

export const Email = ({ email, href, textClassName }: EmailProps) => {
  const { message } = App.useApp();

  const handleCopy = async (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    try {
      const clipboard = navigator.clipboard;

      if (!clipboard?.writeText) {
        throw new Error("Clipboard API is not available");
      }

      await clipboard.writeText(email);
    } catch {
      message.error(
        "Unable to copy the email address. Check clipboard permissions and try again.",
      );
      return;
    }

    message.success("Email address copied to clipboard");
  };

  if (!email) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        maxWidth: "100%",
        verticalAlign: "middle",
      }}
    >
      {href ? (
        <Typography.Link
          href={href}
          className={textClassName}
          style={emailTextStyle}
        >
          {email}
        </Typography.Link>
      ) : (
        <Typography.Text className={textClassName} style={emailTextStyle}>
          {email}
        </Typography.Text>
      )}
      <Tooltip title="Copy email address">
        <Button
          type="text"
          size="small"
          className="print:hidden"
          aria-label={`Copy ${email}`}
          icon={<CopyOutlined />}
          style={{ flexShrink: 0 }}
          onClick={(event) => void handleCopy(event)}
        />
      </Tooltip>
    </span>
  );
};
