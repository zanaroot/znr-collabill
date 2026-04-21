import * as Sentry from "@sentry/nextjs";
import type { ActionMap } from "../wrap-actions.types";

export function wrapActionsWithSentry<T extends ActionMap>(actions: T): T {
  const wrapped = {} as T;

  for (const key in actions) {
    const action = actions[key];

    wrapped[key] = (async (...args: Parameters<T[typeof key]>) => {
      try {
        return await action(...args);
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
