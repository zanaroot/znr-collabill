"use client";

import * as Sentry from "@sentry/nextjs";
import { Button, Result } from "antd";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Result
      status="error"
      title="Une erreur est survenue"
      subTitle="L’équipe a été notifiée. Tu peux réessayer."
      extra={
        <Button type="primary" onClick={reset}>
          Réessayer
        </Button>
      }
    />
  );
}
