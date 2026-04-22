import * as Sentry from "@sentry/nextjs";

export function logError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}
