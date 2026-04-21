import * as Sentry from "@sentry/nextjs";
export type WrapperClass = Record<
  string,
  (...args: unknown[]) => Promise<unknown>
>;

export function wrapRepositoryWithSentry<T extends WrapperClass>(
  repo: T,
  layerName: string,
): T {
  const wrapped = {} as T;

  for (const key in repo) {
    const fn = repo[key];

    wrapped[key] = (async (
      ...args: Parameters<typeof fn>
    ): Promise<Awaited<ReturnType<typeof fn>>> => {
      try {
        return (await fn(...args)) as Awaited<ReturnType<typeof fn>>;
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            layer: "repository",
            repository: layerName,
            method: key,
          },
          extra: { args },
        });
        throw error;
      }
    }) as T[typeof key];
  }

  return wrapped;
}
