import * as Sentry from "@sentry/nextjs";

export function wrapActionsWithSentry<
  T extends Record<string, (...args: unknown[]) => Promise<unknown>>,
>(actions: T): T {
  const wrapped = {} as T;

  for (const key in actions) {
    const action = actions[key];

    wrapped[key] = (async (
      ...args: Parameters<typeof action>
    ): Promise<ReturnType<typeof action>> => {
      try {
        return (await action(...args)) as ReturnType<typeof action>;
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            layer: "action",
            action: key,
          },
          extra: {
            args,
          },
        });

        throw error;
      }
    }) as T[typeof key];
  }

  return wrapped;
}
