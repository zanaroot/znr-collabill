"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export function SentryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }, []);

  return <>{children}</>;
}
