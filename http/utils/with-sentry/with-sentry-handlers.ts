import * as Sentry from "@sentry/nextjs";

type WithSentryOptions = {
  handlerName: string;
  publicMessage?: string;
};

export const withSentryHandlers = <THandlers extends readonly unknown[]>(
  handlers: THandlers,
  options: WithSentryOptions,
): THandlers => {
  const last = handlers[handlers.length - 1] as unknown as
    | ((...args: unknown[]) => unknown)
    | undefined;
  if (!last) return handlers;

  const wrappedLast = async (...args: unknown[]) => {
    const c = args[0] as {
      req: { method: string; path: string };
      json: (body: unknown, status?: number) => unknown;
      get: (key: string) => unknown;
    };

    try {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      return await last(...args);
    } catch (error) {
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
          layer: "controller",
          handler: options.handlerName,
        },
        user: user?.id ? { id: user.id } : undefined,
        extra: {
          method: c.req.method,
          path: c.req.path,
          organizationId: user?.organizationId ?? null,
        },
      });

      return c.json(
        { error: options.publicMessage ?? "Something went wrong", eventId },
        500,
      );
    }
  };

  return handlers.slice(0, -1).concat(wrappedLast) as unknown as THandlers;
};
