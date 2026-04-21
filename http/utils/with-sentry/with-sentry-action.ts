import * as Sentry from "@sentry/nextjs";

type AsyncFunction = (...args: unknown[]) => Promise<unknown>;

export function withSentryAction<T extends AsyncFunction>(
  action: T,
  options: { actionName: string },
): T {
  return (async (...args: unknown[]) => {
    try {
      return await action(...args);
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          layer: "action",
          action: options.actionName,
        },
        extra: {
          args,
        },
      });

      throw error;
    }
  }) as T;
}
