"use client";

import { Alert, Button } from "antd";

export const QueryErrorAlert = ({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => (
  <Alert
    type="error"
    showIcon
    message={message ?? "Failed to load data"}
    action={
      onRetry ? (
        <Button type="link" size="small" onClick={onRetry}>
          Retry
        </Button>
      ) : undefined
    }
  />
);
