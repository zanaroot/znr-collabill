export const TASK_SIZES = ["XS", "S", "M", "L", "XL"] as const;

export type TaskSize = (typeof TASK_SIZES)[number];
