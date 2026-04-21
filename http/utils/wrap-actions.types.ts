export type AsyncAction<Args extends unknown[] = unknown[], R = unknown> = (
  ...args: Args
) => Promise<R>;

export type ActionMap = Record<string, AsyncAction>;
