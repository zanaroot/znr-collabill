import * as Sentry from "@sentry/nextjs";

type ControllerRecord = Record<string, readonly unknown[]>;

type HonoContext = {
  req: {
    method: string;
    path: string;
  };
  json: (body: unknown, status?: number) => unknown;
  get: (key: string) => unknown;
};

export function wrapControllerWithSentry<T extends ControllerRecord>(
  controllers: T,
  options?: { layerName?: string },
): T {
  const wrapped = {} as T;

  for (const key in controllers) {
    const handlers = controllers[key];

    const last = handlers[handlers.length - 1] as
      | ((...args: unknown[]) => unknown)
      | undefined;

    if (!last) {
      wrapped[key] = handlers;
      continue;
    }

    const wrappedLast = async (...args: unknown[]) => {
      const c = args[0] as HonoContext;

      try {
        return await last(...args);
      } catch (error) {
        return handleError(error, c, key, options);
      }
    };

    wrapped[key] = [
      ...handlers.slice(0, -1),
      wrappedLast,
    ] as unknown as T[typeof key];
  }

  return wrapped;
}

function handleError(
  error: unknown,
  c: HonoContext,
  handlerName: string,
  options?: { layerName?: string },
) {
  const user = (() => {
    try {
      return c.get("user") as
        | { id: string; organizationId?: string | null }
        | undefined;
    } catch {
      return undefined;
    }
  })();

  const eventId = Sentry.captureException(error, {
    tags: {
      layer: options?.layerName ?? "controller",
      handler: handlerName,
    },
    user: user?.id ? { id: user.id } : undefined,
    extra: {
      method: c.req.method,
      path: c.req.path,
      organizationId: user?.organizationId ?? null,
    },
  });

  return c.json(
    {
      error: "Internal server error",
      eventId,
    },
    500,
  );
}
